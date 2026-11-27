'use strict';
/* ===================== 18. POLISH: grass texture, shaded ball, soft particles, vignette, dust ===================== */
let _GT=null;
function grassPat(){
  if(_GT)return _GT;
  const c=document.createElement('canvas');c.width=c.height=192;const g=c.getContext('2d');
  for(let i=0;i<1400;i++){const x=Math.random()*192,y=Math.random()*192,l=Math.random()<.5;
    g.fillStyle=l?'rgba(255,255,255,'+rnd(.02,.07)+')':'rgba(0,30,0,'+rnd(.03,.09)+')';g.fillRect(x,y,rnd(.6,1.4),rnd(2,5));}
  _GT=ctx.createPattern(c,'repeat');return _GT;
}
const _dpitch=drawPitch;
drawPitch=function(){
  _dpitch();
  ctx.save();
  const pat=grassPat();if(pat){ctx.globalAlpha=.9;ctx.fillStyle=pat;ctx.fillRect(PX0,PY0,PW,PH);}
  ctx.globalAlpha=1;
  const sh=ctx.createLinearGradient(0,PY0,0,PY1);               // soft light falloff top to bottom
  sh.addColorStop(0,'rgba(0,0,0,.10)');sh.addColorStop(.5,'rgba(255,255,255,.03)');sh.addColorStop(1,'rgba(0,0,0,.12)');
  ctx.fillStyle=sh;ctx.fillRect(PX0,PY0,PW,PH);
  for(const [x,y,r] of [[PX0+14,CY,70],[PX1-14,CY,70],[PX0+SPOT,CY,16],[PX1-SPOT,CY,16],[CX,CY,18]]){   // worn patches
    const w=ctx.createRadialGradient(x,y,0,x,y,r);w.addColorStop(0,'rgba(110,85,45,.28)');w.addColorStop(1,'rgba(110,85,45,0)');
    ctx.fillStyle=w;ctx.fillRect(x-r,y-r,r*2,r*2);}
  ctx.restore();
};
const _dball=drawBall;
drawBall=function(a){
  const b=ball,x=b.px+(b.x-b.px)*a,y=b.py+(b.y-b.py)*a-(b.pz+(b.z-b.pz)*a)*0.55,sq=b.sq>0?b.sq/0.1:0,sp=Math.hypot(b.vx,b.vy),tr=ctx.getTransform(),minR=1.15*dpr/Math.max(0.001,Math.abs(tr.a)),baseR=Math.max(BVR,minR),rx=baseR*(1+0.3*sq),ry=baseR*(1-0.25*sq);
  for(let i=0;i<BT.length;i++){const q=BT[i],f=(i+1)/BT.length;ctx.fillStyle='rgba(255,255,255,'+(.2*f*Math.min(1,q.sp/500))+')';ctx.beginPath();ctx.arc(q.x,q.y,BVR*(.35+.55*f),0,TAU);ctx.fill();}
  if(sp>260&&!b.owner){const n=Math.min(1,(sp-260)/340);ctx.strokeStyle='rgba(255,255,255,'+(.12+.3*n)+')';ctx.lineWidth=BVR*1.3;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-b.vx*0.014,y-b.vy*0.014);ctx.stroke();ctx.lineCap='butt';}
  const g=ctx.createRadialGradient(x-rx*.35,y-ry*.4,.3,x,y,rx*1.1);g.addColorStop(0,'#fff');g.addColorStop(.7,'#e9edf0');g.addColorStop(1,'#aab2b8');
  ctx.fillStyle=g;ctx.strokeStyle='#1c1c1c';ctx.lineWidth=.6;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill();ctx.stroke();
  ballPat(x,y,rx,ry,b.rot);
};
function drawParts(){
  for(const q of parts){
    const a=clamp(q.l*(q.d?3:1),0,1),s=(q.s||1.8)*(q.d?(1.6-q.l*2):1);
    ctx.globalAlpha=a;ctx.fillStyle=q.c;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(.4,s),0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;
}
const BT=[];
const _sbP=stepBall;
stepBall=function(){
  const vz=ball.vz,z=ball.z;_sbP();
  if(!ball.owner&&z>0&&ball.z===0&&vz<-70&&H<=W&&parts.length<350)for(let i=0;i<6;i++)parts.push({x:ball.x,y:ball.y,vx:rnd(-22,22),vy:rnd(-22,22),l:.35,c:'rgba(215,230,190,.6)',s:1.3,d:1});
};
function jockey(p,o){                                       // stand goal-side of the carrier and shadow him instead of diving in
  const gx=dirOf(p.team)>0?PX0:PX1,dx=gx-o.x,dy=CY-o.y,m=Math.hypot(dx,dy)||1,d=Math.hypot(o.x-p.x,o.y-p.y),k=d>70?0:16;
  goTo(p,o.x+o.vx*0.25+dx/m*k,o.y+o.vy*0.25+dy/m*k,d>85);
  if(d<48){p.ix*=.75;p.iy*=.75;}
}
const _db3=drawBall3;
drawBall3=function(a){
  for(let i=0;i<BT.length;i++){const q=BT[i],f=(i+1)/BT.length;pj(q.wx,q.wy,q.wz+BVR);ctx.fillStyle='rgba(255,255,255,'+(.22*f*Math.min(1,q.sp/500))+')';ctx.beginPath();ctx.arc(V.sx,V.sy,Math.max(.35,BVR*V.s*(.35+.55*f)),0,TAU);ctx.fill();}
  _db3(a);
};
const _camSet=camSet;
camSet=function(a){                                        // AUTO DIRECTOR: wider on fast play, closer near the goals
  if(G.cam===7&&CAMS[7]){
    const c=CAMS[7],b=ball,sp=Math.hypot(b.vx,b.vy),gd=Math.min(Math.abs(b.x-PX0),Math.abs(b.x-PX1)),near=gd<PW*.2;
    const tf=near?3.4:sp>380?2.0:2.7,th=near?PH*.26:sp>380?PH*.5:PH*.38;
    c.fm+=(tf-c.fm)*.03;c.hz+=(th-c.hz)*.03;
  }
  _camSet(a);
};
const _gkSv=gkReact;
gkReact=function(p){
  const dv0=p.dive>0,o0=ball.owner,l0=ball.last,sp0=Math.hypot(ball.vx,ball.vy);
  _gkSv(p);
  if(dv0&&!o0&&ball.last===p&&l0!==p&&sp0>250){FX.slow=.5;FX.shake=Math.max(FX.shake,3);if(typeof pop8==='function')pop8('GREAT SAVE');}
};
const _hudP=drawHud;
drawHud=function(){
  if(H<=W&&S.mode!=='menu'){
    ctx.save();ctx.setTransform(1,0,0,1,0,0);const w=cv.width,h=cv.height;
    const v=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.45,w/2,h/2,Math.hypot(w,h)*.6);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.38)');
    ctx.fillStyle=v;ctx.fillRect(0,0,w,h);ctx.restore();
  }
  _hudP();
};
const _upP=update;
update=function(){
  _upP();
  const bq=Math.hypot(ball.vx,ball.vy);
  if(bq>200&&!ball.owner){BT.push({x:ball.x,y:ball.y-ball.z*.55,wx:ball.x,wy:ball.y,wz:ball.z,sp:bq});if(BT.length>9)BT.shift();}else if(BT.length)BT.shift();
  if(H>W||S.mode!=='play'||parts.length>350)return;
  for(const p of P){
    if(p.sd&&!p.out&&Math.random()<.6){const c=Math.cos(p.sd.a),sn=Math.sin(p.sd.a);parts.push({x:p.x-c*6,y:p.y-sn*6,vx:-c*28+rnd(-14,14),vy:-sn*28+rnd(-14,14),l:.5,c:'rgba(70,150,66,.85)',s:1.7});}
    if(p.dive>0&&p.dvMax&&1-p.dive/p.dvMax>.8){if(!p.dvLand){p.dvLand=1;for(let i=0;i<9;i++)parts.push({x:p.x,y:p.y,vx:rnd(-30,30),vy:rnd(-30,30),l:.45,c:'rgba(215,230,190,.65)',s:1.5,d:1});}}else if(!(p.dive>0))p.dvLand=0;
  }
  for(const p of P){if(p.out||p.down||p.dive>0)continue;const sp=Math.hypot(p.vx,p.vy);
    if(sp>85&&Math.random()<.12)parts.push({x:p.x-p.vx*.04,y:p.y-p.vy*.04,vx:rnd(-9,9),vy:rnd(-9,9),l:.35,c:'rgba(215,230,190,.55)',s:1.4,d:1});}
};

/* ===================== 19. STAGE 11: teammate AI, cleaner menu layouts ===================== */
function teamCrowd(cx,cy,p){let c=0;for(let i=p.team*11+1;i<p.team*11+11;i++){const q=P[i];if(q===p||q.out)continue;const d=Math.hypot(q.x-cx,q.y-cy);if(d<75)c+=(75-d)/75;}return c;}
const _aiP11=aiPlayer;
aiPlayer=function(p){
  _aiP11(p);
  if(p.gk||p.out||p.team!==(ctrl?ctrl.team:0)||p.freeze>0)return;
  const ti=TI[p.team],chasing=ti.c1===p||ball.receiver===p||ball.owner===p;
  if(!chasing){                                              // keep spacing: step away from team-mates standing on top of me
    let rx=0,ry=0;
    for(let i=p.team*11+1;i<p.team*11+11;i++){const q=P[i];if(q===p||q.out)continue;const dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy);if(d>0.1&&d<32){const w=(32-d)/32;rx+=dx/d*w;ry+=dy/d*w;}}
    if(rx||ry){let ix=p.ix+rx*0.9,iy=p.iy+ry*0.9;const m=Math.hypot(ix,iy);if(m>1){ix/=m;iy/=m;}p.ix=ix;p.iy=iy;}
  }
  if(!ti.att&&!chasing&&p.line>=1&&p.stam>0.35&&!p.sp){       // lost the ball: hurry back into shape
    homePos(p);if(Math.hypot(HP[0]-p.x,HP[1]-p.y)>100)p.sp=true;
  }
};
MS.set=function(){
  mt('SETTINGS');mbk();
  const row=(label,key,opts,y)=>{ctx.textAlign='left';txt(label,W*.06,y+H*.045,H*.038,'#fff',800);ctx.textAlign='center';seg(W*.36,y,W*.58,H*.09,opts,G.cfg[key],i=>{G.cfg[key]=i;save();applyConfig();});};
  const S3=['SMALL','STANDARD','LARGE'];
  row('PITCH SIZE','pitch',S3,H*.16);row('GOAL SIZE','goal',S3,H*.27);row('BALL SIZE','ball',S3,H*.38);row('PLAYER SIZE','player',S3,H*.49);
  ctx.textAlign='left';txt('DIFFICULTY',W*.06,H*.605+H*.045,H*.038,'#fff',800);txt('CAMERA',W*.06,H*.715+H*.045,H*.038,'#fff',800);ctx.textAlign='center';
  seg(W*.36,H*.605,W*.58,H*.09,DIF.map(d=>d.n.split(' ')[0]),G.diff,i=>{G.diff=i;save();});
  seg(W*.36,H*.715,W*.58,H*.09,['TOP','WIDE','MED','CLOSE','HIGH','LOW','ACTION','AUTO','G2G'],G.cam,i=>{G.cam=i;save();});
  ubtn(W*.06,H*.86,W*.28,H*.095,'SOUND & VISUALS',()=>go('opt'));
  ubtn(W*.36,H*.86,W*.28,H*.095,'ADVANCED',()=>go('adv'),0);
  ubtn(W*.66,H*.86,W*.28,H*.095,M.conf?'TAP AGAIN TO ERASE':'RESET SAVE',()=>{if(M.conf)resetSave();else M.conf=1;},M.conf?'rgba(255,60,40,.5)':0);
};
MS.adv=function(){
  mt('ADVANCED');mbk();
  const L=(s,y)=>{ctx.textAlign='left';txt(s,W*.05,y+H*.04,H*.036,'#fff',800);ctx.textAlign='center';};
  L('HAPTICS',H*.17);seg(W*.3,H*.17,W*.26,H*.08,['ON','OFF'],G.haptic?0:1,i=>{G.haptic=i?0:1;save();});
  L('SWIPE ANYWHERE',H*.32);seg(W*.3,H*.32,W*.26,H*.08,['ON','OFF'],G.swAnywhere?0:1,i=>{G.swAnywhere=i?0:1;save();});
  L('HINTS',H*.47);ubtn(W*.3,H*.47,W*.26,H*.08,G.tut?'ON':'OFF (TAP)',()=>{G.tut=0;S.tutT=0;save();},0);
  [['ASSIST','assist'],['CONTROLS','preset'],['LAYOUT EDITOR','layout'],['TRAINING','train'],['CHEAT SHEET','cheat']].forEach((b,i)=>ubtn(W*.62,H*(.17+i*.12),W*.32,H*.09,b[0],()=>go(b[1]),Y));
};
MS.layout=function(){
  mt('LAYOUT EDITOR');mbk();
  const u=H*0.09,lab=GLAB[GS.att?'att':'def'];
  for(let i=0;i<4;i++){
    const c=BTN[i],x=W-c.dx*u,y=H-c.dy*u,r=c.m*u;
    ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
    if(i===layoutSel||(layoutDrag&&layoutDrag.i===i)){ctx.strokeStyle='#ffe600';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,r+6,0,TAU);ctx.stroke();}
    txt(lab[i],x,y,r*0.3,'#fff',700);
  }
  const sz=f=>()=>{const Lb=G.btns||BTN.map(b=>[b.dx,b.dy,b.m]);Lb[layoutSel][2]=clamp(f(Lb[layoutSel][2]),0.6,2.2);G.btns=Lb;syncLayout();save();};
  ctx.textAlign='left';txt('SIZE',W*.05,H*.2+H*.04,H*.036,'#fff',800);txt('OPACITY',W*.05,H*.34+H*.04,H*.036,'#fff',800);txt('JOYSTICK',W*.05,H*.48+H*.04,H*.036,'#fff',800);ctx.textAlign='center';
  ubtn(W*.2,H*.2,W*.1,H*.08,'-',sz(v=>v-0.1));ubtn(W*.31,H*.2,W*.1,H*.08,'1',sz(()=>1));ubtn(W*.42,H*.2,W*.1,H*.08,'+',sz(v=>v+0.1));
  txt(lab[layoutSel].replace('|',' ')+'  x'+BTN[layoutSel].m.toFixed(2),W*.7,H*.24,H*.036,'#ffe600',800);
  seg(W*.2,H*.34,W*.32,H*.08,['LOW','MID','HIGH'],G.op<0.4?0:G.op<0.75?1:2,i=>{G.op=[0.35,0.55,0.85][i];save();});
  ubtn(W*.2,H*.48,W*.075,H*.08,'<',()=>{G.joy[0]=Math.max(0.06,G.joy[0]-0.05);save();});ubtn(W*.285,H*.48,W*.075,H*.08,'>',()=>{G.joy[0]=Math.min(0.94,G.joy[0]+0.05);save();});
  ubtn(W*.37,H*.48,W*.075,H*.08,'^',()=>{G.joy[1]=Math.max(0.1,G.joy[1]-0.06);save();});ubtn(W*.455,H*.48,W*.075,H*.08,'v',()=>{G.joy[1]=Math.min(0.9,G.joy[1]+0.06);save();});
  txt('TAP A CIRCLE TO PICK IT: DRAG = MOVE,  - 1 + = ITS OWN SIZE',W*.4,H*.68,H*.032,'#ffe600',800);
  ubtn(W*.05,H*.84,W*.24,H*.09,'RESET',()=>{G.btns=null;G.preset='classic';G.joy=[0.15,0.7];syncLayout();save();},'rgba(255,60,40,.4)');
  ubtn(W*.32,H*.84,W*.24,H*.09,'DONE',back,Y);
};

