'use strict';
/* ===================== 13. STAGE 7: animation states (kick, pass, tackle, header, celebrate, get-up), ball squash ===================== */
const AD=[1,.4,.3,.4,1,.5,.6];                             // action durations (s): 1 shoot, 2 pass, 3 tackle, 5 celebrate, 6 get up
const pz=p=>{const k=p.ak|0;return k&&p.at>0?1-p.at/AD[k]:0;};   // action progress 0..1
const setAct=(p,k,u0)=>{p.ak=k;p.at=AD[k]*(1-(u0||0));};
const _k7=kick;kick=function(p,vx,vy,vz,sp,r,tx,ty,m){_k7(p,vx,vy,vz,sp,r,tx,ty,m);if(!(p.jump>0))setAct(p,m==='shot'?1:2,.3);};   // starts mid-swing: the ball leaves on contact
const _t7=tryTackle;tryTackle=function(p,c){const t0=p.tcd,r=_t7(p,c);if(p.tcd>t0+.5)setAct(p,3,0);return r;};
const _u7=update;update=function(){
  if(S.mode==='replay'){_u7();return;}
  const pv=ball.vz;_u7();
  if(S.mode==='menu'||H>W)return;
  const gt=S.mode==='goal'?S.goalTeam:-1;
  for(const p of P){
    if(p.team===gt&&!p.gk&&!p.out){p.ak=5;p.at=.5;}
    else if(p.at>0){p.at-=DT;if(p.at<=0)p.ak=0;}
    if(p.wd&&!p.down&&!p.dive&&!p.out)setAct(p,6,0);
    p.wd=p.down;
  }
  if(ball.sq>0)ball.sq-=DT;if(ball.z===0&&ball.vz>0&&pv<-18)ball.sq=.1;
};


/* ===================== 14. STAGE 8: attacking gesture variants (shots, passes, through balls, skill moves), aim reticle ===================== */
const SHV={acc:1,v:1,vf:0,vz:-1,sp:null},PSV={thr:0,v:1,err:1,curl:0};            // one-shot parameter bags read by doShoot / doPass
const W8={p:null,t:0,w:0,k:'',wall:0,a:null,b:null,ret:-1},FT8={p:null,t:0},SKP={s:'',t:0},RET={on:false,x:0,y:0},K8={m:1,d:0,r:36,t:.55,ok:true};
const D8={ftap:1};Object.assign(G,D8);
const SK8=[{n:'STEP OVER',a:0,m:1.05,d:0,r:34,t:.5},{n:'FLIP FLAP',a:.85,m:1.15,d:.06,r:36,t:.55},{n:'BODY FEINT',a:1.4,m:.85,d:-.05,r:30,t:.4},
  {n:'ROLL CUT',a:2.4,m:1,d:.03,r:34,t:.5},{n:'DRAG BACK',a:Math.PI,m:.9,d:0,r:32,t:.5},{n:'RAINBOW FLICK',a:-.35,m:1.25,d:.12,r:42,t:.65},
  {n:'BODY FEINT',a:-1.4,m:.85,d:-.05,r:30,t:.4},{n:'ELASTICO',a:-.85,m:1.2,d:.1,r:36,t:.55},{n:'KNOCK-ON',a:0,m:1.5,d:0,r:24,t:.45,free:1}];   // index = swipe dir (0 up, 2 right, 4 down, 6 left; odd indices are unused now), 8 = double-tap; angle is relative to the player's heading
