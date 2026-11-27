'use strict';
window.P11LoadingMusicRamp=true;
/* =====================================================================
   PITCH 11 - stage 26 (more scenes: corner + free-kick intros, players jog back after goals, teams run out for the 2nd half, winners celebrate at full time; fix: throw-in flicker / endless re-throw; match-day cutscenes: kick-off sweep, goal lower-third, foul appeals, penalty angle, offside line, injury orbit, half-time walk-off). Stage 25 (4-way swipes only, redesigned buttons + icons). Stage 24 (goal celebration camera, more shake, bigger sound system). Stage 22 (clean gameplay HUD). Stage 21 (real clubs + players from the CSV, no duplicates, custom club builder). Stage 20 (FC Mobile passing: assist levels, smart targets, live preview, first-time pass, pass-and-go, pressure). Stage 19 (stamina ring + name tag, card zoom, VAR overturns, lineup walk-on, full-time handshake, tackle/key-pass/save ratings, kick power+accuracy meter, tap-to-skip, pill HUD). Stage 18 (FC Mobile HUD, referee cutscenes: cards / subs / VAR, assist ratings). Stage 9c (shots always aim at the opponent goal). Stage 9b (receivers auto-run onto passes and take them). Stage 9 (defending gestures: sprint+tackle, switch, slide, 2nd press, keeper charge). Stage 8: attacking gesture variants. Stage 7: 4-button gesture diamond. Stage 6 (shooting, keepers, tackles tuned). Stage 5: goal replays, radar, match stats, commentary, WebAudio, day/night, settings. Stage 4: menus, clubs, formations, tactics, difficulty, cup, league, save, side cameras. One file, no libraries, works offline.
   Sections: 1 CONFIG | 2 STATE | 3 INPUT | 4 ACTIONS | 5 PHYSICS
             6 AI | 7 RULES | 8 RENDER | 9 UI | 10 LOOP
   World units: 1 unit = 10 cm. Pitch 105 m x 68 m = 1050 x 680 units.
   ===================================================================== */