/* ===================== 20. STAGE 14: real-football feel - body collisions, ball in hands, colour trajectories, aim preview ===================== */
function bodyCollide(){                                    // resolve one stable ball/body contact per fixed tick
  const b=ball;if(b.owner||b.z>16||H>W)return;
  // The shared fixed-tick lock also gates touches(), preventing immediate re-possession.
  if((b.contactPickupTicks||0)>0)return;
  let hit=null;
  for(const p of P){
    if(p.out||p.substitutionExiting)continue;
    if(p===b.last&&p.kcd>0.1&&!(S.so&&S.so.live&&p===S.so.shooter))continue;
    const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),R=BR+(p.down?3:4.8);
    if(d>=R||d<0.01)continue;
    const nx=dx/d,ny=dy/d,rx=b.vx-p.vx,ry=b.vy-p.vy,vn=rx*nx+ry*ny;
    if(vn>=0)continue;
    // Prefer the deepest approaching contact; break close ties by impact speed.
    const score=(R-d)+Math.min(600,-vn)*0.002;
    if(!hit||score>hit.score)hit={p,nx,ny,R,rx,ry,vn,score};
  }
  if(!hit)return;
  const {p,nx,ny,R,rx,ry,vn}=hit;
  const shootoutKickerContact=!!(S.so&&S.so.live&&p===S.so.shooter);
  if(shootoutKickerContact||PITCH11Law.isRestartKickerSecondContact({
    isRestartKicker:p===b.dbl&&b.last===p,
    approaching:true
  })){
    if(shootoutKickerContact){
      const accidental=b.last===p&&Number.isFinite(S.so.kickAt)&&S.so.t-S.so.kickAt<=0.25;
      if(accidental)b.shootoutDoubleTouch=true;
      else b.shootoutDeliberateDoubleTouch=true;
    }else if(ball.pen&&!ball.penaltyWasShootout&&p===ball.penaltyKicker)ball.penaltyDoubleTouch=true;
    else if(!ball.pen&&!S.so)b.restartDoubleTouchPending={player:p,x:b.x,y:b.y,kind:b.dblKind};
  }
  if(!S.prac&&p.off){callOffside(p);return;}
  const e=0.48;
  b.vx=p.vx+rx-(1+e)*vn*nx;b.vy=p.vy+ry-(1+e)*vn*ny;
  // A small separation margin prevents the same pair from re-penetrating next tick.
  b.x=p.x+nx*(R+0.25);b.y=p.y+ny*(R+0.25);
  // This is a 2D side/body collision: it has no vertical contact normal and must not manufacture a jump impulse.
  const previousLast=b.last;b.spin+=rnd(-.4,.4);b.last=p;
  registerBallContact(p);
  if(b.receiver!==p)b.receiver=null;applyOffsideTouch(p,previousLast,false,false);
  if(-vn>220&&typeof AU!=='undefined'&&AU.kick)AU.kick(-vn*0.5);
}
const _sbH=stepBall;
stepBall=function(){                                        // keeper holds the ball in his hands; throw-in taker holds it overhead
  _sbH();
  for(const q of P)q.hold=0;
  const o=ball.owner;if(!o||o.out||o.down)return;
  const thr=S.rs&&S.rs.kind==='throw'&&S.rs.p===o;
  if(o.gk||thr){
    const off=o.gk&&!thr?4.5:thr?.4:1.5;                  // throw-in: ball is held straight above the head
    ball.x=o.x+Math.cos(o.face)*off;ball.y=o.y+Math.sin(o.face)*off;ball.z=thr?26.6*PLAYER_SCALE+BR:13;ball.vz=0;
    if(thr){ball.x=clamp(ball.x,PX0+.6,PX1-.6);ball.y=clamp(ball.y,PY0+.6,PY1-.6);}   // the taker stands just outside the line, but the ball held overhead must count as in play (otherwise the throw is handed to the other team again every tick)
    o.hold=thr?2:1;
  }
};
const _anH=animInfo;
animInfo=function(p){
  const Q=_anH(p);
  if(p.hold&&!Q.dive&&!Q.down){
    if(p.hold===1){Q.arms.L.sh=Q.arms.R.sh=1.25;Q.arms.L.el=Q.arms.R.el=.55;}
    else{Q.arms.L.sh=Q.arms.R.sh=3.0;Q.arms.L.el=Q.arms.R.el=-.15;}
  }
  return Q;
};
const TRJ={pts:[],col:'#fff',t:0,T:1,mode:''};
function simTraj(){
  const b=ball,pts=[];let x=b.x,y=b.y,z=b.z,vx=b.vx,vy=b.vy,vz=b.vz,sp=b.spin;
  for(let i=0;i<110;i++){
    if(sp){const c=Math.cos(sp*DT),s=Math.sin(sp*DT),nv=vx*c-vy*s;vy=vx*s+vy*c;vx=nv;sp*=z>1?0.996:0.96;}
    if(z>1){vx*=FA;vy*=FA;}else{vx*=FG;vy*=FG;}
    if(z>0||vz!==0){vz-=BALL_GRAV*DT;z+=vz*DT;if(z<=0){z=0;const impact=-vz;if(impact>18){const e=clamp(0.53+impact*0.0004,0.53,0.58);vz=impact*e;vx*=0.92;vy*=0.92;}else vz=0;}}
    if(z===0&&vz===0){const rv=rollResistance(vx,vy);vx=rv[0];vy=rv[1];}
    x+=vx*DT;y+=vy*DT;
    if(i%2===0)pts.push(x,y,z);
    if(vx*vx+vy*vy<80&&z===0)break;
    if(x<PX0-45||x>PX1+45||y<PY0-30||y>PY1+30)break;
  }
  return pts;
}
const _kT=kick;
kick=function(p,vx,vy,vz,sp,r,tx,ty,m){
  _kT(p,vx,vy,vz,sp,r,tx,ty,m);
  const spd=Math.hypot(vx,vy);
  if(spd<90||H>W)return;
  if(p.team!==(ctrl?ctrl.team:0)&&m!=='shot')return;
  TRJ.pts=simTraj();TRJ.T=TRJ.t=m==='shot'?1.3:1.0;TRJ.mode=m;
  TRJ.col=m==='shot'?(spd>650?'#ff4b3a':'#ffa53a'):m==='thru'?'#5cff8a':m==='lob'?'#ffe14d':'#35d6ff';
  if(m==='shot'&&spd>600)FX.shake=Math.max(FX.shake,1.6);
};
function trajPath(k,n3){                                    // world -> screen for one trajectory sample; 2D lifts by height, 3D projects
  const q=TRJ.pts;if(G.cam){pj(q[k],q[k+1],q[k+2]+1);return [V.sx,V.sy];}
  return [q[k],q[k+1]-q[k+2]*.55];
}
function drawTraj(){
  if(TRJ.t<=0||TRJ.pts.length<9)return;
  const n=TRJ.pts.length/3,al=Math.min(1,TRJ.t/TRJ.T*1.5),sc=G.cam?Math.max(.6,V.s):1;
  ctx.save();ctx.lineCap='round';ctx.setLineDash([5,4]);ctx.lineDashOffset=-S.t*30;
  let prev=trajPath(0);
  for(let i=1;i<n;i++){
    const cur=trajPath(i*3),f=i/n;
    ctx.globalAlpha=al*(.95-.6*f);ctx.strokeStyle=TRJ.col;ctx.lineWidth=(2.6-1.2*f)*(G.cam?Math.max(.7,sc*.8):1);
    ctx.beginPath();ctx.moveTo(prev[0],prev[1]);ctx.lineTo(cur[0],cur[1]);ctx.stroke();prev=cur;
  }
  ctx.setLineDash([]);ctx.globalAlpha=al;ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(prev[0],prev[1],G.cam?Math.max(3,sc*3.5):4,0,TAU);ctx.stroke();
  ctx.restore();
}
function drawAim(){                                         // pre-kick preview: line along the aim, colour shows shot charge
  const p=ctrl;if(!p||p.out||ball.owner!==p||S.mode!=='play'||H>W)return;
  let a;try{a=aimAng(p);}catch(e){return;}if(!isFinite(a))return;
  if(!I.shoot)return;const ch=clamp(I.chargeT/.85,0,1),len=100+230*ch;
  const col=I.shoot?(ch>.85?'#ff4b3a':ch>.66?'#5cff8a':ch>.3?'#ffd24a':'#ffffff'):'#35d6ff';
  const ex=p.x+Math.cos(a)*len,ey=p.y+Math.sin(a)*len;
  ctx.save();ctx.lineCap='round';ctx.setLineDash([6,5]);ctx.lineDashOffset=-S.t*26;ctx.strokeStyle=col;ctx.globalAlpha=I.shoot?.9:.38;
  let x0,y0,x1,y1,w=2;
  if(G.cam){pj(p.x,p.y,1);x0=V.sx;y0=V.sy;pj(ex,ey,1);x1=V.sx;y1=V.sy;w=Math.max(1.2,V.s*1.6);}else{x0=p.x;y0=p.y;x1=ex;y1=ey;}
  ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();
  const ang=Math.atan2(y1-y0,x1-x0),hs=w*3.2;ctx.setLineDash([]);ctx.fillStyle=col;ctx.beginPath();
  ctx.moveTo(x1+Math.cos(ang)*hs,y1+Math.sin(ang)*hs);ctx.lineTo(x1+Math.cos(ang+2.5)*hs,y1+Math.sin(ang+2.5)*hs);ctx.lineTo(x1+Math.cos(ang-2.5)*hs,y1+Math.sin(ang-2.5)*hs);ctx.fill();
  ctx.restore();
}
const _dr2=drawRet2;drawRet2=function(){_dr2();drawAim();drawTraj();};
const _dr3=drawRet3;drawRet3=function(){_dr3();drawAim();drawTraj();};
const _upC=update;
update=function(){
  _upC();
  if(TRJ.t>0)TRJ.t-=DT;
  if(S.mode==='play')bodyCollide();
};

/* ===================== 21. STAGE 15: CUSTOMISE hub - match rules, gameplay feel, looks & weather, kit editor ===================== */
const DX={len:1,win:0,offside:1,fouls:2,cards:1,inj:2,spd:2,spr:1,stam:1,ball:1,aitk:1,gk:1,pitch:0,mow:0,wx:0,kit:[null,null,null]};
G.x=Object.assign({},DX,{kit:[null,null,null]});
const SPD=[.85,.93,1,1.08,1.18],SPR=[.9,1,1.12],LENS=[90,180,300,480],FRIC=[1,1,.998];
const X=()=>G.x;
function fixX(){const x=G.x&&typeof G.x==='object'?G.x:{},o={};
  const max={len:3,win:4,offside:1,fouls:2,cards:1,inj:2,spd:4,spr:2,stam:2,ball:2,aitk:2,gk:2,pitch:4,mow:3,wx:3};
  for(const k in DX){if(k==='kit')o.kit=Array.isArray(x.kit)&&x.kit.length===3?x.kit.map(v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:null):[null,null,null];
    else o[k]=Number.isInteger(x[k])&&x[k]>=0&&x[k]<=(max[k]??0)?x[k]:DX[k];}
  G.x=o;}
function applyX(){const x=G.x,L=LENS[Math.min(3,x.len)];
  window.P11PitchSettings={pitch:x.pitch|0,mowing:x.mow|0};
  if(window.P11Stadium&&typeof window.P11Stadium.setPitchSettings==='function')window.P11Stadium.setPitchSettings(x.pitch,x.mow);
  PERIOD.len=[0,L,L,L/2,L/2,0];
  DIF.forEach(d=>{if(d.tk0===undefined){d.tk0=d.tk;d.gk0=d.gk;}d.tk=d.tk0*[.6,1,1.4][Math.min(2,x.aitk)];d.gk=d.gk0*[1.4,1,.65][Math.min(2,x.gk)];});}
const _ldX=load;load=function(){_ldX();fixX();applyX();};
const _rsX=resetSave;resetSave=function(){_rsX();G.x=Object.assign({},DX,{kit:[null,null,null]});applyX();save();};
const chgX=()=>{fixX();applyX();save();};

/* --- rules: offside, fouls, cards, injuries --- */
const _moX=markOff;markOff=function(...a){if(!X().offside){clearOff();return;}_moX(...a);};
const _foX=foul;foul=function(...a){if(Math.random()>=[0,.5,1][Math.min(2,X().fouls)])return;_foX(...a);};
const _gcX=giveCard;giveCard=function(...a){if(!X().cards)return;_gcX(...a);};
const _riX=randInjury;randInjury=function(){if(Math.random()>=[0,.4,1][Math.min(2,X().inj)])return;_riX();};

/* --- win rules: golden goal, first to N, mercy --- */
const _goX=goal;goal=function(dr){_goX(dr);if(S.prac||(S.so&&S.so.live))return;const w=X().win,a=S.score[0],b=S.score[1],m=Math.max(a,b);
  if(w===1||(w===2&&m>=3)||(w===3&&m>=5)||(w===4&&Math.abs(a-b)>=4))S.endNext=1;};
const _nmX=newMatch;newMatch=function(){S.endNext=0;_nmX();};
const _upX=update;update=function(){_upX();if(S.endNext&&S.mode==='play'){S.endNext=0;for(const p of P){p.ix=p.iy=0;p.sp=false;}I.shoot=false;I.chargeT=0;S.adv=null;S.rs=null;toast.s='MATCH OVER';toast.t=1.5;S.mode='full';S.t=0;}};

/* --- movement, stamina, ball friction (rain slows the ball) --- */
const _inX=integrate;integrate=function(p){_inX(p);if(p.out)return;const x=X();
  if(x.stam===0){p.stam=1;p.fat=0;p.winded=false;}
  else if(x.stam===2&&Math.abs(p.vx)+Math.abs(p.vy)>8)p.fat=Math.min(1,p.fat+DT*.0012*(p.sp?2:1));
  if(p.dive>0)return;
  const e=SPD[x.spd]*(p.sp&&!p.winded?SPR[x.spr]:1)-1;
  if(e){p.x+=p.vx*DT*e;p.y+=p.vy*DT*e;clampPos(p);}};
const _sbX=stepBall;stepBall=function(){_sbX();if(!ball.owner&&ball.z<=1){const f=FRIC[Math.min(2,X().ball)]*(X().wx===1?.999:1);ball.vx*=f;ball.vy*=f;}};

/* --- kit editor: own team colours override the club's --- */
const _atX=applyTeam;applyTeam=function(t,ci){_atX(t,ci);if(t===0){const k=X().kit,K=KIT[0];if(k[0])K.shirt=k[0];if(k[1])K.shorts=k[1];if(k[2])K.gk=k[2];}};

/* --- pitch themes + mowing patterns (side cameras keep the standard pitch) --- */
const THEME=[null,['rgba(0,25,10,.38)','#d8e8d8'],['rgba(190,160,70,.45)','#fff'],['rgba(235,245,255,.72)','#9fb6c8'],['rgba(0,40,90,.55)','#35f0ff']];
const _dpX=drawPitch;drawPitch=function(){_dpX();const x=X();if(!x.mow&&!x.pitch&&x.wx!==3)return;
  ctx.save();
  if(x.mow===3){ctx.globalAlpha=.88;ctx.fillStyle='#32913f';ctx.fillRect(PX0,PY0,PW,PH);}
  else if(x.mow===1){const n=16,sw=PW/n,sh=PH/10;ctx.fillStyle='rgba(0,40,0,.09)';for(let i=0;i<n;i++)for(let j=0;j<10;j++)if((i+j)&1)ctx.fillRect(PX0+i*sw,PY0+j*sh,sw,sh);}
  else if(x.mow===2){const sh=PH/10;ctx.fillStyle='rgba(0,40,0,.1)';for(let j=1;j<10;j+=2)ctx.fillRect(PX0,PY0+j*sh,PW,sh);}
  const th=THEME[x.pitch];
  if(th){ctx.globalAlpha=1;ctx.fillStyle=th[0];ctx.fillRect(PX0,PY0,PW,PH);ctx.strokeStyle=th[1];ctx.lineWidth=2;ctx.globalAlpha=.9;ctx.stroke(LINES);}
  ctx.restore();};