const GVL={0:{U:'LOB THRU',D:'DRIVEN',L:'CURL L',R:'CURL R'},1:{U:'CHIP',D:'DRIVEN',L:'FINESSE',R:'POWER'},2:{U:'LOB',D:'DRIVEN',L:'WALL',R:'WALL'}};
function syncDbl(){TUNING.dbl.att[1]=G.ftap?1:0;}
const act8=(a,b)=>{if(GS.spy8)GS.spy8(b?a+':'+b:a);};                    // test hook: names the action that really ran
const pop8=t=>{SKP.s=t;SKP.t=TUNING.pop;};
function kswipe(pid){const dx=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0),dy=(keys.ArrowDown?1:0)-(keys.ArrowUp?1:0);if(dx||dy)gMove(pid,dx*200,dy*200);}
/* --- shots --- */
function shootGo(p,rs){
  if(W8.p===p)return;
  const k=I.svar,pen=!!(rs&&rs.kind==='pen');
  if(!k||pen){act8('shot','normal');doShoot(p,clamp(I.chargeT/0.85,0.18,1),aimAng(p),rs&&rs.kind==='fk'?35:0);return;}
  if(k==='ft'){if(ball.owner===p)shotVar(p,'ft');else{FT8.p=p;FT8.t=TUNING.sh.ft.arm;}return;}   // no ball yet: armed, fires when it arrives
  const w=TUNING.sh[k].w;
  if(w>0){W8.p=p;W8.t=W8.w=w;W8.k=k;setAct(p,1,0);return;}                   // longer wind-up shots
  shotVar(p,k);
}
function shotVar(p,k){
  const c=TUNING.sh[k],d=dirOf(p.team),gx=d>0?PX1:PX0;let ang=aimAng(p);
  SHV.acc=c.acc;SHV.v=c.v||1;
  if(k==='low')SHV.vz=2;                                                    // driven: hugs the grass
  else if(k==='chip'){                                                      // lands just inside the goal line, dropping over a keeper off his line
    const cs=Math.cos(ang);let L=cs*d>0.15?Math.abs((gx-d*2-p.x)/cs):c.L;L=clamp(L,50,420);
    const T=clamp(L/c.spd,0.5,1.15);SHV.vz=BALL_GRAV*T/2;SHV.vf=L/T*1.06;
  }else if(k==='fin'){                                                      // curled to the far corner
    const sy=p.y>CY+4?-1:p.y<CY-4?1:(Math.random()<.5?1:-1),ty=CY+sy*(GOALH-c.in),aT=Math.atan2(ty-p.y,gx-p.x);
    if(Math.cos(aT)*d>0.2){
      const L=Math.hypot(gx-p.x,ty-p.y),v=(175+165*c.pw)*(0.9+0.2*p.st.shoot)*SHV.v,tf=L/v*1.05,n=Math.max(4,tf/DT),sg=(1-Math.pow(0.992,n))/0.008,s=sy*d>0?1:-1;
      SHV.sp=s*c.curl/(DT*sg);ang=aT-s*c.curl/2;SHV.vz=Math.min(BALL_GRAV*tf*0.475,105);
    }
  }
  pop8(c.n);act8('shot',k);
  doShoot(p,c.pw,ang,0,1);
}
/* --- passes --- */
function humanPassX(p,tmode,dmode){
  const ang=Math.hypot(I.mx,I.my)>0.25?Math.atan2(I.my,I.mx):p.face,t=bestTarget(p,ang,tmode);
  doPass(p,t||{x:p.x+Math.cos(ang)*160,y:p.y+Math.sin(ang)*160,vx:0,vy:0},dmode);
}
function passVar(p){
  if(I.thru&&!I.pass){
    const k=I.tvar;
    if(k==='lob'){act8('thru','lob');pop8('LOBBED THROUGH');PSV.thr=1;humanPassX(p,'thru','lob');}
    else if(k==='low'){act8('thru','low');pop8('DRIVEN THROUGH');PSV.v=TUNING.ps.lowV;PSV.err=1.25;humanPassX(p,'thru','thru');}
    else if(k==='curL'||k==='curR'){act8('thru',k);pop8('CURLED THROUGH');PSV.curl=(k==='curR'?1:-1)*TUNING.ps.curve;humanPassX(p,'thru','thru');}
    else{act8('thru','normal');humanPass(p,'thru');}
    return;
  }
  const k=I.pvar;
  if(k==='lob'){act8('pass','lob');pop8('LOB PASS');humanPass(p,'lob');}
  else if(k==='driven'){act8('pass','driven');pop8('DRIVEN PASS');PSV.v=TUNING.ps.lowV;PSV.err=1.1;humanPass(p,'pass');}
  else if(k==='wallL'||k==='wallR')wallPass(p,k==='wallR'?1:-1);
  else{
    if(I.ppow>0){act8('pass','power');pop8('POWER PASS');PSV.v=1+TUNING.ps.powMax*I.ppow;PSV.err=1+0.8*I.ppow;}else act8('pass','normal');
    humanPass(p,'pass');
  }
}
function backHeel(p){
  const f=p.face,t=bestTarget(p,f+Math.PI,'pass');
  if(t&&Math.hypot(t.x-p.x,t.y-p.y)<TUNING.ps.backMax){act8('pass','backheel');pop8('BACK-HEEL');PSV.v=TUNING.ps.backV;PSV.err=1.3;doPass(p,t,'pass');p.face=f;}   // heel flick keeps the player facing forward
  else{I.skd=4;skillAct(p);}                                                // nobody behind: drag the ball back instead
}
function wallPass(p,sx){
  const t=bestTarget(p,sx>0?0:Math.PI,'pass');
  if(!t||t.gk){act8('pass','normal');humanPass(p,'pass');return;}           // no partner on that side: plain pass
  act8('pass','wall');pop8('WALL PASS');
  const d=dirOf(p.team);let q=null,qd=1e9;const o=1-p.team;
  for(let i=o*11+1;i<o*11+11;i++){const u=P[i],dd=Math.hypot(u.x-p.x,u.y-p.y);if(!u.out&&dd<qd){qd=dd;q=u;}}
  PSV.v=TUNING.wall.v;doPass(p,t,'pass');
  W8.wall=1;W8.a=p;W8.b=t;W8.t=TUNING.wall.life;W8.ret=-1;
  const side=q&&q.y>p.y?-1:1;                                              // passer runs forward, away from the nearest defender
  p.wx=clamp(p.x+d*TUNING.wall.run,PX0+20,PX1-20);p.wy=clamp(p.y+side*30,PY0+20,PY1-20);p.wr=TUNING.wall.runT;
}
/* --- skill moves --- */
function skillAct(p){
  const k=I.skd;I.skd=-1;if(k<0||k>8||(k&1)||p.scd>0||p.skill>0||p.gk)return;
  const T=SK8[k],fw=Math.hypot(I.mx,I.my)>0.25?Math.atan2(I.my,I.mx):p.face;
  let q=null,qd=1e9;const o=1-p.team;
  for(let i=o*11+1;i<o*11+11;i++){const u=P[i];if(u.out)continue;const dd=Math.hypot(u.x-p.x,u.y-p.y);if(dd<qd){qd=dd;q=u;}}
  const ok=!!T.free||qd>TUNING.sk.near||Math.random()<clamp(TUNING.sk.base+TUNING.sk.dr*(p.st.drib-q.st.def)-T.d-p.fat*0.2,0.12,0.92);   // dribbling vs the nearest defender
  K8.m=ok?T.m:0.35;K8.d=T.d;K8.r=T.r;K8.t=ok?T.t:0.3;K8.ok=T.free?undefined:ok;
  if(!skillMove(p,fw+T.a,K8))return;
  p.scd=TUNING.sk.cd;act8('skill',T.n+(ok?'':'!'));
  if(ok)pop8(T.n);
  else{pop8('LOST IT');p.stun=0.25;if(Math.random()<TUNING.sk.loose){const b=ball;b.owner=null;b.last=p;b.receiver=null;b.vx=Math.cos(fw+T.a)*70;b.vy=Math.sin(fw+T.a)*70;p.kcd=0.4;}}
}
/* --- per-tick state: wind-up, first-time arming, wall pass, timers --- */
function tick8(){
  if(H>W)return;                                           // timed shots and first-touch actions must pause with the match
  if(SKP.t>0)SKP.t-=DT;
  for(const p of P){if(p.scd>0)p.scd-=DT;if(p.wr>0)p.wr-=DT;}
  if(S.mode!=='play'){W8.p=null;FT8.p=null;W8.wall=0;return;}
  if(W8.p){const p=W8.p;
    if(ball.owner!==p||p.stun>0||p.dive>0)W8.p=null;
    else{W8.t-=DT;if(W8.t<=0){W8.p=null;shotVar(p,W8.k);}}
  }
  if(FT8.p){const p=FT8.p,c=TUNING.sh.ft;FT8.t-=DT;
    if(FT8.t<=0||p!==ctrl||(ball.owner&&ball.owner!==p))FT8.p=null;
    else if(ball.owner===p||(!ball.owner&&p.kcd<=0&&ball.z<c.zmax&&Math.hypot(ball.x-p.x,ball.y-p.y)<c.reach)){FT8.p=null;shotVar(p,'ft');}
  }
  if(W8.wall){W8.t-=DT;
    if(W8.t<=0)W8.wall=0;
    else if(W8.ret>0){W8.ret-=DT;if(W8.ret<=0){const a=W8.a,b=W8.b;W8.wall=0;if(ball.owner===b&&!a.out){act8('pass','wallreturn');PSV.err=0.7;doPass(b,a,'thru');}}}
  }
}
const _tk8=take;take=function(p,byHand=false){_tk8(p,byHand);if(W8.wall){if(p===W8.b)W8.ret=TUNING.wall.delay;else W8.wall=0;}};   // receiver controls the pass -> one-touch return
const _ai8=aiPlayer;aiPlayer=function(p){
  if(p.wr>0&&!p.gk){const dx=p.wx-p.x,dy=p.wy-p.y,m=Math.hypot(dx,dy);if(m>8){p.ix=dx/m;p.iy=dy/m;p.sp=true;}else{p.ix=p.iy=0;p.sp=false;}return;}
  _ai8(p);};