/* ===================== 1. CONFIG ===================== */
const TAU=Math.PI*2, DT=1/60, HALF_SECS=180;
// --- configurable pitch/goal/ball/player dimensions (1 unit = 10 cm) ---
const PITCH_SIZES=[[945,612],[1050,680],[1155,748]];                                  // small / standard / large (width, height)
const GOAL_SIZES=[{h:33,z:22,d:18},{h:36.6,z:24.4,d:22},{h:40.3,z:26.8,d:24}];            // goal half-width, bar height, net depth
const PEN_DEPTH=165,PEN_WIDTH=403,SIX_DEPTH=55,SIX_WIDTH=183,SPOT=110,ARC_R=91.5;    // FIFA fixed markings (16.5m, 5.5m, 11m spot, circle r)
let PREFS={pitch:1,goal:1,ball:1,player:1};
let PW=1050,PH=680,PX0=60,PY0=60,PX1=PX0+PW,PY1=PY0+PH,CX=PX0+PW/2,CY=PY0+PH/2,WW=PW+120,WH=PH+120;
let GOALH=36.6,GOALD=22,GOALZ=24,BR=4,BVR=1.1,BALL_SCALE=1,PLAYER_SCALE=1;
const BALL_GRAV=98.1,KG=0.12,KA=0.08,ROLL_DECEL=42,FG=Math.exp(-KG*DT),FA=Math.exp(-KA*DT); // 1 unit = 10 cm; rolling resistance is 2.4 m/s²
const RUN=72,SPRINT=1.38;                               // player speeds (units/s)
const GK_REACT=[0.22,0.5],GK_ERR=36,GK_DIVE=120;       // goalkeeper tuning: reaction s, aim error, dive speed
// 4-3-3: [depth 0..1 from own goal, width 0..1]; index 0 = GK
const FORM=[[.03,.5],[.2,.1],[.18,.37],[.18,.63],[.2,.9],[.4,.25],[.36,.5],[.4,.75],[.62,.14],[.66,.5],[.62,.86]];
const KIT=[{name:'BLU',shirt:'#1f6fff',shorts:'#ffffff',gk:'#f2c200'},{name:'RED',shirt:'#e5342b',shorts:'#1b1b1b',gk:'#27c46b'}];
const SKIN=['#f1c27d','#c68642','#8d5524','#e0ac69'];
const NUM=[1,3,5,4,2,8,6,10,11,9,7],POS=['GK','DEF','DEF','DEF','DEF','MID','MID','MID','FWD','FWD','FWD'];
// index = S.half: 1st/2nd half, 3rd/4th = extra-time halves, 5 = penalty shootout
const PERIOD={len:[0,180,180,90,90,0],mins:[0,45,45,15,15,0],base:[0,0,45,90,105,0]};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function rollResistance(vx,vy){const sp=Math.hypot(vx,vy);if(sp<=0)return[0,0];const next=Math.max(0,sp-ROLL_DECEL*DT),k=next/sp;return[vx*k,vy*k];}
const rnd=(a,b)=>a+Math.random()*(b-a);
const angd=(a,b)=>{let d=a-b;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return d;};
const dirOf=t=>S.so?PITCH11Law.shootoutDirection(t,S.so.flipEnds):(S.half%2?(t?-1:1):(t?1:-1));              // +1 = team attacks towards the right goal (halves 1,3,5 vs 2,4)
const plen=()=>PERIOD.len[S.half]||HALF_SECS;
const periodSecondsPerMatchMinute=()=>plen()/(PERIOD.mins[S.half]||45);
// player stats 0..1: pace, shooting, passing, dribbling, defending (GK: handling), physical, stamina
const STK=['pace','shoot','pass','drib','def','phys','stam'],STL=['PAC','SHO','PAS','DRI','DEF','PHY','STA'];
const SB={GK:[.5,.35,.55,.4,.8,.7,.6],DEF:[.62,.5,.62,.52,.8,.78,.7],MID:[.68,.65,.78,.74,.62,.64,.78],FWD:[.78,.8,.65,.76,.4,.66,.68]};
function mkStats(pos){const b=SB[pos],s={};STK.forEach((k,i)=>{s[k]=clamp(b[i]+rnd(-.12,.12),.3,.97);});return s;}
const ovr=s=>Math.round(STK.reduce((a,k)=>a+s[k],0)/7*100);

/* ===================== 2. STATE ===================== */
const S={mode:'menu',t:0,half:1,clock:0,lostTime:0,addedTime:0,addedTimeAnnounced:0,score:[0,0],kick:0,swCd:0,scorer:null,goalTeam:0,
  ko:true,subs:[0,0],subWindows:[0,0],subWindowUsed:[false,false],reds:[0,0],rs:null,adv:null,msg:null,card:null,wt:0,after:null,inj:null,ret:'play',manualPause:false,so:null,sel:null,pv:null,brk:null,subExits:[],subExitRunners:[],pendingSubs:[],pendingPeriodAction:null,pendingSubsResume:false};
const ball={x:CX,y:CY,z:0,vx:0,vy:0,vz:0,spin:0,rot:0,owner:null,last:null,receiver:null,tx:0,ty:0,pmode:'',shotId:0,protect:0,hcd:0,contactPickupTicks:0,gkHold:0,gkHoldActive:false,gkHoldWarned:false,gkNoHands:null,gkNoHandsFrom:null,gkReleasedBy:null,restartDoubleTouchPending:null,px:CX,py:CY,pz:0};
function standardPlayerEquipment(){return{shirtWithSleeves:true,shorts:true,socks:true,shinguards:true,shinguardsCovered:true,footwear:true,dangerousEquipment:false,uncoveredAccessories:false,playerElectronicCommunicationEquipment:false,approvedEPTS:false,inspected:false};}
const P=[];
for(let t=0;t<2;t++)for(let r=0;r<11;r++)P.push({team:t,role:r,gk:r===0,equipment:standardPlayerEquipment(),captain:false,x:0,y:0,px:0,py:0,vx:0,vy:0,ix:0,iy:0,sp:false,face:0,turn:0,stam:1,
  kcd:0,tcd:0,stun:0,think:0,poss:0,freeze:0,force:false,dive:0,diveAng:0,diveRecover:0,react:0,err:0,seenShot:-1,divedShot:-1,anim:0,
  num:NUM[r],skin:(r+t*3)%4,fat:0,yc:0,out:false,inj:false,down:false,limp:false,off:false,
  st:mkStats(POS[r]),skill:0,scd:0,wr:0,wx:0,wy:0,jump:0,rt:0,rx:0,ry:0,mk:null,winded:false,claim:false,pos:POS[r],line:r?r<5?1:r<8?2:3:0,wide:false});