/* --- weather overlay + stamina bar (drawn with the screen tint pass) --- */
const WP=Array.from({length:150},()=>({x:Math.random(),y:Math.random(),v:rnd(.6,1.2)}));
function weather(){const w=X().wx;if(!w)return;ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
  if(w===3){const g=ctx.createRadialGradient(W/2,H/2,H*.15,W/2,H/2,Math.max(W,H)*.65);g.addColorStop(0,'rgba(225,232,240,.12)');g.addColorStop(1,'rgba(225,232,240,.55)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  else for(const q of WP){
    if(w===1){q.y+=q.v*DT*2.2;q.x-=q.v*DT*.35;ctx.strokeStyle='rgba(190,215,255,.45)';ctx.lineWidth=1.2;const x=q.x*W,y=q.y*H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-H*.012,y+H*.035);ctx.stroke();}
    else{q.y+=q.v*DT*.22;q.x+=Math.sin(q.y*9+q.v*5)*DT*.04;ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.arc(q.x*W,q.y*H,H*.004*q.v+1,0,TAU);ctx.fill();}
    if(q.y>1){q.y=-.05;q.x=Math.random();}if(q.x<0)q.x=1;if(q.x>1)q.x=0;}
  ctx.restore();}
function stamBar(){return;const p=ctrl;if(!X().sbar||!p||p.out||S.mode!=='play')return;ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
  const w=W*.2,h=H*.014,x=W*.4,y=H*.955,s=clamp(p.stam,0,1);
  ctx.fillStyle='rgba(0,0,0,.5)';rr(x-3,y-3,w+6,h+6,h*.6);ctx.fill();
  ctx.fillStyle=s>.5?'#5cff8a':s>.2?'#ffd24a':'#ff4b3a';ctx.fillRect(x,y,w*s,h);
  if(p.fat>.05){ctx.fillStyle='rgba(255,140,40,.9)';ctx.fillRect(x,y+h-3,w*p.fat,3);}
  ctx.textAlign='center';txt(p.winded?'WINDED':'STAMINA',x+w/2,y-H*.016,H*.022,p.winded?'#ff7a6a':'#e8f0f6',800);ctx.restore();}
const _tiX=tint;tint=function(){_tiX();if(S.mode!=='menu'){weather();stamBar();}};

/* --- menu screens --- */
const SWC=['#1f6fff','#e5342b','#1fa84f','#f2c200','#7b3fe4','#ff8a1f','#12b5b0','#ff5fa2','#ffffff','#1b1b1b','#6b7785','#8b1a2b'];
const CTABS=['MATCH','GAMEPLAY','LOOKS','KIT'];
const CROWS=[
 [['HALF LENGTH','len',['1:30','3:00','5:00','8:00']],['WIN RULE','win',['NORMAL','GOLDEN','1ST TO 3','1ST TO 5','MERCY 4']],['OFFSIDE','offside',['OFF','ON']],['FOULS','fouls',['OFF','LOW','NORMAL']],['CARDS','cards',['OFF','ON']],['INJURIES','inj',['OFF','RARE','NORMAL']]],
 [['PLAYER SPEED','spd',['SLOW','EASY','NORMAL','FAST','TURBO']],['SPRINT','spr',['WEAK','NORMAL','STRONG']],['STAMINA','stam',['INFINITE','NORMAL','HARD']],['BALL ROLL','ball',['SLIPPERY','NORMAL','HEAVY']],['AI TACKLING','aitk',['PASSIVE','NORMAL','AGGRESSIVE']],['KEEPERS','gk',['WEAK','NORMAL','ELITE']]],
 [['PITCH','pitch',['GRASS','DARK','DRY','SNOW','NEON']],['MOWING','mow',['STRIPES','CHECK','BANDS','PLAIN']],['WEATHER','wx',['CLEAR','RAIN','SNOW','FOG']]]];
MS.cust=function(){
  mt('CUSTOMISE');mbk();const x=X();
  ubtn(W*.8,H*.03,W*.18,H*.09,M.conf?'SURE?':'RESET',()=>{if(M.conf){G.x=Object.assign({},DX,{kit:[null,null,null]});M.conf=0;chgX();}else M.conf=1;},M.conf?'rgba(255,60,40,.5)':0);
  const tb=M.ctab|0;seg(W*.04,H*.15,W*.92,H*.08,CTABS,tb,i=>{M.ctab=i;});
  if(tb<3){CROWS[tb].forEach((r,i)=>{const y=H*(.3+i*.1);fit(r[0],W*.18,y,W*.28,H*.034,'#fff');seg(W*.34,y-H*.045,W*.62,H*.09,r[2],x[r[1]],j=>{x[r[1]]=j;chgX();});});
    if(tb===2)mtx('Pitch themes and mowing show in the top-down camera.',.66,'#9fb0c0',.032);
    if(tb===0)mtx('Golden = first goal wins. Mercy = match ends at a 4 goal gap.',.92,'#9fb0c0',.03);}
  else{
    const names=['SHIRT','SHORTS','KEEPER'],kc=[KIT[0].shirt,KIT[0].shorts,KIT[0].gk];
    names.forEach((nm,r)=>{const y=H*(.3+r*.17);fit(nm,W*.1,y+H*.04,W*.14,H*.034,'#fff');
      const n=SWC.length+1,bw=W*.7/n;
      for(let i=0;i<n;i++){const club=i===n-1,c=club?null:SWC[i],sel=club?!x.kit[r]:x.kit[r]===c;
        ubtn(W*.2+i*bw+1,y,bw-3,H*.1,club?'CLUB':'',()=>{x.kit[r]=c;chgX();},club?(sel?Y:0):c);
        if(sel&&!club){ctx.strokeStyle='#ffe600';ctx.lineWidth=4;rr(W*.2+i*bw+1,y,bw-3,H*.1,H*.025);ctx.stroke();}}});
    const sh=x.kit[0]||CL[G.club][2],sk=x.kit[1]||CL[G.club][3],gk=x.kit[2]||CL[G.club][4],px=W*.46,py=H*.8;
    mtx('PREVIEW',.78,'#ffe600',.034);
    [[sh,'OUTFIELD',-.14],[gk,'KEEPER',.14]].forEach(([c,l,o])=>{const cx=W/2+W*o;ctx.fillStyle=c;rr(cx-W*.03,py,W*.06,H*.1,8);ctx.fill();ctx.fillStyle=l==='KEEPER'?'#1b1b1b':sk;ctx.fillRect(cx-W*.025,py+H*.1,W*.05,H*.04);txt(l,cx,py+H*.17,H*.028,'#dfe7ee',700);});}
  UI.def=back;
};
const _mnX=MS.main;MS.main=function(){_mnX();ubtn(W*.78,H*.03,W*.2,H*.09,'CUSTOMISE',()=>go('cust'));};

/* ===================== 22. STAGE 16: referee + assistants, manual crosses, set-piece aiming, ratings & training, career ===================== */
const DRF={show:1,strict:1,kit:4,ar:1,spray:1,adv:1,hit:1};
G.rf=Object.assign({},DRF);G.car={on:0,season:1,tp:0,up:{},pf:{},hist:[]};
function fixRf(){const x=G.rf&&typeof G.rf==='object'?G.rf:{},o={};
  const max={show:1,strict:2,kit:4,ar:1,spray:1,adv:1,hit:1,toss:1,cut:1,pas:2,pprev:1,pgo:1};
  for(const k in DRF)o[k]=Number.isInteger(x[k])&&x[k]>=0&&x[k]<=(max[k]??0)?x[k]:DRF[k];
  o.show=1;G.rf=o;
  const c=G.car&&typeof G.car==='object'?G.car:{};G.car={on:c.on?1:0,season:Math.max(1,(c.season|0)||1),tp:Math.max(0,c.tp|0),up:c.up&&typeof c.up==='object'?c.up:{},pf:c.pf&&typeof c.pf==='object'?c.pf:{},hist:Array.isArray(c.hist)?c.hist.slice(-12):[]};}
const _ldR=load;load=function(){_ldR();fixRf();};
const _rsR=resetSave;resetSave=function(){_rsR();G.rf=Object.assign({},DRF);G.car={on:0,season:1,tp:0,up:{},pf:{},hist:[]};save();};

/* ---------- referee: state, movement, signals ---------- */
const RK=[{s:'#17191d',t:'#e8d200',sh:'#111'},{s:'#f0e000',t:'#222',sh:'#111'},{s:'#ff4fa0',t:'#fff',sh:'#222'},{s:'#2fd6ff',t:'#0b2a3a',sh:'#111'},{s:'#8dff3d',t:'#143',sh:'#111'}];
function refKit(){const k=G.rf.kit;if(k<4)return RK[k];let best=RK[0],bd=-1;for(const c of RK){const d=Math.min(cd(c.s,KIT[0].shirt),cd(c.s,KIT[1].shirt),cd(c.s,KIT[0].gk),cd(c.s,KIT[1].gk));if(d>bd){bd=d;best=c;}}return best;}
const mkAR=top=>({x:CX,y:0,px:CX,py:0,vx:0,face:top?Math.PI/2:-Math.PI/2,anim:0,fl:0,fup:0,fa:0,top});
const REF={x:CX-26,y:CY+28,px:CX-26,py:CY+28,vx:0,vy:0,face:0,anim:0,pose:'run',pt:0,next:null,pa:0,side:1,hop:0,awT:0,card:null,ar:[mkAR(1),mkAR(0)],rd:0,d3:0};
const FO={x:CX+18,y:PY1+15,px:CX+18,py:PY1+15,vx:0,vy:0,face:-Math.PI/2,anim:0,pose:'run',hop:0,card:null,fourth:true,board:'',boardT:0,d3:0};
const SPRAY={l:null};
function refReset(){const R=REF;R.x=R.px=CX-26;R.y=R.py=CY+28;R.vx=R.vy=0;R.pose='run';R.pt=0;R.next=null;R.card=null;R.hop=0;SPRAY.l=null;
  R.ar[0].y=R.ar[0].py=PY0-11;R.ar[1].y=R.ar[1].py=PY1+11;R.ar.forEach(a=>{a.x=a.px=CX;a.vx=0;a.fl=a.fup=0;});
  FO.x=FO.px=CX+18;FO.y=FO.py=PY1+15;FO.board='';FO.boardT=0;FO.d3=0;rDo('whistle',.45);}
function rDo(pose,t,pa,next){REF.pose=pose;REF.pt=t;if(pa!==undefined&&pa!==null)REF.pa=pa;REF.next=next||null;}
const _skR=setupKickoff;setupKickoff=function(t){_skR(t);refReset();};
const _wsR=whistleStop;whistleStop=function(sec,big,sub,fn,hurt){_wsR(sec,big,sub,fn,hurt);if(!G.rf.show)return;
  const ang=dirOf(REF.awT)>0?0:Math.PI,hold=Math.max(.8,sec-.5);
  if(big==='GOAL!'||big==='NO GOAL')rDo('whistle',.5,0,{pose:'pointC',t:hold});
  else if(hurt)rDo('whistle',.4,0,{pose:'wave',t:hold});
  else if(REF.card&&REF.card.t>0)rDo('whistle',.5,0,{pose:'card',t:2.2,next:{pose:'point',t:Math.max(.5,sec-2.7),pa:ang}});
  else if(big==='FOUL'||big==='PENALTY'||big==='OFFSIDE'||big==='NO ADVANTAGE')rDo('whistle',.5,ang,{pose:'point',t:hold});
  else rDo('whistle',.5);};
const _foR=foul;foul=function(p,o,b,context){REF.awT=o.team;
  // Strictness must not manufacture cautions: cards come only from the actual foul decision.
  const st=G.rf.strict;
  if(st===0&&Math.random()<.3&&!(S.rs&&S.rs.kind==='pen')){rDo('adv',1,0);msg('PLAY ON','',1);return;}
  _foR(p,o,b,context);
};
const _gcR=giveCard;giveCard=function(p,c){const px=p.x,py=p.y,old=S.card;_gcR(p,c);if(S.card===old||!G.rf.show)return;REF.card={c:c===1?'#ffd400':'#e5342b',px,py,t:3.2};};
const _coR=callOffside;callOffside=function(p){REF.awT=1-p.team;const a=REF.ar[p.y<CY?0:1];a.fup=2.6;a.fa=dirOf(1-p.team)>0?0:Math.PI;_coR(p);};
const _goR=goal;goal=function(dr){_goR(dr);if(G.rf.show)rDo('pointC',2.6);};
const _ehR=endHalf;endHalf=function(){_ehR();if(G.rf.show)rDo('whistle',1.3,0,{pose:'end',t:2.5});};
const _fkR=freeKick;freeKick=function(t,x,y,ind){_fkR(t,x,y,ind);const rs=S.rs;if(G.rf.spray&&rs&&rs.wall)SPRAY.l={x:rs.wx,y:rs.wy,nx:rs.wnx,ny:rs.wny,t:0,rs,fade:1};};

function refGoal(){const R=REF,b=ball,rs=S.rs;
  if(R.card&&R.card.t>0){const dx=R.card.px-R.x,dy=R.card.py-R.y,d=Math.hypot(dx,dy)||1,s=Math.max(0,d-13);return[R.x+dx/d*s,R.y+dy/d*s,60];}
  if(S.mode==='goal')return[CX-8,CY+34,70];
  if(rs){const d=dirOf(rs.team),gx=d>0?PX1:PX0;
    if(rs.kind==='pen')return[gx-d*(PEN_DEPTH+4),CY+120,70];
    if(rs.kind==='corner')return[gx-d*125,CY+(rs.y<CY?1:-1)*20,66];
    if(rs.kind==='fk'&&rs.wall)return[rs.x+(rs.wx-rs.x)*.52+rs.wnx*22,rs.y+(rs.wy-rs.y)*.52+rs.wny*22,66];
    return[rs.x-d*18,rs.y+(rs.y<CY?1:-1)*22,66];}
  if(S.mode==='whistle')return[b.x-18*dirOf(R.awT),b.y+(b.y<CY?1:-1)*22,60];
  if(S.mode==='kickoff')return[CX-24,CY+26,66];
  const t=b.owner?b.owner.team:b.last?b.last.team:0,d=dirOf(t);
  if(Math.abs(b.y-CY)>70)R.side=b.y<CY?1:-1;
  return[b.x+b.vx*.45-d*22,b.y+b.vy*.45+R.side*26,Math.hypot(b.vx,b.vy)>260?78:66];}