const _u8=update;update=function(){if(H>W)return;tick8();_u8();};
/* --- reticle --- */
function retUpdate(){
  RET.on=false;const p=ctrl;
  if(!p||p.gk||ball.owner!==p||S.mode!=='play')return;
  const d=dirOf(p.team),gx=d>0?PX1:PX0,a=aimAng(p),cs=Math.cos(a);
  if(cs*d<0.2||Math.abs(gx-p.x)>TUNING.ret.range)return;
  const yh=p.y+Math.tan(a)*(gx-p.x);if(Math.abs(yh-CY)>GOALH+6)return;
  RET.on=true;RET.x=gx;RET.y=clamp(yh,CY-GOALH+2,CY+GOALH-2);
}
function drawRet2(){
  retUpdate();if(!RET.on)return;
  ctx.strokeStyle='rgba(255,230,0,.95)';ctx.lineWidth=0.8;ctx.beginPath();ctx.arc(RET.x,RET.y,3.4,0,TAU);
  ctx.moveTo(RET.x-5.5,RET.y);ctx.lineTo(RET.x-1.6,RET.y);ctx.moveTo(RET.x+1.6,RET.y);ctx.lineTo(RET.x+5.5,RET.y);
  ctx.moveTo(RET.x,RET.y-5.5);ctx.lineTo(RET.x,RET.y-1.6);ctx.moveTo(RET.x,RET.y+1.6);ctx.lineTo(RET.x,RET.y+5.5);ctx.stroke();
}
function drawRet3(){
  retUpdate();if(!RET.on)return;
  pj(RET.x,RET.y,10);const r=Math.max(3,V.s*3.4);
  ctx.strokeStyle='rgba(255,230,0,.95)';ctx.lineWidth=Math.max(1,V.s*0.8);ctx.beginPath();ctx.arc(V.sx,V.sy,r,0,TAU);
  ctx.moveTo(V.sx-r*1.6,V.sy);ctx.lineTo(V.sx-r*.5,V.sy);ctx.moveTo(V.sx+r*.5,V.sy);ctx.lineTo(V.sx+r*1.6,V.sy);
  ctx.moveTo(V.sx,V.sy-r*1.6);ctx.lineTo(V.sx,V.sy-r*.5);ctx.moveTo(V.sx,V.sy+r*.5);ctx.lineTo(V.sx,V.sy+r*1.6);ctx.stroke();
}
/* --- button overlays --- */
function hint8(i,q,c,R,as,cur){                                           // name of the variant under the finger
  if(cur<0||!GS.att)return;let L='';
  if(i===3)L=ball.owner===ctrl?SK8[cur].n:'';
  else{const g=GVL[i];if(g)L=g[card(q)]||'';}
  if(!L)return;
  txt(L,c.x+GDX[cur]*(R+as*4.6),c.y+GDY[cur]*(R+as*4.6)-(GDY[cur]>0.5?0:as*0.3),as*2.3,'#ffe600',800);
}
function ring8(i,q,c,r){
  if(i===1&&W8.p){ctx.strokeStyle='#5ce1ff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(c.x,c.y,r+5,-Math.PI/2,-Math.PI/2+clamp(1-W8.t/W8.w,0,1)*TAU);ctx.stroke();}
  if(i===2&&q.on&&q.act==='passc'){ctx.strokeStyle='#ffe600';ctx.lineWidth=4;ctx.beginPath();ctx.arc(c.x,c.y,r+5,-Math.PI/2,-Math.PI/2+clamp((q.t-TUNING.holdT)/TUNING.ps.chargeT,0,1)*TAU);ctx.stroke();}
}
function pop8Draw(){
  if(SKP.t<=0)return;const u=H*0.09,x=W-TUNING.btnRight*u,y=H-(TUNING.btnBottom+TUNING.btnOff+TUNING.btnR+1)*u,w=SKP.s.length*u*0.42+u*0.9;
  ctx.globalAlpha=Math.min(1,SKP.t*3);ctx.fillStyle='rgba(8,12,18,.72)';rr(x-w/2,y-u*0.45,w,u*0.9,u*0.3);ctx.fill();
  txt(SKP.s,x,y,u*0.52,'#ffe600',800);ctx.globalAlpha=1;
}
/* --- settings persistence --- */
const _ld8=load;load=function(){_ld8();G.ftap=Number.isInteger(G.ftap)&&G.ftap>=0&&G.ftap<=1?G.ftap:1;syncDbl();};
const _rs8=resetSave;resetSave=function(){_rs8();Object.assign(G,D8);syncDbl();save();};
syncDbl();