const GK=[P[0],P[11]];
let FX={shake:0,hit:0,slow:0};                               // screen shake amplitude, hit-stop frames
let BENCH=[];
const mkBench=()=>{BENCH=[0,1].map(()=>['GK','DEF','DEF','MID','MID','FWD','FWD'].map((pos,i)=>({num:12+i,pos,skin:Math.floor(Math.random()*4),st:mkStats(pos),equipment:standardPlayerEquipment()})));};
let ctrl=null;                                           // human-controlled player
const TI=[{c1:null,c2:null,att:false,off:0},{c1:null,c2:null,att:false,off:0}]; // per-team AI info
const parts=[];
const cam={x:CX,y:CY,v:410,px:CX,py:CY,pv:410};
const ORD=P.slice();
const cv=document.getElementById('c'),ctx=cv.getContext('2d',{alpha:true});
const graphicsMobile=matchMedia('(max-width: 800px)').matches||(navigator.deviceMemory||4)<=4||(navigator.hardwareConcurrency||4)<=4;
// Mobile supersampling: render above CSS resolution for cleaner 3D edges and sharper pitch/player detail.
const maxRenderScale=Math.min(window.devicePixelRatio||1,2.0);
let renderScale=Math.min(maxRenderScale,graphicsMobile?1.75:1.25),W=0,H=0,dpr=renderScale;
function resize(){const rect=cv.getBoundingClientRect();W=Math.max(1,rect.width||innerWidth);H=Math.max(1,rect.height||innerHeight);dpr=renderScale;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);if(H>W){releaseAll();UI.r.length=0;UI.def=null;pauseBtn.r=camBtn.r=0;}}
function setRenderScale(next){const value=clamp(next,1,maxRenderScale);if(Math.abs(value-renderScale)<0.025)return;renderScale=value;resize();window.P11GraphicsQuality={scale:renderScale,maxScale:maxRenderScale,mobile:graphicsMobile};}
window.P11GraphicsQuality={scale:renderScale,maxScale:maxRenderScale,mobile:graphicsMobile};