function refTick(){const R=REF,b=ball;if(!G.rf.show||S.mode==='menu'||S.mode==='replay'||H>W)return;
  if(R.card&&R.card.t>0)R.card.t-=DT;if(R.hop>0)R.hop-=DT;if(FO.boardT>0)FO.boardT=Math.max(0,FO.boardT-DT);
  if(R.pt>0){R.pt-=DT;if(R.pt<=0){if(R.next){const n=R.next;rDo(n.pose,n.t,n.pa,n.next);}else R.pose='run';}}
  if(R.pt<=0){if(S.adv)R.pose='adv';else if(S.rs&&S.rs.ind&&b.owner===S.rs.p)R.pose='indirect';else if(R.pose==='adv'||R.pose==='indirect')R.pose='run';}
  const g=refGoal();let dx=g[0]-R.x,dy=g[1]-R.y;const dist=Math.hypot(dx,dy);let ax=0,ay=0;
  for(const p of P){if(p.out)continue;const ex=R.x-p.x,ey=R.y-p.y,e=Math.hypot(ex,ey);if(e<13&&e>.1){const f=(13-e)/13*70;ax+=ex/e*f;ay+=ey/e*f;}}
  const k=Math.min(1,dist/38),vx=(dist>1?dx/dist:0)*g[2]*k+ax,vy=(dist>1?dy/dist:0)*g[2]*k+ay,a=Math.min(1,DT*4);
  R.vx+=(vx-R.vx)*a;R.vy+=(vy-R.vy)*a;R.px=R.x;R.py=R.y;R.x=clamp(R.x+R.vx*DT,PX0-8,PX1+8);R.y=clamp(R.y+R.vy*DT,PY0-6,PY1+6);
  const spd=Math.hypot(R.vx,R.vy);R.anim+=spd*DT*.32;
  if(R.pose==='pointC')R.pa=Math.atan2(CY-R.y,CX-R.x);
  if((R.pose==='card'||R.pose==='whistle')&&R.card&&R.card.t>0)R.pa=Math.atan2(R.card.py-R.y,R.card.px-R.x);
  if(R.pose==='wave'&&S.inj)R.pa=Math.atan2(S.inj.y-R.y,S.inj.x-R.x);
  const fa=(R.pose==='point'||R.pose==='pointC'||R.pose==='card'||R.pose==='wave')?R.pa:spd>10?Math.atan2(R.vy,R.vx):Math.atan2(b.y-R.y,b.x-R.x);
  R.face+=angd(fa,R.face)*Math.min(1,DT*(R.pose==='point'?9:6));
  if(G.rf.hit&&!(S.so&&S.so.live)&&!b.owner&&b.z<16&&R.hop<=0){const e=Math.hypot(b.x-R.x,b.y-R.y),sp=Math.hypot(b.vx,b.vy);
    if(e<BR+4&&sp>90){const contactTeam=b.last&&b.last.team===1?1:0;
       const predictedRestartTeam=PITCH11Law.predictedRestartTeam({x:b.x,y:b.y,vx:b.vx,vy:b.vy,z:b.z,vz:b.vz,gravity:BALL_GRAV,left:PX0,right:PX1,top:PY0,bottom:PY1,radius:BR,centerY:CY,goalHalfWidth:GOALH,goalHeight:GOALZ,lastTouchedTeam:contactTeam,directions:[dirOf(0),dirOf(1)]});
       const recipientTeam=predictedRestartTeam===0||predictedRestartTeam===1?predictedRestartTeam:(b.receiver&&(b.receiver.team===0||b.receiver.team===1)?b.receiver.team:contactTeam);
      b.refContact={x:b.x,y:b.y,team:contactTeam,recipientTeam};
      const an=rnd(-.9,.9),c=Math.cos(an),s=Math.sin(an),nx=b.vx*c-b.vy*s;b.vy=(b.vx*s+b.vy*c)*.5;b.vx=nx*.5;b.vz=Math.max(b.vz,35);R.hop=.4;cm('The ball hits the referee!');}}
  if(!G.rf.adv&&S.adv&&S.mode==='play'){const ad=S.adv;S.adv=null;whistleStop(1.4,'FOUL','',ad.fn);}
  if(SPRAY.l){const l=SPRAY.l;l.t+=DT;if(S.rs!==l.rs){l.fade-=DT*1.3;if(l.fade<=0)SPRAY.l=null;}}
  if(G.rf.ar)arTick();}
function arTick(){const R=REF,b=ball,t=b.owner?b.owner.team:b.last?b.last.team:0,def=1-t,dl=dirOf(def)>0?-1:1,xs=[];
  for(let i=def*11;i<def*11+11;i++)if(!P[i].out)xs.push(P[i].x);xs.sort((p,q)=>dl<0?p-q:q-p);const line=xs.length>1?xs[1]:xs[0]||CX,rs=S.rs;
  if(rs&&(rs.kind==='throw'||rs.kind==='corner')&&!rs.fg){rs.fg=1;const a=R.ar[rs.y<CY?0:1];a.fup=1.5;a.fa=rs.kind==='corner'?Math.atan2(rs.y-a.y,rs.x-a.x):dirOf(rs.team)>0?0:Math.PI;}
  R.ar.forEach((a,i)=>{const mine=(i===0)===(b.x<CX);let tx=mine?line:clamp(b.x,PX0+80,PX1-80);
    if(rs&&rs.kind==='corner'&&(rs.y<CY)===(i===0))tx=rs.x;
    a.y=i?PY1+11:PY0-11;a.px=a.x;a.py=a.y;const v=clamp((tx-a.x)*3,-72,72);a.vx+=(v-a.vx)*Math.min(1,DT*6);a.x=clamp(a.x+a.vx*DT,PX0-6,PX1+6);a.anim+=Math.abs(a.vx)*DT*.32;
    const inw=a.top?Math.PI/2:-Math.PI/2,fa=Math.abs(a.vx)>45?(a.vx>0?0:Math.PI):inw;a.face+=angd(fa,a.face)*Math.min(1,DT*7);
    if(a.fup>0){a.fup-=DT;a.fl=Math.min(1,a.fl+DT*5);}else a.fl=Math.max(0,a.fl-DT*4);});}
const _upR=update;update=function(){_upR();refTick();};

/* ---------- referee drawing: top-down and side-camera figures ---------- */
function figO(R,a,ar){const k=refKit();
  if(!ar)return{x:R.px+(R.x-R.px)*a,y:R.py+(R.y-R.py)*a,face:R.face,ph:R.anim*.62,spd:Math.hypot(R.vx,R.vy),pose:R.pose,hop:R.hop,kit:k,card:R.card&&R.card.t>0?R.card.c:null,sk:'#e0ac69',fourth:!!R.fourth};
  return{x:R.px+(R.x-R.px)*a,y:R.y,face:R.face,ph:R.anim*.62,spd:Math.abs(R.vx),pose:R.fl>.25?'flag':'run',hop:0,kit:k,fl:R.fl,fa:R.fa,ar:1,sk:'#c68642'};}
function hands2(o){const sw=Math.sin(o.ph)*7*Math.min(1,o.spd/50);let l=[.8+sw,-7.6],r=[.8-sw,7.6],lift=0;
  switch(o.pose){case'whistle':r=[4.4,2.2];lift=1;break;case'point':case'pointC':r=[11.5,5.8];break;
    case'adv':{const w=Math.sin(S.t*9)*1.2;l=[8,-6.5+w];r=[8,6.5-w];break;}case'card':r=[4.6,5.2];lift=2;break;case'indirect':r=[2.8,4.6];lift=2;break;
    case'wave':{const w=Math.sin(S.t*15)*3;l=[5+w,-7];r=[5-w,7];lift=1;break;}case'end':l=[4,-3];r=[4,3];break;case'flag':r=[2.6,4.8];lift=2;break;}
  return[l,r,lift];}
function drawFig2(o){const k=o.kit,[l,r,lift]=hands2(o),sw=Math.sin(o.ph)*Math.min(1,o.spd/50),hp=o.hop>0?Math.sin((1-o.hop/.4)*Math.PI)*5:0;
  ctx.save();ctx.translate(o.x,o.y);ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(1.5,2.5,8.6,6.8,0,0,TAU);ctx.fill();
  ctx.translate(0,-hp);ctx.rotate(o.face);ctx.scale(PLAYER_SCALE,PLAYER_SCALE);
  for(const sd of[-1,1]){const fx=-sd*sw*8;ctx.strokeStyle=k.sh;ctx.lineWidth=2.6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-.5,sd*2.4);ctx.lineTo(fx-1.6,sd*3.2);ctx.stroke();
    ctx.fillStyle='#101114';ctx.beginPath();ctx.ellipse(fx,sd*3.2,3.2,2,0,0,TAU);ctx.fill();}
  ctx.lineCap='butt';ctx.fillStyle=k.sh;ctx.beginPath();ctx.ellipse(-1,0,4.4,6.3,0,0,TAU);ctx.fill();
  ctx.strokeStyle=k.s;ctx.lineWidth=2.6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(.5,-6.2);ctx.lineTo(l[0],l[1]);ctx.moveTo(.5,6.2);ctx.lineTo(r[0],r[1]);ctx.stroke();ctx.lineCap='butt';
  ctx.fillStyle=k.s;ctx.beginPath();ctx.ellipse(.5,0,4.8,7.6,0,0,TAU);ctx.fill();
  ctx.strokeStyle=k.t;ctx.lineWidth=.9;ctx.beginPath();ctx.ellipse(.5,0,4.8,7.6,0,-1.1,1.1);ctx.stroke();
  ctx.fillStyle=o.sk;for(const h of[l,r]){ctx.beginPath();ctx.arc(h[0],h[1],lift&&h===r?2.6:2.1,0,TAU);ctx.fill();}
  ctx.beginPath();ctx.arc(1.2,-3.4,.9,0,TAU);ctx.arc(1.2,3.4,.9,0,TAU);ctx.fill();
  ctx.fillStyle='#1b1209';ctx.beginPath();ctx.arc(1.2,0,3.7,0,TAU);ctx.fill();ctx.fillStyle=o.sk;ctx.beginPath();ctx.arc(2.9,0,2,0,TAU);ctx.fill();
  ctx.restore();
  if(o.pose==='whistle'){ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=.8;for(let i=0;i<2;i++){ctx.beginPath();ctx.arc(o.x+Math.cos(o.face)*9,o.y+Math.sin(o.face)*9-hp,4+i*3+(S.t*20%3),o.face-.7,o.face+.7);ctx.stroke();}}
  if(o.pose==='card'&&o.card){ctx.save();ctx.translate(o.x+5,o.y-19-hp);ctx.rotate(-.12+Math.sin(S.t*8)*.03);ctx.fillStyle=o.card;ctx.fillRect(-3,-5,6,9);ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=.7;ctx.strokeRect(-3,-5,6,9);ctx.restore();}
  if(o.pose==='indirect'){ctx.strokeStyle=o.kit.s;ctx.lineWidth=2.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(o.x+3,o.y-6);ctx.lineTo(o.x+3,o.y-22);ctx.stroke();ctx.lineCap='butt';ctx.fillStyle=o.sk;ctx.beginPath();ctx.arc(o.x+3,o.y-23,2.4,0,TAU);ctx.fill();}
  if(o.ar){const up=o.fl,bx=o.x+5,by=o.y-6-up*16,w=Math.sin(S.t*14)*1.4;ctx.strokeStyle='#ddd';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(bx,o.y-5);ctx.lineTo(bx,by-8);ctx.stroke();
    const dir=Math.cos(o.fa)>=0?1:-1;ctx.fillStyle='#ffd400';ctx.beginPath();ctx.moveTo(bx,by-8);ctx.lineTo(bx+dir*8,by-8+w);ctx.lineTo(bx+dir*8,by-3+w);ctx.lineTo(bx,by-3);ctx.fill();ctx.fillStyle='#e5342b';ctx.beginPath();ctx.moveTo(bx,by-8);ctx.lineTo(bx+dir*8,by-8+w);ctx.lineTo(bx+dir*8,by-5.5+w);ctx.lineTo(bx,by-5.5);ctx.fill();}
  if(o.fourth&&FO.boardT>0){ctx.save();ctx.fillStyle='rgba(8,13,20,.94)';ctx.fillRect(o.x+7,o.y-29,24,14);ctx.strokeStyle='#d9e4ec';ctx.lineWidth=.8;ctx.strokeRect(o.x+7,o.y-29,24,14);ctx.fillStyle='#ffe36a';ctx.font='bold 6px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(FO.board,o.x+19,o.y-22);ctx.restore();}}
function hands3(o){const sw=Math.sin(o.ph)*Math.min(1,o.spd/50),g=Math.min(1,o.spd/50),rn=[-sw*5,-11.3-Math.abs(sw)*1.5*g],rl=[sw*5,-11.3-Math.abs(sw)*1.5*g];let A=rn,B=rl;const w=Math.sin(S.t*9);
  switch(o.pose){case'whistle':A=[2.6,-18];break;case'point':case'pointC':A=[9.5,-15.6];break;case'adv':A=[7,-11.8+w*.8];B=[6.2,-11.5-w*.8];break;case'card':A=[1.6,-25.2];break;
    case'indirect':A=[.6,-26.4];break;case'wave':{const q=Math.sin(S.t*15)*2.5;A=[3+q,-22];B=[-3-q,-22];break;}case'end':A=B=[2.4,-12.8];break;case'flag':A=[1.8,-11-o.fl*14];break;}
  return[A,B];}
function drawFig3(o){pj(o.x,o.y,0);const s=V.s,sx=V.sx,sy=V.sy;if(sx<-90||sx>W+90||sy<-20||sy-40*s>H)return;
  const fc=Math.cos(o.face)>=0?1:-1,k=o.kit,sw=Math.sin(o.ph)*Math.min(1,o.spd/50),hp=o.hop>0?Math.sin((1-o.hop/.4)*Math.PI)*5:0,hipY=-9.8;
  ctx.save();ctx.translate(sx,sy);ctx.scale(s*fc*PLAYER_SCALE,s*PLAYER_SCALE);ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(0,0,6.5,2.3,0,0,TAU);ctx.fill();ctx.translate(0,-hp);
  ctx.lineCap='round';
  for(const sd of[1,-1]){const t1=sw*sd*.85,kx=Math.sin(t1)*4.9,ky=hipY+Math.cos(t1)*4.9,t2=t1-Math.max(0,-sw*sd)*1.1,fx=kx+Math.sin(t2)*4.9,fy=Math.min(0,ky+Math.cos(t2)*4.9);
    ctx.strokeStyle=k.sh;ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(0,hipY);ctx.lineTo(kx,ky);ctx.lineTo(fx,fy);ctx.stroke();ctx.fillStyle='#101114';ctx.beginPath();ctx.ellipse(fx+.8,fy-.4,2.2,1.1,0,0,TAU);ctx.fill();}
  ctx.fillStyle=k.sh;ctx.fillRect(-2.7,hipY-1.8,5.4,3.8);ctx.fillStyle=k.s;ctx.fillRect(-2.8,hipY-8.4,5.6,7);ctx.fillStyle=k.t;ctx.fillRect(-2.8,hipY-8.4,5.6,.9);
  const[A,B]=hands3(o);
  for(const[h,n]of[[B,.6],[A,1]]){const mx=h[0]/2,my=(-16.4+h[1])/2;ctx.strokeStyle=k.s;ctx.lineWidth=2.1;ctx.beginPath();ctx.moveTo(0,-16.4);ctx.quadraticCurveTo(mx-1.1*n,my+.4,h[0],h[1]);ctx.stroke();ctx.fillStyle=o.sk;ctx.beginPath();ctx.arc(h[0],h[1],1.25,0,TAU);ctx.fill();}
  ctx.fillStyle=o.sk;ctx.beginPath();ctx.arc(.6,-19.4,1.9,0,TAU);ctx.fill();ctx.fillStyle='#1b1209';ctx.beginPath();ctx.arc(.3,-19.8,1.9,Math.PI*1.05,Math.PI*2.05);ctx.fill();
  if(o.pose==='whistle'){ctx.fillStyle='#ccc';ctx.fillRect(2.2,-18.6,1.3,.8);}
  if(o.pose==='card'&&o.card){ctx.fillStyle=o.card;ctx.fillRect(A[0]-1.4,A[1]-4.2,2.8,3.8);}
  if(o.ar){const dir=Math.cos(o.fa)>=0?1:-1,px=A[0],py=A[1],w=Math.sin(S.t*14)*.8;ctx.strokeStyle='#ddd';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(px,py+2);ctx.lineTo(px,py-6);ctx.stroke();
    ctx.fillStyle='#ffd400';ctx.beginPath();ctx.moveTo(px,py-6);ctx.lineTo(px+dir*5,py-6+w);ctx.lineTo(px+dir*5,py-2.5+w);ctx.lineTo(px,py-2.5);ctx.fill();ctx.fillStyle='#e5342b';ctx.beginPath();ctx.moveTo(px,py-6);ctx.lineTo(px+dir*5,py-6+w);ctx.lineTo(px+dir*5,py-4.2+w);ctx.lineTo(px,py-4.2);ctx.fill();}
  ctx.lineCap='butt';ctx.restore();
  if(o.fourth&&FO.boardT>0){pj(o.x,o.y,25);const bw=Math.max(10,V.s*16),bh=Math.max(7,V.s*10);ctx.save();ctx.fillStyle='rgba(8,13,20,.94)';ctx.fillRect(V.sx-bw/2,V.sy-bh-8,bw,bh);ctx.strokeStyle='#d9e4ec';ctx.lineWidth=Math.max(.6,V.s*.45);ctx.strokeRect(V.sx-bw/2,V.sy-bh-8,bw,bh);ctx.fillStyle='#ffe36a';ctx.font='bold '+Math.max(5,V.s*5)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(FO.board,V.sx,V.sy-bh/2-8);ctx.restore();}}
const on2=()=>G.rf.show&&S.mode!=='menu'&&S.mode!=='replay';
const _dmR=drawMarker;drawMarker=function(a){REF.rd=0;if(on2()&&G.rf.ar)drawFig2(figO(REF.ar[0],a,1));_dmR(a);};
const _dpR=drawPlayer;drawPlayer=function(p,a){if(!REF.rd&&on2()&&REF.py+(REF.y-REF.py)*a<=p.y){REF.rd=1;drawFig2(figO(REF,a));}_dpR(p,a);};
const _dbR=drawBall;drawBall=function(a){if(on2()){if(!REF.rd){REF.rd=1;drawFig2(figO(REF,a));}if(G.rf.ar)drawFig2(figO(REF.ar[1],a,1));drawFig2(figO(FO,a));}_dbR(a);};
const _bsR=drawBallShadow3;drawBallShadow3=function(a){REF.d3=0;if(on2()&&G.rf.ar)drawFig3(figO(REF.ar[0],a,1));_bsR(a);};
const _d3R=drawPlayer3;drawPlayer3=function(p,a,markersOnly=false){if(!REF.d3&&on2()&&REF.y<=p.y){REF.d3=1;drawFig3(figO(REF,a));}_d3R(p,a,markersOnly);};
const _render3DFourth=render3D;render3D=function(a){_render3DFourth(a);if(on2())drawFig3(figO(FO,a));};
/* spray line on the grass */
const _dpiR=drawPitch;drawPitch=function(){_dpiR();const l=SPRAY.l;if(!l)return;const pr=clamp(l.t/.9,0,1),L=15;
  ctx.save();ctx.globalAlpha=clamp(l.fade,0,1)*.85;ctx.strokeStyle='#fff';ctx.lineWidth=1.8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(l.x-l.nx*L,l.y-l.ny*L);ctx.lineTo(l.x-l.nx*L+l.nx*2*L*pr,l.y-l.ny*L+l.ny*2*L*pr);ctx.stroke();ctx.restore();};

/* ---------- manual crosses + set-piece aiming ---------- */
const SPA={on:false,x:0,y:0,curl:0,rs:null};
function spActive(){const p=ctrl,rs=S.rs;if(!p||!rs||rs.p!==p||ball.owner!==p||S.mode!=='play'||p.team!==0)return false;
  if(rs.kind==='corner'||rs.kind==='throw'||rs.kind==='gk')return true;if(rs.kind==='fk'){const gx=dirOf(0)>0?PX1:PX0;return Math.abs(gx-rs.x)>250;}return false;}
function canCross(){const p=ctrl;if(!p||p.out||ball.owner!==p||S.mode!=='play'||p.team!==0||S.so||S.prac&&0)return false;if(spActive())return true;if(S.rs)return false;
  const gx=dirOf(0)>0?PX1:PX0;return Math.abs(gx-p.x)<330&&Math.abs(p.y-CY)>130;}
function crossManual(p){if(SPA.on&&S.rs&&(S.rs.kind==='throw'||S.rs.kind==='gk')){restKick(p);return;}const d=dirOf(p.team),gx=d>0?PX1:PX0,side=p.y<CY?-1:1;let tx,ty,low=false;
  if(SPA.on){tx=SPA.x;ty=SPA.y;}
  else{tx=gx-d*92;ty=CY;const m=Math.hypot(I.mx,I.my);
    if(m>.3){if(I.mx*d<-.5){tx=gx-d*150;ty=CY+side*14;low=true;}else if(I.mx*d>.5){tx=gx-d*42;ty=CY+side*26;}else if(I.my*side<-.35){tx=gx-d*45;ty=CY-side*34;}}}
  const e=(1.35-p.st.pass)*.5;tx+=rnd(-1,1)*18*e;ty+=rnd(-1,1)*18*e;
  let cand=null,bd=1e9;for(let i=p.team*11+1;i<p.team*11+11;i++){const q=P[i];if(q===p||q.out)continue;const dd=Math.hypot(q.x-tx,q.y-ty);if(dd<bd){bd=dd;cand=q;}}
  if(bd>120)cand=null;
  if(low){doPass(p,cand||{x:tx,y:ty,vx:0,vy:0},'thru');pop8('CUT-BACK');return;}
  const dx=tx-p.x,dy=ty-p.y,dist=Math.hypot(dx,dy)||1,base=Math.atan2(dy,dx),T=clamp(dist/430,.8,1.55),f=(1-Math.exp(-.482*T))/.482;
  const cz=-Math.cos(base)*side,sgn=cz>=0?1:-1,spin=sgn*(SPA.on&&SPA.curl===2?-1:1)*.55*(.6+.4*p.st.pass),ang=base-spin*f*.5,v=dist/T/.94;
  kick(p,Math.cos(ang)*v,Math.sin(ang)*v,BALL_GRAV*T/2,spin,cand,tx,ty,'lob');try{setAct(p,2,0);}catch(_){}pop8('CROSS');}
function doCross(){if(canCross()){crossManual(ctrl);try{buzz(18);}catch(_){}}}
function cycleCurl(){SPA.curl=(SPA.curl+1)%3;pop8('CURL: '+['AUTO','IN','OUT'][SPA.curl]);}
const _haS=humanAct;humanAct=function(p){_haS(p);
  if(spActive()&&p===ctrl){const d=dirOf(0),gx=d>0?PX1:PX0;
    if(SPA.rs!==S.rs){SPA.rs=S.rs;spInit(S.rs);}
    SPA.on=true;p.ix=p.iy=0;p.sp=false;
    const bx=spBox(S.rs);SPA.x=clamp(SPA.x+I.mx*200*DT,bx[0],bx[1]);SPA.y=clamp(SPA.y+I.my*200*DT,bx[2],bx[3]);}
  else SPA.on=false;};
const crossBtn={x:0,y:0,r:0},curlBtn={x:0,y:0,r:0};
const _dcS=drawControls;drawControls=function(){_dcS();crossBtn.r=curlBtn.r=0;if(H>W||!canCross())return;
  crossBtn.x=W*.56;crossBtn.y=H*.8;crossBtn.r=H*.075;curlBtn.x=W*.56;curlBtn.y=H*.62;curlBtn.r=SPA.on&&S.rs&&(S.rs.kind==='corner'||S.rs.kind==='fk')?H*.06:0;
  ctx.save();ctx.fillStyle='rgba(255,230,0,.28)';ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(crossBtn.x,crossBtn.y,crossBtn.r,0,TAU);ctx.fill();ctx.stroke();
  ctx.textAlign='center';txt(S.rs&&S.rs.kind==='throw'?'THROW':S.rs&&S.rs.kind==='gk'?'KICK':'CROSS',crossBtn.x,crossBtn.y,H*.034,'#fff',900);
  if(curlBtn.r){ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.arc(curlBtn.x,curlBtn.y,curlBtn.r,0,TAU);ctx.fill();ctx.stroke();txt('CURL',curlBtn.x,curlBtn.y-H*.012,H*.024,'#fff',800);txt(['AUTO','IN','OUT'][SPA.curl],curlBtn.x,curlBtn.y+H*.02,H*.026,'#ffe600',900);}
  ctx.restore();};
cv.addEventListener('pointerdown',e=>{if(S.mode!=='play'||!crossBtn.r)return;
  if(Math.hypot(e.clientX-crossBtn.x,e.clientY-crossBtn.y)<crossBtn.r*1.35){e.stopImmediatePropagation();e.preventDefault();doCross();}
  else if(curlBtn.r&&Math.hypot(e.clientX-curlBtn.x,e.clientY-curlBtn.y)<curlBtn.r*1.35){e.stopImmediatePropagation();e.preventDefault();cycleCurl();}},true);
addEventListener('keydown',e=>{if(S.mode!=='play')return;if(e.code==='KeyX')doCross();else if(e.code==='KeyQ'&&SPA.on)cycleCurl();});
function drawSPA(tr){
  const p=ctrl;if(!SPA.on||!p||!S.rs||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(SPA.x)||!Number.isFinite(SPA.y))return;
  const col='#ffe600',n=16,maxR=Math.max(8,Math.min(W,H)*.035),maxCoord=Math.max(W,H)*2.5;
  const pts=[],lift=4*Math.max(20,Math.min(110,Math.hypot(SPA.x-p.x,SPA.y-p.y)*.2));
  for(let i=0;i<=n;i++){
    const u=i/n,wx=p.x+(SPA.x-p.x)*u,wy=p.y+(SPA.y-p.y)*u,wz=lift*u*(1-u);
    let X,Y;
    if(tr){pj(wx,wy,wz);X=V.sx;Y=V.sy;}else{X=wx;Y=wy-wz*.55;}
    if(!Number.isFinite(X)||!Number.isFinite(Y)||Math.abs(X)>maxCoord||Math.abs(Y)>maxCoord)return;
    pts.push([X,Y]);
  }
  let X=SPA.x,Y=SPA.y,rx=Math.min(26,maxR),ry=Math.min(26,maxR);
  if(tr){
    pj(SPA.x,SPA.y,0);X=V.sx;Y=V.sy;
    if(!Number.isFinite(X)||!Number.isFinite(Y)||!Number.isFinite(V.s)||Math.abs(X)>maxCoord||Math.abs(Y)>maxCoord)return;
    const scale=Math.max(0,Math.min(V.s,maxR/26));rx=26*scale;ry=9*scale;
  }
  if(rx<1||ry<1)return;
  ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
  ctx.lineCap='round';ctx.strokeStyle=col;ctx.fillStyle=col;
  ctx.setLineDash([5,4]);ctx.lineDashOffset=-S.t*30;
  ctx.lineWidth=tr?Math.max(1.2,Math.min(3.5,Number.isFinite(V.s)?V.s*1.5:1.2)):1.8;
  ctx.globalAlpha=.9;ctx.beginPath();
  pts.forEach((q,i)=>{if(i)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1]);});
  ctx.stroke();ctx.setLineDash([]);
  ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(X,Y,rx,ry,0,0,TAU);ctx.stroke();
  ctx.beginPath();ctx.ellipse(X,Y,rx*.35,ry*.35,0,0,TAU);ctx.fill();ctx.restore();
}
const _drS2=drawRet2;drawRet2=function(){_drS2();drawSPA(0);};
const _drS3=drawRet3;drawRet3=function(){_drS3();drawSPA(1);const l=SPRAY.l;
  if(l){ctx.save();ctx.globalAlpha=clamp(l.fade,0,1)*.85;ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1.5,V.s*1.8);pj(l.x-l.nx*15,l.y-l.ny*15,0);const a=[V.sx,V.sy];const pr=clamp(l.t/.9,0,1);pj(l.x-l.nx*15+l.nx*30*pr,l.y-l.ny*15+l.ny*30*pr,0);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(V.sx,V.sy);ctx.stroke();ctx.restore();}
  if(on2()&&G.rf.ar)drawFig3(figO(REF.ar[1],0.999));if(on2()&&!REF.d3){REF.d3=1;drawFig3(figO(REF,.999));}};

/* ---------- ratings, training, career ---------- */
const _sqR=sqd;sqd=function(ci){const s=_sqR(ci);if(!s._t){s.forEach(q=>{q.cl=ci;});s._t=1;}return s;};
const _efR=eff;eff=function(q,sp,off){const st=_efR(q,sp,off);if(q.cl===G.club){const u=G.car.up[G.club+':'+q.num];if(u)STK.forEach(k=>{if(u[k])st[k]=clamp(st[k]+u[k],.3,.99);});}return st;};
const rst=q=>eff(q,q.pos,0);
const CAR={mg:{},live:0};
const _nmR=newMatch;newMatch=function(){CAR.mg={};CAR.live=1;_nmR();};
const _gsR=goal;goal=function(dr){_gsR(dr);if(S.scorer&&S.scorer.team===0&&S.goalTeam===0&&!S.prac)CAR.mg[S.scorer.num]=(CAR.mg[S.scorer.num]||0)+1;};
function carRecord(){if(S.prac||S.mode!=='full'||!CAR.live)return;let bi=0;for(let r=1;r<11;r++)if(ST.r[r]>ST.r[bi])bi=r;
  for(let r=0;r<11;r++){const p=P[r],key=G.club+':'+p.num,f=G.car.pf[key]||(G.car.pf[key]={a:0,g:0,r:0,m:0});f.a++;f.g+=CAR.mg[p.num]||0;f.r+=clamp(ST.r[r],3,10);if(r===bi)f.m++;}
  CAR.motm=bi;save();}
const _fmR=finishMatch;finishMatch=function(){try{carRecord();}catch(e){}_fmR();CAR.live=0;};
const _ldgR=lgDone;lgDone=function(r){_ldgR(r);if(!G.car.on)return;const gf=r.s[0],ga=r.s[1];let tp=(gf>ga?5:gf===ga?2:1)+Math.min(3,gf);if(CAR.live&&CAR.motm!==undefined)tp+=2;G.car.tp+=tp;toast.s='+'+tp+' TRAINING POINTS';toast.t=2.2;save();};
function carEnd(){const L=G.lg;if(!L||L.paid||L.md<L.sch.length)return;L.paid=1;const T=lgTable(),pl=T.findIndex(e=>e.c===G.club),tp=[30,20,12,8,5,3,2,1][Math.max(0,pl)]||1;
  G.car.tp+=tp;G.car.hist.push({s:G.car.season,p:pl+1});G.car.season++;toast.s='SEASON OVER: P'+(pl+1)+'  +'+tp+' TP';toast.t=3;save();}