/* ===================== 3. INPUT ===================== */
const I={svar:'',pvar:'',tvar:'',ppow:0,skd:-1,tackle:false,swp:false,mx:0,my:0,sprint:false,spBtn:false,shoot:false,chargeT:0,shootUp:false,pass:false,thru:false,lob:false,sw:false,skill:false};
const keys={},joy={on:false,id:-1,bx:0,by:0,kx:0,ky:0,vx:0,vy:0};
const UI={r:[],def:null},pauseBtn={x:0,y:0,r:0},camBtn={x:0,y:0,r:0};
let p11UiSemanticSound=false;
/* ---- Stage 7: 4-button context diamond + gesture engine ---- */
const TUNING={
  holdT:0.2,          // s before a press counts as HOLD
  swipeK:0.4,         // swipe threshold = swipeK x button radius
  dblWin:0.24,        // s window for double-tap (only on slots enabled in dbl)
  tapCharge:0.3,      // shot charge (s) given to a plain SHOOT tap
  relabel:0.35,       // s flash when buttons relabel
  swipeAsTap:true,    // until later parts add variants a swipe/double acts like a tap
  swipeAfterHold:false,// true: a swipe after a hold may fire a 2nd event
  btnR:1.3, btnOff:1.5, btnRight:4.1, btnBottom:3.5, hitK:1.25,   // layout in units of u=H*0.09
  sah:[0,0,0,1],       // per slot: swipe allowed while held (and re-arms for another swipe): SPRINT/SKILL
  sh:{low:{n:'DRIVEN',pw:.78,v:1.1,acc:.9,w:0},chip:{n:'CHIP',pw:.42,acc:.8,w:0,L:170,spd:250},pow:{n:'POWER SHOT',pw:1,v:1.22,acc:1.9,w:.3},
      fin:{n:'FINESSE',pw:.62,v:.88,acc:.4,w:.12,curl:.34,in:7},ft:{n:'FIRST TIME',pw:.72,acc:1.25,w:0,arm:.6,reach:26,zmax:16}},   // shot variants: pw=power, v=speed x, acc=error x, w=wind-up s
  ps:{chargeT:.6,powMax:.85,lowV:1.3,curve:.4,backMax:300,backV:.8},     // pass variants
  wall:{v:1.05,run:110,runT:1.6,life:3,delay:.1},                       // give-and-go
  sk:{cd:.9,near:45,base:.55,dr:1.1,loose:.35},                          // skill moves: cooldown, defender range, success = base+dr*(drib-def)-difficulty
  ret:{range:480},pop:1.1,
  dbl:{att:[0,1,0,1],def:[0,0,0,0]}                                // per slot (TL,TR,BL,BR): double-tap enabled?
};
// slots: 0=TOP-LEFT 1=TOP-RIGHT 2=BOTTOM-LEFT 3=BOTTOM-RIGHT
const BTN=[0,1,2,3].map(i=>({id:i,dx:TUNING.btnRight+(i&1?-1:1)*TUNING.btnOff,dy:TUNING.btnBottom+(i<2?1:-1)*TUNING.btnOff,m:TUNING.btnR}));
const GLAB={att:['THROUGH','SHOOT','PASS','SPRINT'],def:['2ND|PRESS','SLIDE','SWITCH','SPRINT|+TACKLE']};
const GACT={att:['through','shoot','pass','sprint'],def:['press2','slide','switch','sprtack']};
const GS={att:true,flash:0,now:0,spy:null,s:[0,1,2,3].map(()=>({on:false,pid:null,x0:0,y0:0,x:0,y:0,t0:0,t:0,thr:1,sw:false,done:false,held:false,act:'',dir:-1,pend:false,pendT:0,pdir:-1}))};
const GDX=[0,0.7071,1,0.7071,0,-0.7071,-1,-0.7071],GDY=[-1,-0.7071,0,0.7071,1,0.7071,0,-0.7071];   // dir used: 0=up 2=right 4=down 6=left (odd slots kept only so old indexing still works)
const btnPos=b=>{
  const u=H*0.09,r=b.m*u,pad=Math.min(r*1.5+8,Math.min(W,H)*0.42);
  return{x:clamp(W-b.dx*u,pad,W-pad),y:clamp(H-b.dy*u,pad,H-pad),r};
};
const joyBasePos=()=>{
  const r=H*0.11,pad=Math.min(r+8,Math.min(W,H)*0.42);
  return{x:clamp(W*G.joy[0],pad,W-pad),y:clamp(H*G.joy[1],pad,H-pad)};
};
function btnAt(x,y){let best=null,bd=1e9;for(const b of BTN){const c=btnPos(b),d=Math.hypot(x-c.x,y-c.y);if(d<c.r*TUNING.hitK&&d<bd){bd=d;best=b;}}return best;}
const gDir=(dx,dy)=>Math.abs(dx)>Math.abs(dy)?(dx>0?2:6):(dy<0?0:4);   // 4-way swipes only: 0=up 2=right 4=down 6=left
function gAtk(){const o=ball.owner;if(o)return o.team===0;const l=ball.last;return !l||l.team===0;}   // my ball, or loose and I touched it last
function gEmit(i,kind,dir){GS.att=gAtk();const ev={btn:i,kind:kind,dir:dir};if(GS.spy)GS.spy(ev);gestureAct(ev);}
function gFlush(i){const q=GS.s[i];if(q.pend){q.pend=false;gEmit(i,'tap',q.pdir);}}     // a waiting single tap resolves before any other gesture on that slot
function gTap(i,dir){
  const q=GS.s[i];GS.att=gAtk();
  if(!TUNING.dbl[GS.att?'att':'def'][i]){gEmit(i,'tap',dir);return;}
  if(q.pend&&GS.now-q.pendT>TUNING.dblWin)gFlush(i);
  if(q.pend){q.pend=false;gEmit(i,'double',dir);}else{q.pend=true;q.pendT=GS.now;q.pdir=dir;}
}
function gDown(i,pid,x,y){
  const q=GS.s[i];if(q.on)return false;                    // slot busy: second finger on the same button is ignored
  q.on=true;q.pid=pid;q.x0=q.x=x;q.y0=q.y=y;q.t0=GS.now;q.t=0;q.done=q.held=false;q.act='';q.dir=-1;
  q.thr=btnPos(BTN[i]).r*TUNING.swipeK;
  gStart(i);return true;
}
function gMove(pid,x,y){
  for(let i=0;i<4;i++){const q=GS.s[i];if(!q.on||q.pid!==pid)continue;
    q.x=x;q.y=y;
    if((!q.done||(q.held&&TUNING.swipeAfterHold)||TUNING.sah[i])&&!q.sw&&Math.hypot(x-q.x0,y-q.y0)>=q.thr){
      q.sw=true;q.done=true;q.dir=gDir(x-q.x0,y-q.y0);gFlush(i);gEmit(i,'swipe',q.dir);
      if(TUNING.sah[i]){q.sw=false;q.x0=x;q.y0=y;}}   // SKILL button: finger stays down, next swipe can fire again
    return true;}
  return false;
}
function gUp(pid,cancel){
  for(let i=0;i<4;i++){const q=GS.s[i];if(!q.on||q.pid!==pid)continue;
    q.on=false;q.sw=false;
    if(!cancel&&!q.done){q.done=true;gTap(i,-1);}
    gEnd(i,cancel);return true;}
  return false;
}
function gCancelAll(){for(let i=0;i<4;i++){const q=GS.s[i];if(q.on)gUp(q.pid,true);q.pend=false;}}
function gestureTick(){
  GS.now+=DT;
  const a=gAtk();if(a!==GS.att){GS.att=a;GS.flash=TUNING.relabel;}else if(GS.flash>0)GS.flash-=DT;
  const m=S.mode,live=m==='kickoff'||m==='play'||m==='goal'||m==='whistle';
  for(let i=0;i<4;i++){const q=GS.s[i];
    if(q.on){
      if(!live){gUp(q.pid,true);continue;}
      q.t=GS.now-q.t0;
      if(!q.done&&q.t>=TUNING.holdT){q.done=q.held=true;gFlush(i);q.act=GACT[GS.att?'att':'def'][i];gEmit(i,'hold',-1);}
    }
    if(q.pend&&GS.now-q.pendT>TUNING.dblWin){q.pend=false;gEmit(i,'tap',q.pdir);}
  }
}
// ---- mapping to existing actions (later parts extend this) ----
function gStart(i){if(i===3)I.spBtn=true;}                                  // SPRINT is live from the first touch
function gEnd(i,cancel){const q=GS.s[i];
  if(i===3)I.spBtn=false;
  if(q.act==='shoot'&&I.shoot){I.shoot=false;if(!cancel){I.shootUp=true;I.svar='';}else I.chargeT=0;}   // releasing a charged shot fires it; a cancel aborts it
  else if(q.act==='passc'&&!cancel){I.pass=true;I.pvar='';I.ppow=clamp((q.t-TUNING.holdT)/TUNING.ps.chargeT,0.2,1);}   // held pass: fires on release, power from hold time
  q.act='';
}
const card=q=>{const dx=q.x-q.x0,dy=q.y-q.y0;return Math.abs(dx)>Math.abs(dy)?(dx>0?'R':'L'):(dy<0?'U':'D');};   // 4-way reading of a swipe
const SHK={U:'chip',D:'low',R:'pow',L:'fin'},PSK={U:'lob',D:'driven',L:'wallL',R:'wallR'},TSK={U:'lob',D:'low',L:'curL',R:'curR'};
function gestureAct(ev){
  const i=ev.btn,q=GS.s[i],a=GACT[GS.att?'att':'def'][i],k=ev.kind;
  const pOw=ball.owner||ctrl;
  const backSwipe=Math.cos(pOw.face)*GDX[ev.dir]+Math.sin(pOw.face)*GDY[ev.dir]<-0.35;
  if(GS.att){
    if(a==='shoot'){
      if(k==='hold'){I.shoot=true;I.chargeT=TUNING.holdT;q.act='shoot';return;}
      if(k==='swipe'){
        if(backSwipe){I.shoot=false;I.chargeT=0;I.shootUp=false;skillMove(pOw);pop8('FAKE SHOT');buzz(18);return;}
        I.svar=SHK[card(q)];I.shootUp=true;return;
      }
      if(k==='double')I.svar='ft';else{I.svar='';I.chargeT=TUNING.tapCharge;}
      I.shootUp=true;return;
    }
    if(a==='pass'){
      if(k==='hold'){q.act='passc';return;}
      if(k==='swipe'){
        if(backSwipe){if(q.act==='passc')q.act='';I.pass=false;skillMove(pOw);pop8('FAKE PASS');buzz(18);return;}
        I.pass=true;I.pvar=PSK[card(q)];I.ppow=0;return;
      }
      I.pass=true;I.pvar='';I.ppow=0;return;
    }
    if(a==='through'){I.tvar=k==='swipe'?TSK[card(q)]:'';I.thru=true;return;}     // hold = plain through ball
    if(a==='sprint'){if(k==='swipe'){I.skill=true;I.skd=ev.dir;}else if(k==='double'){I.skill=true;I.skd=8;}return;}
    return;
  }
  let t=k;if((t==='swipe'||t==='double')&&TUNING.swipeAsTap)t='tap';     // defending: variants arrive in Part 3
  if(t!=='tap')return;
  if(a==='switch')I.swp=true;else if(a==='slide'||a==='sprtack')I.tackle=true;
}
function press(slot,pid){if(pid===undefined)pid='k'+slot;gDown(slot,pid,0,0);}
function release(slot,pid){if(pid===undefined)pid='k'+slot;gUp(pid,false);}
function releaseAll(){gCancelAll();I.spBtn=false;if(I.shoot){I.shoot=false;I.chargeT=0;}joy.on=false;joy.vx=joy.vy=0;for(const k in keys)keys[k]=false;}