const carGo=()=>{G.car.on=1;if(!G.lg)newLg(7);save();go('league');};
const _lgR=MS.league;MS.league=function(){_lgR();if(!G.car.on)return;carEnd();ubtn(W*.74,H*.03,W*.24,H*.09,'TRAIN  TP '+G.car.tp,()=>go('rate'));txt('CAREER  SEASON '+G.car.season,W*.3,H*.09,H*.034,'#ffe600',800);};
const _mnR=MS.main;MS.main=function(){_mnR();ubtn(W*.02,H*.03,W*.17,H*.09,'CAREER',carGo,G.car.on?Y:0);ubtn(W*.02,H*.14,W*.17,H*.09,'RATINGS',()=>go('rate'));};
M.rsel=0;
function trn(q,k){const key=G.club+':'+q.num,u=G.car.up[key]||(G.car.up[key]={});if(G.car.tp>0&&(u[k]||0)<.149){G.car.tp--;u[k]=Math.round(((u[k]||0)+.01)*100)/100;save();}}
MS.rate=function(){mt('RATINGS');mbk();const sq=sqd(G.club),c=G.car,ids=sq.map((q,i)=>i).sort((a,b)=>ovr(rst(sq[b]))-ovr(rst(sq[a]))),rows=9,rh=H*.075;
  if(M.rsel>=sq.length)M.rsel=0;
  ids.forEach((qi,i)=>{const q=sq[qi],cx=i<rows?0:1,r=i%rows,x=W*(.03+cx*.245),y=H*.2+r*rh,w=W*.235;ubtn(x,y,w,rh-3,'',()=>{M.rsel=qi;},M.rsel===qi?Y:0);
    fit(q.pos+'  '+(q.nm||'#'+q.num),x+W*.012,y+rh/2-1,w*.72,rh*.36,'#fff','left');ctx.textAlign='right';txt(ovr(rst(q)),x+w-W*.012,y+rh/2-1,rh*.42,'#ffe600',900);ctx.textAlign='center';});
  const q=sq[M.rsel],st=rst(q),key=G.club+':'+q.num,up=c.up[key]||{},pf=c.pf[key]||{a:0,g:0,r:0,m:0},px=W*.52,pw=W*.45;
  fit((q.nm||'#'+q.num)+'  '+q.pos+'     OVR '+ovr(st),px,H*.2,pw,H*.045,'#fff','left');ctx.textAlign='left';
  STK.forEach((k,i)=>{const y=H*.3+i*H*.073,v=st[k],can=c.tp>0&&(up[k]||0)<.149;ctx.textAlign='left';txt(STL[i],px,y,H*.034,'#dfe7ee',800);
    ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(px+W*.07,y-H*.014,pw*.5,H*.028);ctx.fillStyle=v>.8?'#5cff8a':v>.65?'#ffd24a':'#ff9a80';ctx.fillRect(px+W*.07,y-H*.014,pw*.5*v,H*.028);
    txt(Math.round(v*100)+(up[k]?'  (+'+Math.round(up[k]*100)+')':''),px+W*.07+pw*.5+8,y,H*.03,'#fff',700);ctx.textAlign='center';
    ubtn(px+pw-W*.07,y-H*.03,W*.07,H*.06,'+',()=>trn(q,k),can?Y:'rgba(255,255,255,.06)');});
  ctx.textAlign='left';txt('APPS '+pf.a+'  GOALS '+pf.g+'  ASSISTS '+(pf.as||0)+'  AVG '+(pf.a?(pf.r/pf.a).toFixed(1):'-')+'   MOTM '+pf.m,px,H*.83,H*.032,'#9fb0c0',700);
  txt(c.on?'TRAINING POINTS: '+c.tp+'   (+1 = +0.01, max +0.15)':'Start a CAREER to earn training points',px,H*.9,H*.032,'#ffe600',800);ctx.textAlign='center';UI.def=back;};

/* ---------- customise: referee tab ---------- */
CTABS.push('REFEREE');
const RROWS=[['STRICTNESS','strict',['LENIENT','NORMAL','STRICT']],['REF KIT','kit',['BLACK','YELLOW','PINK','CYAN','AUTO']],['ASSISTANTS','ar',['OFF','ON']],['ADVANTAGE','adv',['OFF','ON']],['FREE-KICK SPRAY','spray',['OFF','ON']],['BALL HITS REF','hit',['OFF','ON']]];
const _cuR=MS.cust;MS.cust=function(){if((M.ctab|0)!==4){_cuR();return;}
  mt('CUSTOMISE');mbk();seg(W*.04,H*.15,W*.92,H*.08,CTABS,4,i=>{M.ctab=i;});
  RROWS.forEach((r,i)=>{const y=H*(.26+i*.063);fit(r[0],W*.18,y,W*.28,H*.03,'#fff');seg(W*.34,y-H*.028,W*.62,H*.056,r[2],G.rf[r[1]],j=>{G.rf[r[1]]=j;fixRf();save();});});UI.def=back;};

/* ===================== 23. STAGE 17: throw-in / goal-kick aiming, assists, coin toss, medics ===================== */
function spInit(rs){const d=dirOf(0),gx=d>0?PX1:PX0;SPA.curl=0;
  if(rs.kind==='throw'){SPA.x=clamp(rs.x+d*110,PX0+10,PX1-10);SPA.y=rs.y<CY?rs.y+120:rs.y-120;}
  else if(rs.kind==='gk'){SPA.x=rs.x+d*300;SPA.y=CY;}
  else{SPA.x=gx-d*75;SPA.y=CY+(rs.y<CY?1:-1)*12;}}
function spBox(rs){const d=dirOf(0),gx=d>0?PX1:PX0;
  if(rs.kind==='throw')return[Math.max(PX0+8,rs.x-260),Math.min(PX1-8,rs.x+260),PY0+8,PY1-8];
  if(rs.kind==='gk'){const a=rs.x+d*120,b=rs.x+d*560;return[Math.max(PX0+8,Math.min(a,b)),Math.min(PX1-8,Math.max(a,b)),PY0+12,PY1-12];}
  const lo=Math.min(gx-d*210,gx-d*15),hi=Math.max(gx-d*210,gx-d*15);return[lo,hi,CY-200,CY+200];}
function restKick(p){const rs=S.rs,gk=rs.kind==='gk';let tx=SPA.x,ty=SPA.y;const e=(1.35-p.st.pass)*(gk?30:12)*spErr(p);tx+=rnd(-1,1)*e;ty+=rnd(-1,1)*e;
  let cand=null,bd=1e9;for(let i=p.team*11;i<p.team*11+11;i++){const q=P[i];if(q===p||q.out)continue;const dd=Math.hypot(q.x-tx,q.y-ty);if(dd<bd){bd=dd;cand=q;}}
  if(bd>(gk?90:60))cand=null;
  const dx=tx-p.x,dy=ty-p.y,dist=Math.hypot(dx,dy)||1,ang=Math.atan2(dy,dx),T=gk?clamp(dist/520,.9,1.9):clamp(dist/300,.45,1),v=dist/T/(gk?.93:.99);
  kick(p,Math.cos(ang)*v,Math.sin(ang)*v,BALL_GRAV*T/2,0,cand,tx,ty,'lob');try{setAct(p,2,0);}catch(_){}pop8(gk?'GOAL KICK':'THROW-IN');}

/* ---------- assists: last pass by a team-mate before the shot ---------- */
CAR.clk=0;CAR.ag={};CAR.lt=null;
const _kiA=kick;kick=function(p,vx,vy,vz,spin,rcv,tx,ty,mode){const L=CAR.lt,pass=mode==='pass'||mode==='thru'||mode==='lob';
  ball.ast=(L&&!L.shot&&L.p!==p&&L.p.team===p.team&&CAR.clk-L.t<6)?L.p:null;CAR.lt={p,t:CAR.clk,shot:!pass};_kiA(p,vx,vy,vz,spin,rcv,tx,ty,mode);};
const _gaA=goal;goal=function(dr){const st=ball.ast;_gaA(dr);const s=S.scorer;
  if(s&&st&&st.team===s.team&&st!==s&&!S.prac){if(s.team===0)CAR.ag[st.num]=(CAR.ag[st.num]||0)+1;cm((st.nm||'#'+st.num)+' with the assist.');}};
const _nmA=newMatch;newMatch=function(){CAR.ag={};CAR.lt=null;_nmA();};
const _crA=carRecord;carRecord=function(){if(!S.prac&&S.mode==='full'&&CAR.live)for(let r=0;r<11;r++){const p=P[r],f=G.car.pf[G.club+':'+p.num]||(G.car.pf[G.club+':'+p.num]={a:0,g:0,r:0,m:0});f.as=(f.as||0)+(CAR.ag[p.num]||0);}_crA();};

/* ---------- medics run on for injuries ---------- */
const MED={on:0,a:[]},MK={s:'#f4f4f4',t:'#e22',sh:'#e22'};
function medTick(){const inj=S.mode==='whistle'&&S.inj&&!S.inj.out?S.inj:null;
  if(inj&&!MED.on){MED.on=1;MED.a=[-1,1].map(s=>{const y=inj.y<CY?PY0-16:PY1+16,x=clamp(inj.x+s*45,PX0,PX1);return{x,px:x,y,py:y,hx:x,hy:y,vx:0,vy:0,face:0,anim:0,s,arr:0};});}
  if(!MED.on)return;let back=1;
  for(const m of MED.a){let tx,ty;if(inj){tx=inj.x+m.s*8;ty=inj.y+4;}else{tx=m.hx;ty=m.hy;}
    const dx=tx-m.x,dy=ty-m.y,d=Math.hypot(dx,dy),sp=Math.min(inj?85:110,d*3);m.px=m.x;m.py=m.y;m.vx=d>1?dx/d*sp:0;m.vy=d>1?dy/d*sp:0;m.x+=m.vx*DT;m.y+=m.vy*DT;
    m.anim+=Math.hypot(m.vx,m.vy)*DT*.32;m.arr=inj&&d<10?1:0;if(Math.hypot(m.vx,m.vy)>10)m.face+=angd(Math.atan2(m.vy,m.vx),m.face)*Math.min(1,DT*8);else if(inj)m.face+=angd(Math.atan2(inj.y-m.y,inj.x-m.x),m.face)*.2;
    if(!inj&&d>3)back=0;}
  if(!inj&&back)MED.on=0;}
function medO(m,a){return{x:m.px+(m.x-m.px)*a,y:m.py+(m.y-m.py)*a,face:m.face,ph:m.anim*.62,spd:Math.hypot(m.vx,m.vy),pose:m.arr?'end':'run',hop:0,kit:MK,sk:'#c68642'};}

/* ---------- pre-match coin toss ---------- */
DRF.toss=1;G.rf.toss=1;
const TOSS={on:0,t:0,arm:0,win:0};
const _lcT=launch;launch=function(){TOSS.arm=1;try{_lcT();}finally{TOSS.arm=0;}};
const _nmT=newMatch;newMatch=function(){_nmT();if(TOSS.arm&&G.rf.toss&&G.rf.show&&!S.prac&&M.kind!=='pens'&&S.mode==='kickoff'){TOSS.on=1;TOSS.t=0;TOSS.win=Math.random()<.5?0:1;}};
function tossTick(){const t=TOSS.t+=DT,R=REF,a=P[6],b=P[17];S.t=1.5;camUpdate();
  if(!a.out){a.x=a.px=CX-17;a.y=a.py=CY+4;a.face=0;a.vx=a.vy=0;}if(!b.out){b.x=b.px=CX+17;b.y=b.py=CY+4;b.face=Math.PI;b.vx=b.vy=0;}
  R.x=R.px=CX;R.y=R.py=CY+24;R.vx=R.vy=0;R.pt=0;R.next=null;R.card=null;R.pa=TOSS.win?0:Math.PI;
  R.pose=t<.9?'run':t<2.5?'indirect':t<3.7?'point':'whistle';R.face=R.pose==='point'?R.pa:-Math.PI/2;
  if(t>4.1){TOSS.on=0;setupKickoff(0);}}
const _upQ=update;update=function(){if(TOSS.on){if(S.mode!=='kickoff'||H>W)TOSS.on=0;else{tossTick();return;}}_upQ();CAR.clk+=DT;medTick();};
function tossDraw(){if(!TOSS.on)return;const t=TOSS.t,nm=[CL[G.club][0],CL[M.opp][0]];ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,W,H*.2);fit('COIN TOSS',W/2,H*.07,W*.5,H*.075,'#fff');
  if(t<.9)fit('Captains meet the referee',W/2,H*.15,W*.6,H*.04,'#ffe600');
  else{const u=clamp((t-.9)/1.5,0,1),h=Math.sin(u*Math.PI)*H*.2,cy=H*.42-h,ph=u*Math.PI*8,sy=Math.abs(Math.cos(ph)),up=u>=1?(TOSS.win?-1:1):Math.cos(ph)>=0?1:-1;
    ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(W/2,H*.5,H*.05*(1-h/H),H*.012,0,0,TAU);ctx.fill();
    ctx.fillStyle='#f4c430';ctx.strokeStyle='#8a6a00';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(W/2,cy,H*.05,Math.max(1,H*.05*sy),0,0,TAU);ctx.fill();ctx.stroke();
    if(sy>.25)fit(up>0?KIT[0].name:KIT[1].name,W/2,cy,H*.07,H*.026*Math.min(1,sy*1.5),'#5a4200');
    if(t>2.5){fit(nm[TOSS.win]+' win the toss',W/2,H*.66,W*.7,H*.06,'#fff');fit(TOSS.win?'and defer - '+nm[0]+' kick off':'and elect to kick off',W/2,H*.74,W*.7,H*.04,'#ffe600');}}
  fit('tap to skip',W/2,H*.95,W*.3,H*.028,'rgba(255,255,255,.55)');ctx.restore();}
const _tiT=tint;tint=function(){_tiT();if(S.mode!=='menu')tossDraw();};
cv.addEventListener('pointerdown',e=>{if(TOSS.on){e.stopImmediatePropagation();e.preventDefault();TOSS.t=99;}},true);
addEventListener('keydown',e=>{if(TOSS.on&&(e.code==='Space'||e.code==='Enter'||e.code==='Escape'))TOSS.t=99;});
const _dbM=drawBall;drawBall=function(a){if(on2()&&MED.on)for(const m of MED.a)drawFig2(medO(m,a));_dbM(a);};
const _dr3M=drawRet3;drawRet3=function(){_dr3M();if(on2()&&MED.on)for(const m of MED.a)drawFig3(medO(m,.999));};

/* ===================== 24. STAGE 18: FC Mobile style HUD, referee cutscenes (cards, subs, VAR), assist ratings fix, goals/assists on the stats screen ===================== */
DRF.cut=1;G.rf.cut=1;
let EVT=[],TL={g:{},a:{},t:{},k:{},s:{}};
const CUT={t:0,d:0,title:'',sub:'',col:'#fff',ic:0};
function cut(title,sub,col,ic,d){if(!G.rf.cut||S.prac)return;CUT.t=CUT.d=d||2.4;CUT.title=title;CUT.sub=sub||'';CUT.col=col||'#fff';CUT.ic=ic||0;}
const VAR_LOG=[];
function varCheck(category,evidence){
  const data=Object.assign({},evidence||{},{category});
  const result=PITCH11Law.varReviewDecision(data);
  VAR_LOG.push({category,review:result.review,reason:result.reason});
  if(VAR_LOG.length>64)VAR_LOG.shift();
  if(result.review)cut('VAR CHECK','Referee review required: '+category.toUpperCase(),'#4aa8ff',0,2.4);
  return result;
}
const _nmVAR=newMatch;newMatch=function(){VAR_LOG.length=0;_nmVAR();};
const _nm18=newMatch;newMatch=function(){EVT=[];TL={g:{},a:{},t:{},k:{},s:{}};CUT.t=0;_nm18();};
const _gl18=goal;goal=function(dr){const evidence=ball.varIncident||{};ball.varIncident=null;const a0=ST.ast;_gl18(dr);varCheck('goal',evidence);const sc=S.scorer;if(!sc||S.prac)return;
  const i=P.indexOf(sc),og=sc.team!==S.goalTeam,st=ball.ast;
  EVT.push({t:S.goalTeam,n:sc.num,m:gmin()|0,og});
  if(!og){TL.g[i]=(TL.g[i]||0)+1;
    if(st&&st.team===sc.team&&st!==sc){TL.a[P.indexOf(st)]=(TL.a[P.indexOf(st)]||0)+1;
      const done=a0&&a0.p.team===sc.team&&a0.p!==sc&&ST.now-a0.at<8;   // the pass-based rating bonus may already have paid out
      if(!done)rate(st,.8);}}};
const _gc18=giveCard;giveCard=function(p,c){_gc18(p,c);if(p){CUT.px=p.x;CUT.py=p.y;}if(p)cut(c===1?'YELLOW CARD':c===3?'SECOND YELLOW':'RED CARD',(p.nm||'#'+p.num)+'  '+KIT[p.team].name,c===1?'#ffd400':'#e5342b',1,2.6);if(p&&p.varIncident&&p.varIncident.mistakenIdentity)varCheck('mistaken-identity',p.varIncident);if(c>1)varCheck('red-card',p&&p.varIncident||{});};
const _ds18=doSub;doSub=function(p,bn){const o=p.num,ok=_ds18(p,bn);if(ok)cut('SUBSTITUTION','OFF #'+o+'    ON #'+p.num+'   '+KIT[p.team].name,'#5cff8a',2,2.4);return ok;};
const _sp18=setupPen;setupPen=function(t,sh,so){const evidence=S.varIncident||{};if(!so)S.varIncident=null;_sp18(t,sh,so);if(!so){cut(S.penaltyRetake?'PENALTY RETAKE':'PENALTY AWARDED',S.penaltyRetake?'Goalkeeper infringement - kick retaken':'Referee decision confirmed','#4aa8ff',3,1.8);varCheck('penalty',evidence);}};
const _oopVAR=outOfPlay;outOfPlay=function(){_oopVAR();if(S.rs&&S.rs.kind==='corner'){const evidence=ball.varIncident||{};ball.varIncident=null;varCheck('corner',evidence);}};
const _up18=update;update=function(){_up18();if(CUT.t>0&&S.mode!=='menu')CUT.t-=DT;};
function cutDraw(){if(CUT.t<=0||H>W)return;const u=CUT.d-CUT.t,a=clamp(Math.min(u*5,CUT.t*4),0,1),e=1-a;
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=a;ctx.textBaseline='middle';
  const pw=W*.36,ph=H*.15,px=W/2-pw/2,py=H*.2-e*H*.12;CUT.r=[px,H*.2,pw,ph];
  ctx.fillStyle='rgba(8,12,20,.88)';rr(px,py,pw,ph,ph*.14);ctx.fill();ctx.fillStyle=CUT.col;rr(px,py,ph*.08,ph,ph*.04);ctx.fill();
  const ix=px+ph*.55,iy=py+ph/2;
  if(CUT.ic===1){ctx.save();ctx.translate(ix,iy);ctx.rotate(-.12);ctx.fillStyle=CUT.col;rr(-ph*.17,-ph*.26,ph*.34,ph*.52,ph*.04);ctx.fill();ctx.restore();}
  else if(CUT.ic===2){ctx.fillStyle='#5cff8a';ctx.beginPath();ctx.moveTo(ix-ph*.14,iy-ph*.02);ctx.lineTo(ix+ph*.14,iy-ph*.02);ctx.lineTo(ix,iy-ph*.26);ctx.fill();
    ctx.fillStyle='#ff5a40';ctx.beginPath();ctx.moveTo(ix-ph*.14,iy+ph*.02);ctx.lineTo(ix+ph*.14,iy+ph*.02);ctx.lineTo(ix,iy+ph*.26);ctx.fill();}
  else if(CUT.ic>=4)CUT_ICO(CUT.ic,ix,iy,ph);
  else{ctx.strokeStyle=CUT.col;ctx.lineWidth=ph*.035;rr(ix-ph*.24,iy-ph*.17,ph*.48,ph*.34,ph*.04);ctx.stroke();txt('VAR',ix,iy,ph*.16,CUT.col,900);}
  fit(CUT.title,px+ph*1.0,py+ph*.36,pw-ph*1.15,ph*.3,'#fff','left');fit(CUT.sub,px+ph*1.0,py+ph*.7,pw-ph*1.15,ph*.2,'#b9c8d8','left');
  fit('tap to skip',px+pw-ph*.1,py+ph*.9,pw*.3,ph*.2,'rgba(255,255,255,.55)','right');ctx.restore();}
const _ti18=tint;tint=function(){_ti18();if(S.mode!=='menu')cutDraw();};

/* ---------- FC Mobile style scoreboard: badges, big score, timer tab, possession bar, scorer ticker ---------- */
function scoreboard2(u,x,y,w,h){
  const cx=W/2,hh=H*.07,yy=H*.018,half=H*.30,cw=H*.2,L=cx-cw/2-half,R=cx+cw/2+half,tot=R-L;
  const nm=[0,1].map(i=>String(KIT[i].name).slice(0,3).toUpperCase());
  ctx.save();ctx.textBaseline='middle';ctx.textAlign='center';
  const g=ctx.createLinearGradient(0,yy,0,yy+hh);g.addColorStop(0,'rgba(24,32,48,.9)');g.addColorStop(1,'rgba(8,11,20,.9)');
  ctx.fillStyle=g;rr(L,yy,tot,hh,hh*.28);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.08)';rr(cx-cw/2,yy,cw,hh,0);ctx.fill();            // clock block
  [0,1].forEach(i=>{const dr=i?1:-1,ox=i?R:L;
    ctx.fillStyle=KIT[i].shirt;ctx.fillRect(i?ox-hh*.14:ox,yy+hh*.12,hh*.14,hh*.76);   // kit-colour edge
    fit(nm[i],cx+dr*(cw/2+half*.62),yy+hh*.5,half*.5,hh*.42,'#fff');
    txt(String(S.score[i]),cx+dr*(cw/2+half*.2),yy+hh*.52,hh*.62,'#fff',900);});
  const cs=clockStr(),tm=cs.slice(0,5),lb=cs.slice(7);
  txt(tm,cx,yy+hh*.32,hh*.38,'#fff',800);txt(lb,cx,yy+hh*.75,hh*.34,'#ffe600',800);
  ctx.restore();}

/* ---------- controlled-player chip with stamina (bottom centre) ---------- */
const _h18=drawHud;drawHud=function(){_h18();return;if(H>W||TOSS.on)return;const m=S.mode,p=ctrl;if((m!=='play'&&m!=='kickoff'&&m!=='whistle')||!p||p.out)return;
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.textBaseline='middle';
  const w=H*.36,h=H*.05,x=W/2-w/2,y=H*.945,s=clamp(p.stam===undefined?1:p.stam,0,1);
  ctx.fillStyle='rgba(8,12,18,.72)';rr(x,y,w,h,h*.45);ctx.fill();ctx.fillStyle=KIT[p.team].shirt;rr(x+h*.2,y+h*.2,h*.14,h*.6,h*.05);ctx.fill();
  ctx.textAlign='left';fit((p.nm||'#'+p.num)+'  '+(p.pos||''),x+h*.55,y+h*.5,w*.48,h*.5,'#fff','left');
  const bx=x+w*.52,bw=w*.42;ctx.fillStyle='rgba(255,255,255,.2)';rr(bx,y+h*.38,bw,h*.24,h*.12);ctx.fill();
  ctx.fillStyle=s>.5?'#5cff8a':s>.25?'#ffd400':'#ff5a40';rr(bx,y+h*.38,Math.max(h*.24,bw*s),h*.24,h*.12);ctx.fill();ctx.restore();};

/* ---------- stats screen: goals / assists next to the player ratings ---------- */
const _ss18=statsScr;statsScr=function(){_ss18();const sa=S.score,fin=i=>clamp(ST.r[i]+(sa[0]===sa[1]?0:((sa[0]>sa[1])===(i<11)?.4:-.3)),3,10);
  ctx.textAlign='center';ctx.textBaseline='middle';
  [...Array(11).keys()].sort((p,q)=>fin(q)-fin(p)).slice(0,6).forEach((i,k)=>{const q=[['G',TL.g[i]],['A',TL.a[i]],['T',TL.t[i]],['K',TL.k[i]],['S',TL.s[i]]].filter(z=>z[1]).map(z=>z[0]+z[1]).join(' ');if(q)txt(q,W*.83,H*.26+k*H*.085,H*.025,'#ffe600',800);});};


/* ===================== 25. STAGE 19: ring + name tag, card zoom, VAR overturn, lineup walk-on, handshake, rating events, kick meter, skip ===================== */
const LU={t:0,done:1,h:null,musicFadeStarted:0},HS={on:0,t:0,st:0,h:null},TUN_D=3.6,HS_D=4.6;
const _nm19=newMatch;newMatch=function(){_nm19();LU.t=0;LU.h=null;LU.done=TOSS.on?0:1;LU.musicFadeStarted=0;HS.on=0;HS.t=0;HS.st=0;HS.h=null;};
/* controlled player: stamina ring + number tag */
function ringTag(tr,a){return;const p=ctrl;if(!p||p.out||S.mode==='menu'||S.mode==='replay'||H>W)return;
  const x=p.px+(p.x-p.px)*a,y=p.py+(p.y-p.py)*a,s=clamp(p.stam===undefined?1:p.stam,0,1),col=s>.5?'#5cff8a':s>.25?'#ffd400':'#ff5a40',lab='#'+p.num+' '+(p.pos||'');
  ctx.save();ctx.lineCap='round';ctx.textBaseline='middle';ctx.textAlign='center';
  if(tr){pj(x,y,0);const X=V.sx,Y=V.sy,k=V.s;ctx.lineWidth=Math.max(2,k*2.2);ctx.strokeStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(X,Y,14*k,5*k,0,0,TAU);ctx.stroke();
    ctx.strokeStyle=col;ctx.beginPath();ctx.ellipse(X,Y,14*k,5*k,0,-Math.PI/2,-Math.PI/2+TAU*s);ctx.stroke();
    }
  else{ctx.lineWidth=2.2;ctx.strokeStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(x,y+1,14,0,TAU);ctx.stroke();ctx.strokeStyle=col;ctx.beginPath();ctx.arc(x,y+1,14,-Math.PI/2,-Math.PI/2+TAU*s);ctx.stroke();
    }
  ctx.restore();}
const _db19=drawBall;drawBall=function(a){_db19(a);ringTag(0,a);};
/* card zoom (2D camera) */
const _cu19=camUpdate;camUpdate=function(){_cu19();if(CUT.t>0&&CUT.ic===1&&!G.cam&&CUT.px!==undefined){const k=Math.min(1,(CUT.d-CUT.t)*4,CUT.t*3);cam.x+=(CUT.px-cam.x)*.1*k;cam.y+=(CUT.py-cam.y)*.1*k;cam.v+=(230-cam.v)*.1*k;}};
/* kick power + accuracy */
const spRef=()=>S.rs&&S.rs.kind==='gk'?560:260;
function spErr(p){return .55+clamp(Math.hypot(SPA.x-p.x,SPA.y-p.y)/spRef(),0,1.2);}
const spOn=()=>SPA.on&&ctrl&&S.rs&&(S.rs.kind==='throw'||S.rs.kind==='gk');
function spRing(tr){
  if(!spOn()||S.mode!=='play')return;
  const p=ctrl,e=(1.35-p.st.pass)*(S.rs.kind==='gk'?30:12)*spErr(p),cap=Math.max(6,Math.min(W,H)*.035);
  if(!Number.isFinite(e)||e<=0)return;
  ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
  ctx.strokeStyle='rgba(255,230,0,.6)';ctx.setLineDash([3,3]);ctx.lineWidth=1.5;ctx.beginPath();
  if(tr){
    pj(SPA.x,SPA.y,0);
    if(!Number.isFinite(V.sx)||!Number.isFinite(V.sy)||!Number.isFinite(V.s)){ctx.restore();return;}
    const r=Math.min(cap,e*Math.max(0,V.s));
    if(r<1){ctx.restore();return;}
    ctx.ellipse(V.sx,V.sy,r,r*.35,0,0,TAU);
  }else{
    const r=Math.min(cap,e);
    if(!Number.isFinite(SPA.x)||!Number.isFinite(SPA.y)||r<1){ctx.restore();return;}
    ctx.ellipse(SPA.x,SPA.y,r,r,0,0,TAU);
  }
  ctx.stroke();ctx.restore();
}
const _r2=drawRet2;drawRet2=function(){_r2();spRing(0);};
const _r3=drawRet3;drawRet3=function(){_r3();spRing(1);ringTag(1,.999);};
function spMeter(){if(!spOn()||S.mode!=='play')return;const p=ctrl,d=Math.hypot(SPA.x-p.x,SPA.y-p.y),pw=clamp(d/spRef(),0,1),ac=clamp((1.55-spErr(p))/1,0,1),w=H*.42,h=H*.09,x=W/2-w/2,y=H*.78;
  ctx.save();ctx.textBaseline='middle';ctx.fillStyle='rgba(12,18,30,.82)';rr(x,y,w,h,h*.3);ctx.fill();
  [['POWER',pw,pw>.8?'#ff5a40':'#ffd400'],['ACCURACY',ac,ac>.6?'#5cff8a':ac>.3?'#ffd400':'#ff5a40']].forEach((r,i)=>{const yy=y+h*(.3+i*.4);ctx.textAlign='left';txt(r[0],x+h*.2,yy,h*.2,'#cfe3ff',800);
    ctx.fillStyle='rgba(255,255,255,.2)';rr(x+w*.34,yy-h*.07,w*.6,h*.14,h*.07);ctx.fill();ctx.fillStyle=r[2];rr(x+w*.34,yy-h*.07,Math.max(h*.14,w*.6*r[1]),h*.14,h*.07);ctx.fill();});ctx.restore();}
/* rating events: tackles, key passes, saves */
const _tk19=take;take=function(p,byHand=false){const o=ball.owner;_tk19(p,byHand);if(o&&o.team!==p.team&&S.mode==='play'&&!S.prac&&!p.gk){rate(p,.07);rate(o,-.02);const i=P.indexOf(p);TL.t[i]=(TL.t[i]||0)+1;}};
const _kk19=kick;kick=function(p,vx,vy,vz,spin,rcv,tx,ty,mode){_kk19(p,vx,vy,vz,spin,rcv,tx,ty,mode);const ps=mode==='pass'||mode==='thru'||mode==='lob',ka=ball.ast;
  if(!ps&&ka&&!S.prac&&S.mode==='play'&&Math.abs((dirOf(p.team)>0?PX1:PX0)-p.x)<320){rate(ka,.12);const i=P.indexOf(ka);TL.k[i]=(TL.k[i]||0)+1;}};
const _gr19=gkReact;gkReact=function(p){const n=ST.sot[0]+ST.sot[1];_gr19(p);if(ST.sot[0]+ST.sot[1]>n&&!S.prac){const i=P.indexOf(p);TL.s[i]=(TL.s[i]||0)+1;}};
/* pre-match lineup walk-on and full-time handshake */
function luTick(){LU.t+=DT;S.t=1.5;camUpdate();if(TOSS.t>=99||LU.t>=TUN_D){LU.done=1;LU.h=null;return;}
  if(!LU.h)LU.h=P.map(p=>[p.x,p.y]);
  P.forEach((p,i)=>{if(p.out)return;const k=i%11,tm=i<11?0:1,u=clamp((LU.t-k*.12)/2,0,1),e=u*u*(3-2*u),sx=CX+(tm?22:-22),sy=PY1+34,nx=sx+(LU.h[i][0]-sx)*e,ny=sy+(LU.h[i][1]-sy)*e,mv=u>0&&u<1;
    p.px=p.x;p.py=p.y;p.vx=mv?(nx-p.x)/DT:0;p.vy=mv?(ny-p.y)/DT:0;p.x=nx;p.y=ny;p.face=mv?Math.atan2(p.vy,p.vx):(tm?Math.PI:0);});}