cv.addEventListener('pointerdown',e=>{if(H>W){e.preventDefault();e.stopImmediatePropagation();releaseAll();}},true);
cv.addEventListener('pointerdown',e=>{
  e.preventDefault();
  try{cv.setPointerCapture(e.pointerId);}catch(_){}
  if(S.mode==='replay'){RP.skip=1;return;}
  if(S.mode==='menu'||S.mode==='half'||S.mode==='full'||S.mode==='subs'){uiTap(e.clientX,e.clientY);return;}
  if(Math.hypot(e.clientX-pauseBtn.x,e.clientY-pauseBtn.y)<pauseBtn.r*1.4){openSubs(S.mode,true);return;}
  if(Math.hypot(e.clientX-camBtn.x,e.clientY-camBtn.y)<camBtn.r*1.4){cycleCam();return;}
  const b=btnAt(e.clientX,e.clientY);
  if(b){gDown(b.id,e.pointerId,e.clientX,e.clientY);}
  else if(!joy.on&&e.clientX<W*0.5){joy.on=true;joy.id=e.pointerId;joy.bx=joy.kx=e.clientX;joy.by=joy.ky=e.clientY;joy.vx=joy.vy=0;}
});
let p11HoverIndex=-1;
cv.addEventListener('pointermove',e=>{
  if(e.pointerType==='mouse'&&(S.mode==='menu'||S.mode==='half'||S.mode==='full'||S.mode==='subs')){
    const rect=cv.getBoundingClientRect(),px=(e.clientX-rect.left)*(W/Math.max(1,rect.width)),py=(e.clientY-rect.top)*(H/Math.max(1,rect.height));
    let hit=-1;for(let i=0;i<UI.r.length;i++){const r=UI.r[i];if(px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h){hit=i;break;}}
    if(hit!==p11HoverIndex){p11HoverIndex=hit;if(hit>=0)window.P11AudioAssets?.play('uiHover',.28);}
  }else if(S.mode!=='menu'&&S.mode!=='half'&&S.mode!=='full'&&S.mode!=='subs')p11HoverIndex=-1;
  gMove(e.pointerId,e.clientX,e.clientY);
  if(!joy.on||e.pointerId!==joy.id)return;
  const R=H*0.13,dx=e.clientX-joy.bx,dy=e.clientY-joy.by,m=Math.hypot(dx,dy)||1,k=Math.min(m,R),L=Math.min(1,k/R*1.15);
  joy.kx=joy.bx+dx/m*k;joy.ky=joy.by+dy/m*k;
  joy.vx=L<0.15?0:dx/m*L;joy.vy=L<0.15?0:dy/m*L;
});
function ptrUp(e){
  gUp(e.pointerId,e.type==='pointercancel');
  if(joy.on&&e.pointerId===joy.id){joy.on=false;joy.vx=joy.vy=0;}
}
cv.addEventListener('pointerup',ptrUp);cv.addEventListener('pointercancel',ptrUp);
cv.addEventListener('contextmenu',e=>e.preventDefault());
const KEYACT={KeyL:0,KeyK:1,KeyJ:2,ShiftLeft:3,ShiftRight:3,Space:3};   // key -> diamond slot (TL,TR,BL,BR): same context logic as touch
addEventListener('keydown',e=>{
  if(keys[e.code])return;keys[e.code]=true;if(S.mode==='replay'){RP.skip=1;return;}
  if(e.code in KEYACT||e.code.startsWith('Arrow')||e.code==='Enter'||e.code==='KeyU'||e.code==='KeyG')e.preventDefault();
  if(S.mode==='menu'||S.mode==='half'||S.mode==='full'||S.mode==='subs'){if((e.code==='Enter'||e.code==='Space')&&UI.def)UI.def();else if(e.code==='Escape'&&S.mode==='menu')back();return;}
  if(e.code==='KeyP'){openSubs(S.mode,true);return;}
  if(e.code==='KeyC'){cycleCam();return;}
  if(e.code==='KeyG'){gkCharge(0,false);return;}
  if(e.code==='KeyU'){I.skill=true;I.skd=8;return;}
  if(e.code in KEYACT)press(KEYACT[e.code],e.code);
  else if(e.code.startsWith('Arrow')){for(const q of GS.s)if(q.on&&typeof q.pid==='string')kswipe(q.pid);}   // tap an arrow while holding an action key = swipe that way
});
addEventListener('keyup',e=>{keys[e.code]=false;if(e.code in KEYACT)release(KEYACT[e.code],e.code);});
addEventListener('blur',releaseAll);addEventListener('orientationchange',releaseAll);
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
try{if(screen.orientation&&screen.orientation.addEventListener)screen.orientation.addEventListener('change',releaseAll);}catch(_){}
function updateInput(){
  let mx,my;
  if(joy.on){mx=joy.vx;my=joy.vy;}
  else{
    mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
    my=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
    const m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m;}
  }
  I.mx=mx;I.my=my;I.sprint=I.spBtn;
}
const endEdges=()=>{I.pass=I.thru=I.lob=I.sw=I.skill=I.shootUp=I.tackle=I.swp=false;I.svar=I.pvar=I.tvar='';I.ppow=0;I.skd=-1;};