function hsTick(){if(S.mode!=='full'){HS.on=0;return;}if(S.prac||!G.rf.show||!G.rf.cut||H>W)return;
  if(HS.st===0){HS.st=1;HS.on=1;HS.t=0;HS.h=P.map(p=>[p.x,p.y]);HS.cel=winner26()>=0;}if(HS.st!==1)return;
  HS.t+=DT;if(HS.t>=(HS.cel?HS_D+4.4:HS_D)){HS.on=0;HS.st=2;return;}if(HS.cel&&HS.t>HS_D)return;   // winners celebrate after the handshake (stage 26)
  const u=clamp(HS.t/2.4,0,1),e=u*u*(3-2*u);
  P.forEach((p,i)=>{if(p.out)return;const k=i%11,tm=i<11?0:1,tx=CX+(tm?10:-10),ty=PY0+90+k*(PH-180)/10,nx=HS.h[i][0]+(tx-HS.h[i][0])*e,ny=HS.h[i][1]+(ty-HS.h[i][1])*e;
    p.px=p.x;p.py=p.y;p.vx=u<1?(nx-p.x)/DT:0;p.vy=u<1?(ny-p.y)/DT:0;p.x=nx;p.y=ny;p.face=u<1?Math.atan2(p.vy,p.vx):(tm?Math.PI:0);});}
const _up19=update;update=function(){if(TOSS.on&&!LU.done){luTick();return;}_up19();hsTick();};
function luDraw(){if(!TOSS.on||LU.done)return;const al=clamp(Math.min(LU.t*3,(TUN_D-LU.t)*3),0,1),nm=[CL[G.club][0],CL[M.opp][0]];
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.textBaseline='middle';ctx.globalAlpha=al;
  [0,1].forEach(t=>{const x=t?W*.795:W*.02,w=W*.185;ctx.fillStyle='rgba(12,18,30,.84)';rr(x,H*.17,w,H*.7,H*.02);ctx.fill();ctx.fillStyle=KIT[t].shirt;ctx.fillRect(x+w*.05,H*.17,w*.9,H*.012);
    fit(String(nm[t]).slice(0,14),x+w/2,H*.225,w*.88,H*.04,'#fff');
    for(let i=0;i<11;i++){const q=P[t*11+i],y=H*.29+i*H*.05;ctx.textAlign='left';fit((q.nm||'#'+q.num).slice(0,14),x+w*.08,y,w*.62,H*.028,'#fff','left');txt(q.pos||'',x+w*.82,y,H*.024,'#9fb0c0',700);}});
  fit('STARTING LINEUPS',W/2,H*.93,W*.4,H*.04,'#ffe600');fit('tap to skip',W/2,H*.975,W*.3,H*.025,'rgba(255,255,255,.55)');ctx.restore();}
const _td19=tossDraw;tossDraw=function(){if(TOSS.on&&!LU.done)return;_td19();};
const _ti19=tint;tint=function(){_ti19();if(S.mode!=='menu')luDraw();};
const _h19=drawHud;drawHud=function(){if(HS.on){const m=S.mode;S.mode='whistle';try{_h19();}finally{S.mode=m;}
    ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.textBaseline='middle';fit(HS.cel&&HS.t>HS_D?'FULL TIME':'FULL TIME - handshakes',W/2,H*.9,W*.5,H*.045,'#ffe600');fit('tap to skip',W/2,H*.955,W*.3,H*.025,'rgba(255,255,255,.55)');ctx.restore();return;}
  _h19();if(H<=W&&!TOSS.on)spMeter();};
/* tap to skip: handshake, or the card / sub / VAR panel */
cv.addEventListener('pointerdown',e=>{if(HS.on){e.stopImmediatePropagation();e.preventDefault();HS.t=99;return;}
  const r=CUT.r;if(CUT.t>0&&r&&e.clientX>=r[0]&&e.clientX<=r[0]+r[2]&&e.clientY>=r[1]&&e.clientY<=r[1]+r[3]){e.stopImmediatePropagation();e.preventDefault();CUT.t=0;}},true);


/* ===================== 26. STAGE 20: FC Mobile style passing ===================== */
DRF.pas=1;DRF.pprev=1;DRF.pgo=1;G.rf.pas=1;G.rf.pprev=1;G.rf.pgo=1;
const PAS_CW=[.45,1,1.7];
function offPos(p,t){const d=dirOf(p.team);if((t.x-CX)*d<=0||(t.x-ball.x)*d<=0)return false;const xs=[];for(let i=(1-p.team)*11;i<(1-p.team)*11+11;i++)if(!P[i].out)xs.push(P[i].x*d);xs.sort((a,b)=>b-a);return t.x*d>(xs[1]!==undefined?xs[1]:xs[0])+.5;}
function passScore(p,t,ang,mode,cw){const d=dirOf(p.team),dx=t.x-p.x,dy=t.y-p.y,dist=Math.hypot(dx,dy);if(dist<25||dist>(mode==='lob'?600:430))return -9;
  const da=Math.abs(angd(Math.atan2(dy,dx),ang));if(da>cw)return -9;const no=nearestOpp(t);
  return 1.3-da*1.5/cw-dist*.0015+dx*d*(mode==='thru'?.004:.0012)-(mode==='lob'?.15:laneBlock(p,t))*.8-(t.gk?.6:0)-(no<16?.4:no<30?.15:0)+(no>60?.15:0)-(offPos(p,t)?1.1:0);}
const passPress=p=>clamp((30-nearestOpp(p))/30,0,1)*.7;                  // a close marker makes the pass loose
function passGo(p,t){const d=dirOf(p.team);p.wx=clamp(p.x+d*125,PX0+20,PX1-20);p.wy=clamp(p.y+(CY-p.y)*.2+(p.y<t.y?-1:1)*20,PY0+20,PY1-20);p.wr=.9;}   // passer runs on after the pass
/* live preview of the receiver: green = safe, yellow = tight, red = blocked lane or offside */
function drawPP(tr){const p=ctrl;if(!G.rf.pprev||!p||p.out||ball.owner!==p||S.mode!=='play'||p.team!==0||S.rs||S.so||H>W)return;
  const mv=Math.hypot(I.mx,I.my)>.25,t=bestTarget(p,mv?Math.atan2(I.my,I.mx):p.face,'pass',!mv&&G.rf.pas===2);if(!t)return;
  const col=offPos(p,t)||laneBlock(p,t)?'#ff5a40':nearestOpp(t)<26?'#ffd400':'#5cff8a',T=clamp(.5+Math.hypot(t.x-p.x,t.y-p.y)/520,.5,1.3),lx=clamp(t.x+t.vx*T*.45,PX0,PX1),ly=clamp(t.y+t.vy*T*.45,PY0,PY1);
  let X0,Y0,X1,Y1,TX,TY,rx=14,ry=10,lw=1.8;
  if(tr){pj(p.x,p.y,1);X0=V.sx;Y0=V.sy;pj(lx,ly,1);X1=V.sx;Y1=V.sy;pj(t.x,t.y,0);TX=V.sx;TY=V.sy;rx=15*V.s;ry=5.5*V.s;lw=Math.max(1.4,V.s*1.6);}else{X0=p.x;Y0=p.y;X1=lx;Y1=ly;TX=t.x;TY=t.y;}
  ctx.save();ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineCap='round';ctx.globalAlpha=.7+.25*Math.sin(performance.now()/110);
  ctx.setLineDash([5,4]);ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(X0,Y0);ctx.lineTo(X1,Y1);ctx.stroke();ctx.setLineDash([]);
  ctx.lineWidth=lw*1.4;ctx.beginPath();ctx.ellipse(TX,TY+1,rx,ry,0,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(X1,Y1,lw*1.7,0,TAU);ctx.fill();ctx.restore();}
const _p2=drawRet2;drawRet2=function(){_p2();drawPP(0);};
const _p3=drawRet3;drawRet3=function(){_p3();drawPP(1);};
/* first-time pass: press PASS / THRU / LOB while the ball is still arriving and it goes on the first touch */
const QP={k:null,t:0};
const _ha20=humanAct;humanAct=function(p){
  if(S.mode!=='play'||p!==ctrl)QP.t=0;
  else{if(!ball.owner&&ball.receiver===p&&(I.pass||I.thru||I.lob)){QP.k=I.thru?'thru':I.lob?'lob':'pass';QP.t=1.4;pop8('FIRST-TIME');}
    if(QP.t>0){QP.t-=DT;if(ball.owner===p){const k=QP.k;QP.t=0;PSV.v=1.08;humanPass(p,k);try{setAct(p,2,0);}catch(_){}return;}if(ball.owner)QP.t=0;}}
  _ha20(p);};


/* ===================== 27. STAGE 21: custom clubs (pick every player yourself) ===================== */
G.cc=[];G.cv=0;
const KC=['#1f6fff','#e5342b','#1fa84f','#f2c200','#8e44ad','#ff7a1a','#12b5cb','#111111','#ffffff','#e84393'],PLS={};
['GK','DEF','MID','FWD'].forEach(p=>{PLS[p]=PL.map((q,i)=>i).filter(i=>PL[i][1]===p);});      // PL is already sorted best first
const ccFull=k=>!!G.cc[k]&&G.cc[k].s.every(v=>v>=0);
function clubOK(c){return c<NBASE||ccFull(c-NBASE);}
function ccList(c){return SQP.map((p,i)=>{const v=c&&c.s[i];return v>=0?v:[p,SB[p].map(x=>Math.round(x*85))];});}
function ccStr(c){const r=c.s.filter(v=>v>=0).map(v=>PL[v][3]).sort((a,b)=>b-a).slice(0,11),sc=(r.reduce((a,b)=>a+b,0)+72*(11-r.length))/11;return sc>=STR_T[3]?5:sc>=STR_T[2]?4:sc>=STR_T[1]?3:sc>=STR_T[0]?2:1;}
function abbr2(n){const w=String(n).replace(/[^A-Za-z0-9 ]/g,'').split(' ').filter(Boolean);return ((w.length>1?w.map(x=>x[0]).join(''):(w[0]||'MYC')).toUpperCase()+'XXX').slice(0,3);}
function syncCC(){CL.length=NBASE;for(const k in SQC)if(+k>=NBASE)delete SQC[k];
  G.cc=G.cc.filter(c=>c&&typeof c==='object'&&Array.isArray(c.s)&&c.s.length===18).slice(0,6);
  G.cc.forEach(c=>{c.s=c.s.map((v,i)=>Number.isInteger(v)&&v>=0&&v<PL.length&&PL[v][1]===SQP[i]?v:-1);
    const seen=new Set();c.s=c.s.map(v=>{if(v<0||seen.has(v))return -1;seen.add(v);return v;});
    c.n=String(c.n||'MY CLUB').slice(0,22);c.k=((c.k|0)%KC.length+KC.length)%KC.length;c.a=abbr2(c.n);
    const sh=KC[c.k];CL.push([c.n,c.a,sh,sh==='#ffffff'?'#1b1b1b':'#ffffff',sh==='#f2c200'?'#27c46b':'#f2c200',ccStr(c),sh==='#ffffff'||sh==='#f2c200'?'#1b1b1b':'#ffffff']);});}
function ccTouch(){syncCC();G.lk='';save();}
function pbtn(x,y,w,h,a,b,fn,hl,dis){UI.r.push({x,y,w,h,fn});ctx.globalAlpha=dis?.4:1;ctx.fillStyle=hl?Y:'rgba(255,255,255,.12)';rr(x,y,w,h,h*.14);ctx.fill();ctx.strokeStyle=hl?'#ffe600':'rgba(255,255,255,.45)';ctx.lineWidth=2;ctx.stroke();
  fit(a,x+w*.06,y+h*.36,w*.88,h*.3,'#fff','left');if(b)fit(b,x+w*.06,y+h*.72,w*.88,h*.22,'#ffd400','left');ctx.globalAlpha=1;}
const _su21=MS.setup;MS.setup=function(){_su21();ubtn(W*.1,H*.69,W*.8,H*.11,'CUSTOM CLUB BUILDER',()=>go('cclubs'));};
MS.cclubs=function(){mt('MY CLUBS');mbk();
  G.cc.forEach((c,k)=>{const n=c.s.filter(v=>v>=0).length;pbtn(W*.1,H*(.2+k*.11),W*.8,H*.09,c.n+(ccFull(k)?'':'   (incomplete)'),n+'/18 players   '+'*'.repeat(ccStr(c)),()=>{M.ce=k;go('cedit');},0,0);});
  if(G.cc.length<6)ubtn(W*.3,H*.88,W*.4,H*.09,'+ NEW CLUB',()=>{G.cc.push({n:'MY CLUB '+(G.cc.length+1),k:G.cc.length%KC.length,s:Array(18).fill(-1)});ccTouch();M.ce=G.cc.length-1;go('cedit');},Y);
  else mtx('6 custom clubs is the limit',.92,'#9fb0c0',.034);
  if(!G.cc.length)mtx('Build a club by picking every player yourself',.5,'#dfe7ee',.04);};
MS.cedit=function(){const c=G.cc[M.ce];if(!c){back();return;}fit(c.n,W/2,H*.08,W*.5,H*.075,'#fff');mbk();
  for(let i=0;i<18;i++){const v=c.s[i];pbtn(W*(.04+(i%3)*.32),H*(.17+(i/3|0)*.108),W*.3,H*.095,SQP[i]+'  '+(v>=0?PL[v][0]:'EMPTY'),v>=0?PL[v][2]+'  '+PL[v][3]+'  '+CL[PL[v][5]][0]:'tap to pick',()=>{M.cs=i;M.cp=0;go('cpick');},v<0);}
  const bw=W*.17,y=H*.85,h=H*.1;
  ubtn(W*.03,y,bw,h,'NAME',()=>{const n=prompt('Club name',c.n);if(n&&n.trim()){c.n=n.trim().slice(0,22);ccTouch();}});
  ubtn(W*.22,y,bw,h,'KIT',()=>{c.k=(c.k+1)%KC.length;ccTouch();});
  ubtn(W*.41,y,bw,h,'AUTO-FILL',()=>{const u=new Set(c.s);c.s=c.s.map((v,i)=>{if(v>=0)return v;const j=PLS[SQP[i]].find(q=>!u.has(q));if(j===undefined)return -1;u.add(j);return j;});ccTouch();});
  ubtn(W*.6,y,bw,h,'CLEAR',()=>{c.s=Array(18).fill(-1);ccTouch();});
  ubtn(W*.79,y,bw,h,M.conf?'SURE?':'DELETE',()=>{if(!M.conf){M.conf=1;return;}const ci=NBASE+M.ce;G.cc.splice(M.ce,1);if(G.club>=ci)G.club=0;if(M.opp>=ci)M.opp=nextOpp();G.cup=G.lg=null;G.lu=null;ccTouch();back();},M.conf?'rgba(255,80,60,.4)':0);
  ctx.fillStyle=KC[c.k];rr(W*.205,y-H*.035,W*.03,H*.025,4);ctx.fill();};
MS.cpick=function(){const c=G.cc[M.ce];if(!c){back();return;}const pos=SQP[M.cs],u=new Set(c.s),cur=c.s[M.cs],list=PLS[pos].filter(i=>!u.has(i)||i===cur),per=12,pn=Math.max(1,Math.ceil(list.length/per)),pg=clamp(M.cp|0,0,pn-1);M.cp=pg;
  mt('PICK '+pos);mbk();
  for(let j=0;j<per;j++){const i=list[pg*per+j];if(i===undefined)break;pbtn(W*(.03+(j&3)*.2375),H*(.17+(j>>2)*.2),W*.225,H*.18,PL[i][0],PL[i][2]+'  '+PL[i][3]+'  '+CL[PL[i][5]][0],()=>{c.s[M.cs]=i;ccTouch();back();},i===cur);}
  ubtn(W*.1,H*.8,W*.2,H*.1,'< PREV',()=>{M.cp=Math.max(0,pg-1);});ubtn(W*.7,H*.8,W*.2,H*.1,'NEXT >',()=>{M.cp=Math.min(pn-1,pg+1);});
  if(cur>=0)ubtn(W*.4,H*.8,W*.2,H*.1,'REMOVE',()=>{c.s[M.cs]=-1;ccTouch();back();});
  mtx('Page '+(pg+1)+' / '+pn+'   -   '+list.length+' players',.93,'#ffe600',.034);};
