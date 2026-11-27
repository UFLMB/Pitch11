'use strict';
/* ===================== 15. STAGE 9: defending gestures (sprint+tackle, switch, slide, 2nd press, keeper charge) + AI use ===================== */
TUNING.swipeAsTap=false;                                   // defending swipes now mean something
TUNING.df={
  auto:{lead:.45,jock:32,jockR:85,reach:1,commit:.06,cd:.7,chance:.7,steer:30},   // SPRINT+TACKLE: lead s, goal-side offset, jockey range, reach x, wait in reach s, min gap between tackles s, tackle chance, stick steer
  sl:{dur:.55,v:120,vp:55,win0:.05,win1:.9,ideal:.2,cd:1.3,recHit:.3,recMiss:.8,recWhiff:1,reach:22,rd:6,assist:.6,assistR:110,stam:.08},   // SLIDE: length s, launch speed (+pace), contact window, ideal contact time, cooldown, recovery by result, ball reach, aim assist
  sw:{cone:1.1,max:420,lock:4},                            // SWITCH: direction cone (rad), max distance, how long a hand-picked player stays selected (s)
  gk:{maxOut:300,range:480,tmax:4,cd:3.5,smother:22},      // KEEPER CHARGE: furthest off the line, ball must be this close to goal, max charge time, cooldown, grab range
  ai:{press:.08,slide:.35,gk:.3,boxK:.4,teamK:.5,gkCd:3}   // AI rates per second (x difficulty tk): 2nd press (per 0.5 s), slide, keeper charge; x boxK in own box; x teamK for the human's AI team-mates; extra GK cooldown
};
const D9={on:false,lock:null,lockT:0,auto:false,ai2:[false,false],ai2T:[0,0],pp:[null,null],aiBoth:false,
  gk:[{on:false,t:0,cd:0},{on:false,t:0,cd:0}],n:{sl:[0,0],sw:[0,0],sf:[0,0],si:[0,0],sm:[0,0],at:[0,0],gk:[0,0],gs:[0,0],p2:[0,0]}};   // aiBoth: test harness only (both teams use the AI deciders)
const dk9=t=>t?DIF[G.diff].tk:1;                            // difficulty scale for AI defending actions
const ownGX=p=>dirOf(p.team)>0?PX0:PX1;
const popD=(p,s)=>{if(p===ctrl)pop8(s);};
/* --- per-tick: timers, 2nd-press bookkeeping, resets --- */
function reset9(){for(const p of P){p.sd=null;p.acT=0;}D9.on=false;D9.lock=null;D9.auto=false;D9.ai2[0]=D9.ai2[1]=false;D9.pp[0]=D9.pp[1]=null;for(const c of D9.gk){c.on=false;c.t=0;c.cd=0;}}
function pickP2(t){                                         // second presser: nearest team-mate to the ball that is not already the main defender
  const b=ball,ex=(t===0&&!D9.aiBoth)?ctrl:TI[t].c1,cur=D9.pp[t];let best=null,bd=1e9;
  for(let i=t*11+1;i<t*11+11;i++){const q=P[i];if(q.out||q===ex||q.down||q.sd)continue;const d=Math.hypot(q.x-b.x,q.y-b.y);if(d<bd){bd=d;best=q;}}
  if(cur&&!cur.out&&cur!==ex&&!cur.down&&!cur.gk&&Math.hypot(cur.x-b.x,cur.y-b.y)<bd*1.6+30)return cur;   // sticky: the chosen presser stays until someone is clearly closer
  return best;
}
function tick9(){
  if(S.mode==='replay'||H>W)return;
  for(const p of P){if(p.acd>0)p.acd-=DT;if(p.sdc>0)p.sdc-=DT;}
  for(const c of D9.gk)if(c.cd>0)c.cd-=DT;
  if(S.mode!=='play'){                                      // dead ball / goal / half: everything resets
    let any=D9.on||D9.lock||D9.pp[0]||D9.pp[1]||D9.ai2[0]||D9.ai2[1]||D9.gk[0].on||D9.gk[1].on||D9.gk[0].cd>0||D9.gk[1].cd>0;for(const p of P)if(p.sd)any=true;
    if(any)reset9();D9.auto=false;return;
  }
  const q0=GS.s[0];                                         // slow swipe up after the press already became a hold = still a keeper charge
  if(!GS.att&&q0.on&&q0.act==='press2h'){const dx=q0.x-q0.x0,dy=q0.y-q0.y0;if(dy<-q0.thr&&Math.abs(dy)>Math.abs(dx)){q0.act='';gkCharge(0,false);}}
  for(let t=0;t<2;t++){
    const ti=TI[t],opp=!!ball.owner&&ball.owner.team!==t&&!ball.owner.gk,ai=t===1||D9.aiBoth;
    if(ti.att){if(ai)D9.ai2[t]=false;else D9.on=false;}     // possession changed: the press ends
    else if(ai){
      D9.ai2T[t]-=DT;
      if(D9.ai2T[t]<=0){D9.ai2T[t]=0.5;
        if(!D9.ai2[t]&&opp&&!S.rs){const prog=((ball.x-(dirOf(t)>0?PX0:PX1))*dirOf(t))/PW;   // AI closes down with two when the ball is in its own part of the pitch
          if(prog<0.6&&Math.random()<TUNING.df.ai.press*dk9(t)*(1+0.4*TC[t].press)){D9.ai2[t]=true;D9.n.p2[t]++;act8('press2','ai');}}
      }
    }
    D9.pp[t]=(ai?D9.ai2[t]:D9.on)?pickP2(t):null;
  }
}
/* --- SLIDE --- */
function startSlide(p,a,src){
  const K=TUNING.df.sl;
  if(p.gk||p.out||p.sd||p.sdc>0||p.stun>0||p.dive>0||p.down||S.mode!=='play'||ball.owner===p||p.stam<0.06)return false;
  const v0=K.v+K.vp*p.st.pace+Math.max(0,p.vx*Math.cos(a)+p.vy*Math.sin(a))*0.35;
  p.sd={a:a,t:0,v0:v0,res:0,rec:0};p.sdc=K.cd+K.dur;p.sp=false;p.face=a;p.stam=Math.max(0,p.stam-K.stam);
  setAct(p,3,0);D9.n.sl[p.team]++;act8('slide','start');return true;
}
function humanSlide(p,di){
  const K=TUNING.df.sl,o=ball.owner,tg=o&&o.team!==p.team&&!o.gk?o:null,tx=(tg?tg.x+tg.vx*0.25:ball.x)-p.x,ty=(tg?tg.y+tg.vy*0.25:ball.y)-p.y,dd=Math.hypot(tx,ty);
  let a;
  if(di>=0)a=Math.atan2(GDY[di],GDX[di]);                   // swipe: slide that way
  else if(Math.hypot(I.mx,I.my)>0.3)a=Math.atan2(I.my,I.mx);// tap: stick direction, else at the ball
  else a=dd<K.assistR*1.4?Math.atan2(ty,tx):p.face;
  const tw=Math.atan2(ty,tx);if(dd<K.assistR&&Math.abs(angd(tw,a))<0.6)a+=angd(tw,a)*K.assist;   // light aim assist towards the carrier / ball
  if(!startSlide(p,a,'human')&&p.sdc>0)pop8('RECOVERING');
}
function slideStep(p){                                      // replaces normal movement while sliding
  const K=TUNING.df.sl,sd=p.sd;sd.t+=DT;
  const v=sd.v0*Math.max(0,1-sd.t/K.dur);
  p.vx=Math.cos(sd.a)*v;p.vy=Math.sin(sd.a)*v;p.x+=p.vx*DT;p.y+=p.vy*DT;clampPos(p);p.face=sd.a;p.anim+=v*DT*0.35;p.ak=3;p.at=0.15;
  if(!sd.res&&sd.t>=K.win0&&sd.t<=K.dur*K.win1)slideHit(p,sd);
  if(sd.t>=K.dur){
    if(!sd.res){sd.res=3;sd.rec=K.recWhiff;D9.n.sm[p.team]++;act8('slide','whiff');popD(p,'MISSED');}
    p.stun=Math.max(p.stun,sd.rec);p.tcd=Math.max(p.tcd,0.8);p.sd=null;p.vx*=0.2;p.vy*=0.2;
  }
}
function slideInjury(o,tq,behind,foulSanction,penaltyKicker){                          // a hard foul can injure the victim, including when advantage is played
  if(Math.random()>=0.1+0.25*(1-tq)+(behind?0.1:0))return;
  if(S.mode==='whistle'&&!S.inj){S.inj=o;o.down=true;S.wt=3;msg('INJURY',tag(o)+' is down',3);}
  else if(S.mode==='play'&&S.adv&&S.adv.team===o.team){const fn=S.adv.fn;S.adv=null;whistleStop(3,'FOUL','',fn,o);msg('INJURY',tag(o)+' is down',3);}
  else return;
  o.inj=true;
  if(foulSanction){o.law5FoulSanction=true;o.law5AssessmentQuickly=true;}
  if(penaltyKicker)o.law5PenaltyKicker=true;
  D9.n.si[o.team===0?1:0]++;act8('slide','injury');
}
function slideFoul(p,q,tq,behind){
  p.sd.res=2;p.sd.rec=0.5;const sp0=p.sp,speed=Math.hypot(p.vx,p.vy),previousYc=p.yc;
  const seriousFoulPlay=behind&&tq<0.12&&speed>180;
  p.sp=true;foul(p,q,behind,{reckless:behind||tq<0.55,seriousFoulPlay,attemptToPlayBall:true});
  const foulSanction=p.out||p.yc>previousYc,own=dirOf(p.team)>0?PX0:PX1;
  const penaltyKicker=Math.abs(ball.x-own)<165&&Math.abs(ball.y-CY)<201.5&&firstIn(q.team)===q;
  p.sp=sp0;D9.n.sf[p.team]++;act8('slide','foul');slideInjury(q,tq,behind,foulSanction,penaltyKicker);
}
function slideHit(p,sd){
  if(p.substitutionExiting)return;
  const K=TUNING.df.sl,b=ball,o=b.owner,def=p.st.def,rch=K.reach+K.rd*def,tq=1-clamp(Math.abs(sd.t-K.ideal)/0.25,0,1);   // tq: timing quality, 1 = contact at the ideal moment
  if(!S.prac&&p.off&&Math.hypot(b.x-p.x,b.y-p.y)<rch){callOffside(p);return;}
  if(o&&o.team!==p.team&&!o.gk&&b.protect<=0){
    const dx=b.x-p.x,dy=b.y-p.y;
    if(Math.hypot(dx,dy)<=rch){
      const ang=Math.abs(angd(Math.atan2(dy,dx),sd.a));
      if(ang<1.5){                                          // the ball is in front of the slide: contact
        const an=clamp(ang/1,0,1),behind=Math.abs(angd(Math.atan2(o.y-p.y,o.x-p.x),o.face))<1;
        const win=Math.random()<clamp((0.28+0.55*def)*(0.55+0.45*tq)*(1-0.6*an)*(1.3-0.6*o.st.drib)*(o.skill>0?0.4:1)*(1+(p.st.phys-o.st.phys)*0.4),0.05,0.9);
        const fp=(0.07+(behind?0.28:0)+(1-tq)*0.2+an*0.2)*(win?0.35:1)*(1.5-def);   // from behind, mistimed or at a bad angle = foul
        if(Math.random()<fp){slideFoul(p,o,tq,behind);return;}
        if(win){
          sd.res=1;sd.rec=K.recHit;o.stun=0.6;o.kcd=0.7;o.vx*=0.2;o.vy*=0.2;D9.n.sw[p.team]++;act8('slide','win');popD(p,'SLIDE TACKLE');
          if(Math.random()<0.62)take(p);
          else{const previousLast=b.last;b.owner=null;registerBallContact(p);b.last=p;b.receiver=null;const a=sd.a+rnd(-.5,.5),v=rnd(130,210);b.vx=Math.cos(a)*v;b.vy=Math.sin(a)*v;applyOffsideTouch(p,previousLast,true,false);}
        }else{sd.res=4;sd.rec=K.recMiss+0.45*(1-tq);D9.n.sm[p.team]++;act8('slide','miss');popD(p,'MISSED');}   // he rode it: long recovery
        return;
      }
    }
  }else if(!o&&b.z<10&&p.kcd<=0&&!(b.receiver&&b.receiver.team===p.team)&&Math.hypot(b.x-p.x,b.y-p.y)<rch&&Math.abs(angd(Math.atan2(b.y-p.y,b.x-p.x),sd.a))<1.5){
    sd.res=1;sd.rec=K.recHit;act8('slide','ball');                               // loose ball: block or win it
    if(Math.hypot(b.vx,b.vy)<350&&Math.random()<0.7)take(p);
    else{registerBallContact(p);b.last=p;b.receiver=null;const a=sd.a+rnd(-.6,.6),v=rnd(130,220);b.vx=Math.cos(a)*v;b.vy=Math.sin(a)*v;clearOff();}
    return;
  }
  for(let i=(1-p.team)*11+1;i<(1-p.team)*11+11;i++){        // took the man, not the ball
    const q=P[i];if(q.out||q===o||q.down)continue;
    if(Math.hypot(q.x-p.x,q.y-p.y)<11&&Math.random()<DT*40*(0.5+0.4*(1-tq))){slideFoul(p,q,tq,Math.abs(angd(Math.atan2(q.y-p.y,q.x-p.x),q.face))<1);return;}
  }
}
const _int9=integrate;integrate=function(p){if(p.sd&&!p.out){slideStep(p);return;}_int9(p);};
/* --- SPRINT + TACKLE (auto) --- */
function tackleTry(p,chance,dk){                            // attempt only when in reach, after a short commit, with a gap between attempts (no spam)
  const K=TUNING.df.auto,b=ball,o=b.owner;
  if(!o||o.gk||o.team===p.team||p.tcd>0||p.stun>0||p.acd>0||b.protect>0){p.acT=0;return;}
  if(Math.hypot(b.x-p.x,b.y-p.y)<(18+5*p.st.def)*K.reach){
    p.acT+=DT;
    if(p.acT>=K.commit/(dk||1)){p.acT=0;p.acd=K.cd;D9.n.at[p.team]++;act8('auto','tackle');const sp0=p.sp;p.sp=false;tryTackle(p,chance,{sprinting:sp0});p.sp=sp0;}   // planted feet for the challenge itself
  }else p.acT=0;
}
function closeIn(p,o){                                      // last few metres: step firmly onto the ball (no slow-down lag behind a moving carrier)
  const b=ball,tx=b.x+b.vx*0.12,ty=b.y+b.vy*0.12,dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy);
  if(d>3){const m=Math.min(1,d/6);p.ix=dx/d*m;p.iy=dy/d*m;}
  p.sp=d>15&&p.stam>0.15;                                   // sprint until the ball is within reach
}
function autoDef(p){
  const K=TUNING.df.auto,b=ball,o=b.owner;
  if(S.rs||p.sd||(o&&o.team===p.team))return;
  p.ix=p.iy=0;
  if(!o){interceptTo(p);return;}                            // loose ball: run it down
  const dx=o.x-p.x,dy=o.y-p.y,dist=Math.hypot(dx,dy),gx=ownGX(p),osp=Math.hypot(o.vx,o.vy);
  let ux=gx-o.x,uy=CY-o.y;const ul=Math.hypot(ux,uy)||1;ux/=ul;uy/=ul;
  const jd=clamp((dist-26)*0.5,0,K.jock);                   // jockey angle: aim goal-side of the carrier, straighter the closer we get
  let tx=o.x+o.vx*K.lead+ux*jd,ty=o.y+o.vy*K.lead+uy*jd;
  if(Math.hypot(I.mx,I.my)>0.35){tx+=I.mx*K.steer;ty+=I.my*K.steer;}   // the stick still nudges the line
  const chase=dist>K.jockR||(osp>80&&dist>34);
  goTo(p,clamp(tx,PX0,PX1),clamp(ty,PY0,PY1),chase);
  if(!chase)p.sp=false;                                     // close: slow down and jockey
  if(dist<K.jockR*0.6&&dist<jd+44)closeIn(p,o);
  tackleTry(p,K.chance,1);
}
/* --- 2ND PRESS (second defender joins) --- */
function press2Go(p,o,dist,dk){
  const K=TUNING.df.auto,gx=ownGX(p),c1=(p.team===0&&!D9.aiBoth)?ctrl:TI[p.team].c1;
  let ux=gx-o.x,uy=CY-o.y;const ul=Math.hypot(ux,uy)||1;ux/=ul;uy/=ul;
  let sg;if(c1&&c1!==p){const s=(c1.x-o.x)*(-uy)+(c1.y-o.y)*ux;sg=s>0?-1:1;}else sg=p.y<o.y?-1:1;   // come in from the other side of the first defender
  const nx=-uy*sg,ny=ux*sg,fl=clamp((dist-40)/70,0,1);   // wide approach from far, straight at the ball when close
  p.ix=p.iy=0;goTo(p,clamp(o.x+o.vx*0.3+(ux*22+nx*30)*fl,PX0,PX1),clamp(o.y+o.vy*0.3+(uy*22+ny*30)*fl,PY0,PY1),dist>45);
  if(dist<42)closeIn(p,o);
  tackleTry(p,K.chance*clamp(0.75+0.25*dk,0.8,1.15),dk);
}
function togglePress2(){D9.on=!D9.on;if(D9.on)D9.n.p2[0]++;act8('press2',D9.on?'on':'off');pop8(D9.on?'2ND PRESS ON':'2ND PRESS OFF');}
function defAI(p){                                          // AI defenders: slide + second press with the same functions the human uses. true = handled this tick
  const b=ball,o=b.owner,t=p.team,ti=TI[t];
  if(!o||o.team===t||o.gk||S.rs||S.mode!=='play'||ti.att)return false;
  const second=D9.pp[t]===p;if(!second&&ti.c1!==p)return false;
  const dist=Math.hypot(o.x-p.x,o.y-p.y),dk=dk9(t);
  if(!(p.sdc>0)&&!(p.stun>0)&&!(p.tcd>0)&&p.stam>0.12&&dist>26&&dist<52&&Math.hypot(o.vx,o.vy)>25){
    let rate=TUNING.df.ai.slide*dk;if(t===0&&!D9.aiBoth)rate*=TUNING.df.ai.teamK;
    if(Math.abs(angd(Math.atan2(o.y-p.y,o.x-p.x),o.face))<1)rate*=0.25;                // a sensible defender rarely slides in from behind
    if(Math.abs(p.x-ownGX(p))<165&&Math.abs(p.y-CY)<201)rate*=TUNING.df.ai.boxK;   // careful about a penalty
    if(Math.random()<DT*rate){startSlide(p,Math.atan2(o.y+o.vy*0.2-p.y,o.x+o.vx*0.2-p.x)+rnd(-1,1)*(1.5-p.st.def)*0.22,'ai');return true;}
  }
  if(second){press2Go(p,o,dist,dk);return true;}
  return false;
}
const _ai9=aiPlayer;aiPlayer=function(p){
  if(p.sd){p.ix=p.iy=0;p.sp=false;return;}
  if(!p.gk&&!(p.wr>0)&&defAI(p))return;
  _ai9(p);
};
/* --- SWITCH --- */
function defSwitch(di){
  const p=ctrl,K=TUNING.df.sw;if(!p)return;
  let a=null;if(di>=0)a=Math.atan2(GDY[di],GDX[di]);else if(Math.hypot(I.mx,I.my)>0.35)a=Math.atan2(I.my,I.mx);
  if(a!==null){                                             // tap while flicking the stick: the player in that direction
    let best=null,bs=1e9;
    for(let i=0;i<11;i++){const q=P[i];if(q.gk||q.out||q===p||q.down)continue;
      const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);if(d>K.max||d<6)continue;
      const da=Math.abs(angd(Math.atan2(dy,dx),a));if(da>K.cone)continue;
      const s=d*(1+da*1.2)+Math.hypot(q.x-ball.x,q.y-ball.y)*0.1;if(s<bs){bs=s;best=q;}}
    if(best){ctrl=best;S.swCd=0.9;D9.lock=best;D9.lockT=K.lock;act8('switch','dir');return;}
  }
  D9.lock=null;switchPlayer();act8('switch','nearest');     // plain tap (or nobody that way): nearest to the ball
}
const _as9=autoSwitch;autoSwitch=function(){
  const L=D9.lock;
  if(L){
    const o=ball.owner;
    if(ctrl!==L||L.out||D9.lockT<=0||(o&&o.team===0))D9.lock=null;
    else{
      D9.lockT-=DT;const dl=Math.hypot(L.x-ball.x,L.y-ball.y);
      for(let i=0;i<11;i++){const q=P[i];if(q.gk||q.out||q===L)continue;if(dl>90&&Math.hypot(q.x-ball.x,q.y-ball.y)<dl*0.4){D9.lock=null;break;}}   // someone is much closer: release the hand-picked player
      if(D9.lock)return;
    }
  }
  const prev=ctrl;_as9();
  if(D9.on&&ctrl!==prev&&ctrl===D9.pp[0]&&prev&&!prev.out&&!(ball.owner&&ball.owner.team===0))ctrl=prev;   // 2nd press on: auto-switch never takes the helper over, he stays on the AI press
};
/* --- KEEPER CHARGE --- */
function gkCharge(t,ai){
  const p=GK[t],c=D9.gk[t],K=TUNING.df.gk,gx=ownGX(p);
  if(p.out||S.mode!=='play')return false;
  if(c.on)return false;
  if(c.cd>0||p.dive>0||p.stun>0||S.rs||ball.owner===p||(ball.owner&&ball.owner.team===t)){if(!ai)pop8('KEEPER NOT READY');return false;}
  if(Math.abs(ball.x-gx)>K.range){if(!ai)pop8('BALL TOO FAR');return false;}
  c.on=true;c.t=0;D9.n.gk[t]++;act8('gk','charge');if(!ai)pop8('KEEPER CHARGE');return true;
}
function gkEnd(c,t){c.on=false;c.cd=TUNING.df.gk.cd+(t===1||D9.aiBoth?TUNING.df.ai.gkCd:0);}
function gkStep(p){                                         // true = the keeper is charging this tick; false = normal keeper logic (saves, line)
  const c=D9.gk[p.team],K=TUNING.df.gk,b=ball,o=b.owner,t=p.team,d=dirOf(t),gx=ownGX(p),hv=Math.hypot(b.vx,b.vy);
  c.t+=DT;
  const shot=!o&&b.last&&b.last.team!==t&&-d*b.vx>140&&(b.pmode==='shot'||hv>300);   // shot on its way: the normal save logic (dive) takes over from where he stands
  if(S.mode!=='play'||S.rs||c.t>K.tmax||p.stun>0||p.dive>0||o===p||(o&&(o.team===t||o.gk))||shot||(!o&&Math.abs(b.x-gx)>K.range+60)){gkEnd(c,t);return false;}
  let tx,ty;
  if(o){
    const dd=Math.hypot(o.x-p.x,o.y-p.y);
    if(dd<K.smother&&p.tcd<=0&&b.protect<=0){               // grab the ball off his feet
      p.tcd=0.8;
      if(o.skill>0){p.stun=0.7;act8('gk','dummied');}       // skill move: beaten
      else if(Math.random()<0.3+0.4*p.st.def){take(p,true);o.stun=0.4;p.freeze=0.5;D9.n.gs[t]++;act8('gk','smother');gkEnd(c,t);return true;}
      else if(Math.random()<0.08){foul(p,o,false);gkEnd(c,t);return true;}
      else{b.owner=null;registerBallContact(p);b.last=p;b.receiver=null;const a=Math.atan2(b.y-CY,b.x-gx)+rnd(-.8,.8),v=rnd(120,220);b.vx=Math.cos(a)*v;b.vy=Math.sin(a)*v;o.stun=0.35;o.kcd=0.5;act8('gk','spill');}
      return true;
    }
    tx=o.x+o.vx*0.25;ty=o.y+o.vy*0.25;
  }else{
    tx=b.x+b.vx*0.3;ty=b.y+b.vy*0.3;
    if(b.z>10){const tl=(b.vz+Math.sqrt(b.vz*b.vz+2*BALL_GRAV*b.z))/BALL_GRAV;tx=b.x+b.vx*tl*0.94;ty=b.y+b.vy*tl*0.94;}
  }
  tx=gx+d*clamp((tx-gx)*d,2,K.maxOut);ty=clamp(ty,PY0+10,PY1-10);   // never further than maxOut from his line
  p.ix=p.iy=0;goTo(p,tx,ty,true);return true;
}
function gkDecide(p,c){                                     // AI keeper: charge at a carrier running at goal, or a slow loose ball he can reach first
  if(c.cd>0||S.rs||p.stun>0||p.dive>0||ball.owner===p)return;
  const K=TUNING.df.ai,b=ball,o=b.owner,gx=ownGX(p),d=dirOf(p.team);let rate=0;
  if(o&&o.team!==p.team&&!o.gk){const dd=Math.hypot(o.x-p.x,o.y-p.y);if(Math.abs(o.x-gx)<250&&Math.abs(o.y-CY)<170&&dd>45&&dd<230&&-d*o.vx>15)rate=K.gk;}
  else if(!o&&Math.hypot(b.vx,b.vy)<220&&Math.abs(b.x-gx)<260&&Math.abs(b.y-CY)<220&&!(b.last&&b.last.team===p.team)&&firstTo(p,b.x,b.y))rate=K.gk*0.6;
  if(rate&&Math.random()<DT*rate*dk9(p.team))gkCharge(p.team,true);
}
const _gk9=aiGK;aiGK=function(p){
  const c=D9.gk[p.team];
  if(!c.on&&(p.team===1||D9.aiBoth)&&S.mode==='play')gkDecide(p,c);
  if(c.on&&gkStep(p))return;
  _gk9(p);
};
/* --- gesture mapping (defending) --- */
function defAct(ev){
  const i=ev.btn,k=ev.kind,q=GS.s[i];
  if(i===3){if(k==='tap')I.tackle=true;return;}              // tap = stand-up tackle; hold = auto sprint + tackle (see humanAct)
  if(i===2){if(k==='tap'||k==='hold')defSwitch(-1);else if(k==='swipe')defSwitch(ev.dir);return;}
  if(i===1){if(!ctrl)return;humanSlide(ctrl,k==='swipe'?ev.dir:-1);return;}
  if(i===0){
    if(k==='swipe'){if(card(q)==='U')gkCharge(0,false);return;}   // other swipe directions do nothing (no accidental toggles)
    if(k==='hold'){q.act='press2h';return;}                  // a slow tap: decided on release (or a late swipe up)
    togglePress2();
  }
}
function crossBall(p){
  const t=p.team,d=dirOf(t),gx=d>0?PX1:PX0;let tg=null,bd=1e9;
  for(let i=t*11+1;i<t*11+11;i++){const q=P[i];if(q.out||q===p||q.gk)continue;
    if(Math.abs(gx-q.x)<260&&Math.abs(q.y-CY)<170){const dd=Math.hypot(q.x-p.x,q.y-p.y);if(dd<bd){bd=dd;tg=q;}}}
  if(!tg)tg={x:gx-d*40,y:CY+d*30,vx:0,vy:0};
  doPass(p,tg,Math.abs(gx-p.x)>160?'lob':'thru');pop8('CROSSED');
}
const _ga9=gestureAct;gestureAct=function(ev){if(!GS.att){defAct(ev);return;}_ga9(ev);};
const _gaX=gestureAct;gestureAct=function(ev){
  if(GS.att&&ev.btn===1&&ev.kind==='double'&&ctrl&&ball.owner===ctrl){
    const d=dirOf(ctrl.team),own=d>0?PX0:PX1;
    if(Math.abs(ctrl.x-own)<70&&Math.abs(ctrl.y-CY)<250){crossBall(ctrl);return;}
  }
  _gaX(ev);
};
const _ge9=gEnd;gEnd=function(i,cancel){const q=GS.s[i];if(i===0&&q.act==='press2h'&&!cancel&&!GS.att)togglePress2();_ge9(i,cancel);};
const _ha9=humanAct;humanAct=function(p){
  if(p.sd){p.ix=p.iy=0;p.sp=false;D9.auto=false;return;}
  _ha9(p);
  const q=GS.s[3];D9.auto=false;
  if(!GS.att&&q.on&&q.act==='sprtack'&&S.mode==='play'&&!(S.rs&&S.rs.p===p)){D9.auto=true;autoDef(p);}
};
const _sk9=setupKickoff;setupKickoff=function(t){_sk9(t);reset9();};
const _u9=update;update=function(){tick9();_u9();};
/* --- indicators: ring on the second presser, keeper-charge icon, button overlays --- */
function gkIcon(x,y,r){
  ctx.fillStyle='#ff7a1a';ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(.8,r*.16);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.stroke();
  ctx.lineWidth=Math.max(1,r*.22);ctx.lineCap='round';ctx.lineJoin='round';
  for(const k of [-.1,.45]){ctx.beginPath();ctx.moveTo(x-r*.5,y+r*(k+.2));ctx.lineTo(x,y+r*(k-.3));ctx.lineTo(x+r*.5,y+r*(k+.2));ctx.stroke();}
  ctx.lineCap='butt';
}
const _dp9=drawPlayer;drawPlayer=function(p,a){
  _dp9(p,a);
  const pr=D9.pp[p.team]===p,gk=p.gk&&D9.gk[p.team].on;if(!pr&&!gk)return;
  const x=p.px+(p.x-p.px)*a,y=p.py+(p.y-p.py)*a;
  if(pr){ctx.save();ctx.strokeStyle='#ff8a1f';ctx.lineWidth=1.8;ctx.setLineDash([4,3]);ctx.lineDashOffset=-S.t*18;ctx.beginPath();ctx.ellipse(x,y+1,13,10,0,0,TAU);ctx.stroke();ctx.restore();}
  if(gk)gkIcon(x,y-24+Math.sin(S.t*8)*1.2,5.2);
};
const _dp39=drawPlayer3;drawPlayer3=function(p,a,markersOnly=false){
  _dp39(p,a,markersOnly);
  const pr=D9.pp[p.team]===p,gk=p.gk&&D9.gk[p.team].on;if(!pr&&!gk)return;
  const x=p.px+(p.x-p.px)*a,y=p.py+(p.y-p.py)*a;pj(x,y,0);const s=V.s,sx=V.sx,sy=V.sy;
  if(pr){ctx.save();ctx.strokeStyle='#ff8a1f';ctx.lineWidth=Math.max(1,s*.9);ctx.setLineDash([4,3]);ctx.lineDashOffset=-S.t*18;ctx.beginPath();ctx.ellipse(sx,sy,13*s,4.6*s,0,0,TAU);ctx.stroke();ctx.restore();}
  if(gk)gkIcon(sx,sy-40*s+Math.sin(S.t*8)*1.2,Math.max(7,5.5*s));
};
const _r9=ring8;ring8=function(i,q,c,r){
  _r9(i,q,c,r);
  if(GS.att)return;
  if(i===0){
    if(D9.on){ctx.strokeStyle='#ff8a1f';ctx.lineWidth=4;ctx.beginPath();ctx.arc(c.x,c.y,r+5,0,TAU);ctx.stroke();txt('ON',c.x,c.y+r*.62,r*.26,'#ffb347',800);}
    if(D9.gk[0].on)gkIcon(c.x+r*.72,c.y-r*.72,r*.3);
  }
  if(i===1&&ctrl&&ctrl.sdc>0){const K=TUNING.df.sl;ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(c.x,c.y,r+5,-Math.PI/2,-Math.PI/2+clamp(ctrl.sdc/(K.cd+K.dur),0,1)*TAU);ctx.stroke();}
  if(i===3&&D9.auto){ctx.strokeStyle='rgba(255,90,60,'+(0.6+0.4*Math.sin(S.t*14))+')';ctx.lineWidth=4;ctx.beginPath();ctx.arc(c.x,c.y,r+10,0,TAU);ctx.stroke();txt('AUTO',c.x,c.y+r*.66,r*.24,'#ffb0a0',800);}
};
const _h9=hint8;hint8=function(i,q,c,R,as,cur){
  if(GS.att){_h9(i,q,c,R,as,cur);return;}
  if(cur<0)return;
  const L=i===1?'SLIDE':i===2?'SWITCH':i===0&&cur===0?'KEEPER CHARGE':'';if(!L)return;
  txt(L,c.x+GDX[cur]*(R+as*4.6),c.y+GDY[cur]*(R+as*4.6)-(GDY[cur]>0.5?0:as*0.3),as*2.3,'#ffe600',800);
};


/* ===================== 16. STAGE 9b: pass receivers run onto the ball and take it ===================== */
TUNING.rcv={auto:1,stick:.3,r:19,bonus:9,hot:80,lead:.96,swRange:380};   // auto-run on/off, stick size that gives you control back, pick-up radius (was 15), priority bonus in a 50/50, extra speed a receiver can still control, intercept safety, auto-switch range
const rcvOn=()=>S.mode==='play'&&!ball.owner&&ball.receiver&&!ball.receiver.gk&&!ball.receiver.out&&(ball.pmode==='pass'||ball.pmode==='thru'||ball.pmode==='lob');
function rcvPoint(p){                                      // earliest point on the ball's path this player can reach (ground balls use drag, lobs use the landing spot)
  const b=ball,spd=RUN*(0.9+0.2*p.st.pace)*SPRINT*TUNING.rcv.lead;
  let x=b.x,y=b.y,vx=b.vx,vy=b.vy;
  if(b.z>12||b.vz>40){const tl=(b.vz+Math.sqrt(b.vz*b.vz+2*BALL_GRAV*b.z))/BALL_GRAV;x=b.x+b.vx*tl*0.94;y=b.y+b.vy*tl*0.94;return[clamp(x,PX0,PX1),clamp(y,PY0,PY1)];}
  for(let k=1;k<=150;k++){
    vx*=FG;vy*=FG;x+=vx*DT;y+=vy*DT;
    if(Math.hypot(x-p.x,y-p.y)<=spd*k*DT+8)return[clamp(x,PX0+6,PX1-6),clamp(y,PY0+6,PY1-6)];   // he gets there first
    if(vx*vx+vy*vy<9)break;
  }
  return[clamp(x,PX0+6,PX1-6),clamp(y,PY0+6,PY1-6)];        // cannot beat the ball: run to where it stops
}
function rcvRun(p){const q=rcvPoint(p),d=Math.hypot(q[0]-p.x,q[1]-p.y);p.ix=p.iy=0;if(d>3){const m=Math.min(1,d/10);p.ix=(q[0]-p.x)/d*m;p.iy=(q[1]-p.y)/d*m;}p.sp=d>35&&p.stam>0.12;}
const _aoff10=aiOff;aiOff=function(p){if(rcvOn()&&ball.receiver===p){rcvRun(p);return;}_aoff10(p);};   // AI receivers
const _ha10=humanAct;humanAct=function(p){                 // human receiver: auto-run unless the stick is in use
  _ha10(p);
  if(TUNING.rcv.auto&&p===ctrl&&rcvOn()&&ball.receiver===p&&!p.sd&&!W8.p&&Math.hypot(I.mx,I.my)<TUNING.rcv.stick&&!(S.rs&&S.rs.p===p)&&!D9.auto)rcvRun(p);
};
const _as10=autoSwitch;autoSwitch=function(){              // a pass from an AI team-mate: take over the receiver
  const r=ball.receiver;
  if(TUNING.rcv.auto&&rcvOn()&&r.team===0&&r!==ctrl&&Math.hypot(r.x-ball.x,r.y-ball.y)<TUNING.rcv.swRange&&!(D9.lock&&ctrl===D9.lock)){ctrl=r;S.swCd=0.5;return;}
  _as10();
};

/* ===================== 17. STAGE 10: eFootball / FC Mobile extras ===================== */
const D10={assist:{pass:'manual',shot:'manual'},preset:'classic',op:0.55,joy:[0.15,0.7],btns:null,haptic:1,swAnywhere:0,tut:0};
Object.assign(G,D10);
const _rs10=resetSave;resetSave=function(){_rs10();Object.assign(G,D10);syncLayout();save();};
function fixControlSettings(){
  const presets=['classic','fc','efoot'];
  if(!presets.includes(G.preset)){G.preset='classic';G.btns=null;}
  G.op=Number.isFinite(G.op)?clamp(G.op,.2,1):.55;
  if(!Array.isArray(G.joy)||G.joy.length!==2||G.joy.some(v=>!Number.isFinite(v)))G.joy=[.15,.7];
  else G.joy=[clamp(G.joy[0],.06,.94),clamp(G.joy[1],.1,.9)];
  if(G.btns!==null&&G.btns!==undefined){
    if(!Array.isArray(G.btns)||G.btns.length!==4||G.btns.some(a=>!Array.isArray(a)||a.length!==3||a.some(v=>!Number.isFinite(v)))){
      G.btns=null;G.preset='classic';
    }else G.btns=G.btns.map(a=>[clamp(a[0],-30,30),clamp(a[1],-30,30),clamp(a[2],.6,2.2)]);
  }else if(G.preset!=='classic'&&PRESETS[G.preset])G.btns=PRESETS[G.preset].map(a=>[a[0],a[1],a[2]]);
  G.haptic=G.haptic===0?0:1;G.swAnywhere=G.swAnywhere===1?1:0;G.tut=G.tut===1?1:0;
}
const _ld10=load;load=function(){_ld10();fixControlSettings();syncLayout();};

const buzz=ms=>{if(!G.haptic||!navigator.vibrate)return;try{navigator.vibrate(typeof ms==='number'&&ms>0?[0,ms,28]:[0,18]);}catch(e){}};

/* ---------- control presets & layout ---------- */
const PRESETS={
  classic:null,
  fc:[[-0.96,0.9,1.0],[1.04,0.88,1.14],[0.7,-0.86,0.95],[1.08,-0.6,1.14]],
  efoot:[[-0.84,0.94,1.06],[0.98,0.78,1.08],[0.62,-0.94,1.0],[1.12,-0.72,1.16]]
};
function applyPreset(k){
  G.preset=k;
  if(k==='classic'){G.btns=null;G.joy=[0.15,0.7];}
  else{G.btns=PRESETS[k].map(x=>[x[0],x[1],x[2]]);}
  syncLayout();save();
}
function defaultBTN(i){return{id:i,dx:TUNING.btnRight+(i&1?-1:1)*TUNING.btnOff,dy:TUNING.btnBottom+(i<2?1:-1)*TUNING.btnOff,m:TUNING.btnR};}
function syncLayout(){
  if(G.btns){for(let i=0;i<4;i++){const c=G.btns[i];if(c)Object.assign(BTN[i],{id:i,dx:c[0],dy:c[1],m:c[2]});}}
  else{for(let i=0;i<4;i++)Object.assign(BTN[i],defaultBTN(i));}
}
const _dc10=drawControls;drawControls=function(){const p=ctx.globalAlpha;ctx.globalAlpha=clamp(G.op,0.2,1);_dc10();ctx.globalAlpha=p;};

/* ---------- haptics on events ---------- */
const _kk10=kick;kick=function(){buzz(20);return _kk10.apply(this,arguments);};
const _gl10=goal;goal=function(dr){_gl10(dr);buzz([0,40,90,40]);};
const _ws10=whistleStop;whistleStop=function(){buzz(15);return _ws10.apply(this,arguments);};

/* ---------- assisted pass / shot + perfect timing ---------- */
let __perfectShot=false;
const _sh10=doShoot;doShoot=function(p,power,ang,lift,em){
  if(__perfectShot){power=Math.min(1,power*1.12);em=(em||0)*0.7;__perfectShot=false;}
  const st=G.assist.shot;
  if(st!=='manual'&&p===ctrl&&ball.owner===p){
    const d=dirOf(p.team),gx=d>0?PX1:PX0,gk=GK[1-p.team];
    const ty=gk.y>CY+4?CY-GOALH*0.5:gk.y<CY-4?CY+GOALH*0.5:CY,ga=Math.atan2(ty-p.y,gx-p.x);
    ang=ga+(ang-ga)*(st==='assisted'?0.35:0.75);
    if(st==='assisted')em=(em||0)*0.6;
  }
  _sh10(p,power,ang,lift,em);
};
const _sg10=shootGo;shootGo=function(p,rs){
  const c=clamp(I.chargeT/0.85,0,1);
  __perfectShot=c>=0.66&&c<=0.86;
  if(__perfectShot)pop8('PERFECT TIMING!');
  if(train.on&&train.drill===1)train.count++;
  _sg10(p,rs);
};
const _hp10=humanPass;humanPass=function(p,mode){
  const ang=Math.hypot(I.mx,I.my)>0.25?Math.atan2(I.my,I.mx):p.face;
  const target=bestTarget(p,ang,mode),t=target||{x:p.x+Math.cos(ang)*160,y:p.y+Math.sin(ang)*160,vx:0,vy:0};
  if(target){
    const targetAngle=Math.atan2(target.y-p.y,target.x-p.x);
    const strength=G.assist.pass==='assisted'?1:G.assist.pass==='semi'?.5:0;
    if(strength>0)p.face=ang+angd(targetAngle,ang)*strength;
  }
  doPass(p,t,mode);
};
const _dp10=doPass;doPass=function(p,t,mode){_dp10(p,t,mode);if(t)S.passRingT=t,S.passRingT2=0.6;if(train.on&&train.drill===0)train.count++;else if(train.on&&train.drill===2&&mode==='thru')train.count++;};
const _tt10=tryTackle;tryTackle=function(p,c){const t0=p.tcd,r=_tt10(p,c);if(r&&p.tcd>t0+0.5){buzz(26);pop8('TIMED TACKLE');}if(r&&train.on&&train.drill===3)train.count++;return r;};
const _tk10=take;take=function(p,byHand=false){
  const incoming=p===ctrl&&!p.gk&&ball.receiver===p&&ball.pmode&&(I.sprint||I.pass||I.thru);
  _tk10(p,byHand);
  if(p.gk&&p.team===0&&!S.prac)ctrl=p;
  if(incoming){pop8('TIMED TOUCH');buzz(16);}
};

/* ---------- switch indicator (air ball) + keeper control ---------- */
const _sw10=switchPlayer;switchPlayer=function(){
  const b=ball,gk=GK[0];
  if(b.owner&&b.owner.team===0&&b.owner.gk){ctrl=b.owner;S.swCd=0.9;return;}
  if(!b.owner&&gk.team===0&&Math.hypot(gk.x-b.x,gk.y-b.y)<90){ctrl=gk;S.swCd=0.9;return;}
  _sw10();
};
let _up10=update;update=function(){
  _up10();
  if(S.mode!=='play')return;
  const b=ball;
  // air-ball switch target
  if(b.z>0&&!b.owner){let best=null,bd=1e9;for(let i=0;i<11;i++){const q=P[i];if(q.gk||q.out||q===ctrl)continue;const d=Math.hypot(q.x-b.x,q.y-b.y);if(d<bd){bd=d;best=q;}}S.airTarget=best||null;}
  else S.airTarget=null;
  if(S.passRingT2>0)S.passRingT2-=DT;else S.passRingT=null;
  // keeper grab
  if(ctrl&&!ctrl.gk&&b.owner&&b.owner.gk&&b.owner.team===0)ctrl=b.owner;
  else if(!b.owner&&GK[0].team===0&&Math.hypot(GK[0].x-b.x,GK[0].y-b.y)<80&&b.x<PX0+220)ctrl=GK[0];
  // set-piece taker control
  if(S.rs&&S.rs.p&&S.rs.p.team===0)ctrl=S.rs.p;
};

/* ---------- first-time hints ---------- */
if(G.tut===0)S.tutT=0;
const _upT=update;update=function(){
  _upT();
  if(S.mode==='play'&&G.tut===0){
    if(S.tutT===undefined)S.tutT=0;
    S.tutT+=DT;
    if(S.tutT>12){G.tut=1;save();}
  }
};

/* ---------- training mode ---------- */
const TRAIN=[
  {n:'PASS',p:'Use PASS to find a team-mate. Hold to charge power.',need:3},
  {n:'SHOOT',p:'Hold SHOOT, release inside the green ring for PERFECT timing.',need:3},
  {n:'THROUGH BALL',p:'Swipe THROUGH toward a runner.',need:2},
  {n:'TACKLE',p:'Time SLIDE to win the ball.',need:2}
];
const train={on:false,drill:-1,count:0};

/* ---------- advanced settings menu (added to SETTINGS) ---------- */
const _set10=MS.set;MS.set=function(){_set10();ubtn(W*.3,H*.9,W*.4,H*.09,'ADVANCED',()=>go('adv'),0);};
MS.adv=function(){
  mt('ADVANCED');mbk();
  const T=(i,label,val,fn)=>ubtn(W*.08,H*(.22+i*.09),W*.5,H*.07,label+'  '+val,fn,0);
  ubtn(W*.62,H*.22,W*.32,H*.07,'ASSIST',()=>go('assist'),Y);
  ubtn(W*.62,H*.31,W*.32,H*.07,'CONTROLS',()=>go('preset'),Y);
  ubtn(W*.62,H*.40,W*.32,H*.07,'LAYOUT EDITOR',()=>go('layout'),Y);
  ubtn(W*.62,H*.49,W*.32,H*.07,'TRAINING',()=>go('train'),Y);
  ubtn(W*.62,H*.58,W*.32,H*.07,'CHEAT SHEET',()=>go('cheat'),Y);
  txt('HAPTICS',W*.08,H*.66,H*.04,'#fff',800);seg(W*.3,H*.62,W*.3,H*.07,['ON','OFF'],G.haptic?0:1,i=>{G.haptic=i?0:1;save();});
  txt('SWIPE-ANYWHERE',W*.08,H*.77,H*.04,'#fff',800);seg(W*.3,H*.73,W*.3,H*.07,['ON','OFF'],G.swAnywhere?0:1,i=>{G.swAnywhere=i?0:1;save();});
  txt('FIRST-TIME HINTS',W*.08,H*.88,H*.04,'#fff',800);ubtn(W*.3,H*.84,W*.3,H*.07,G.tut?'ON':'OFF (TAP)',()=>{G.tut=0;S.tutT=0;save();},0);
};
MS.assist=function(){
  mt('PASS / SHOT ASSIST');mbk();
  const L=['ASSISTED','SEMI','MANUAL'];
  txt('PASS',W*.15,H*.3,H*.045,'#fff',800);
  seg(W*.3,H*.26,W*.64,H*.12,L,{assisted:0,semi:1,manual:2}[G.assist.pass],i=>{G.assist.pass=['assisted','semi','manual'][i];save();});
  txt('SHOT',W*.15,H*.55,H*.045,'#fff',800);
  seg(W*.3,H*.51,W*.64,H*.12,L,{assisted:0,semi:1,manual:2}[G.assist.shot],i=>{G.assist.shot=['assisted','semi','manual'][i];save();});
  mtx('Assisted auto-aims toward goal / the best teammate. Manual uses the stick exactly.',.82,'#9fb0c0',.032);
};
MS.preset=function(){
  mt('CONTROL PRESET');mbk();
  ['CLASSIC','FC STYLE','EFOOTBALL STYLE'].forEach((n,i)=>{
    ubtn(W*.1,H*(.3+i*.13),W*.8,H*.11,n,()=>{applyPreset(['classic','fc','efoot'][i]);},G.preset===['classic','fc','efoot'][i]?Y:0);
  });
  mtx('Changes the position and size of the action buttons.',.8,'#9fb0c0',.032);
};
let layoutDrag=null,layoutSel=0;
MS.layout=function(){
  mt('LAYOUT EDITOR');mbk();
  const u=H*0.09,lab=GLAB[GS.att?'att':'def'];
  for(let i=0;i<4;i++){
    const c=BTN[i],p=btnPos(c),x=p.x,y=p.y,r=p.r;
    ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
    if(i===layoutSel||(layoutDrag&&layoutDrag.i===i)){ctx.strokeStyle='#ffe600';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,r+6,0,TAU);ctx.stroke();}
    txt(lab[i],x,y,r*0.3,'#fff',700);
  }
  txt('DRAG BUTTONS',W*.5,H*.12,H*.04,'#ffe600',800);
  ubtn(W*.06,H*.2,W*.28,H*.08,'S',()=>{const L=G.btns||BTN.map(b=>[b.dx,b.dy,b.m]);L.forEach(a=>a[2]=Math.max(0.7,a[2]-0.15));G.btns=L;syncLayout();save();});
  ubtn(W*.38,H*.2,W*.28,H*.08,'M',()=>{const L=G.btns||BTN.map(b=>[b.dx,b.dy,b.m]);L.forEach(a=>a[2]=1);G.btns=L;syncLayout();save();});
  ubtn(W*.7,H*.2,W*.28,H*.08,'L',()=>{const L=G.btns||BTN.map(b=>[b.dx,b.dy,b.m]);L.forEach(a=>a[2]=Math.min(1.4,a[2]+0.15));G.btns=L;syncLayout();save();});
  txt('OPACITY',W*.08,H*.34,H*.04,'#fff',800);
  seg(W*.2,H*.3,W*.5,H*.08,['LOW','MID','HIGH'],G.op<0.4?0:G.op<0.75?1:2,i=>{G.op=[0.35,0.55,0.85][i];save();});
  txt('JOYSTICK',W*.08,H*.46,H*.04,'#fff',800);
  ubtn(W*.2,H*.42,W*.12,H*.08,'◀',()=>{G.joy[0]=Math.max(0.06,G.joy[0]-0.05);save();});
  ubtn(W*.34,H*.42,W*.12,H*.08,'▶',()=>{G.joy[0]=Math.min(0.94,G.joy[0]+0.05);save();});
  ubtn(W*.48,H*.42,W*.12,H*.08,'▲',()=>{G.joy[1]=Math.max(0.1,G.joy[1]-0.06);save();});
  ubtn(W*.62,H*.42,W*.12,H*.08,'▼',()=>{G.joy[1]=Math.min(0.9,G.joy[1]+0.06);save();});
  ubtn(W*.1,H*.92,W*.4,H*.07,'RESET LAYOUT',()=>{G.btns=null;G.joy=[0.15,0.7];syncLayout();save();},'rgba(255,60,40,.4)');
  ubtn(W*.55,H*.92,W*.4,H*.07,'DONE',back,Y);
};
addEventListener('pointerdown',e=>{if(M.scr==='layout'&&S.mode==='menu'){for(let i=0;i<4;i++){const c=BTN[i],p=btnPos(c),x=p.x,y=p.y,r=p.r;if(Math.hypot(e.clientX-x,e.clientY-y)<r*1.7){layoutDrag={i,x,y};layoutSel=i;break;}}}});
addEventListener('pointermove',e=>{if(layoutDrag){const u=H*0.09,L=G.btns||BTN.map(b=>[b.dx,b.dy,b.m]),r=L[layoutDrag.i][2]*u,pad=Math.min(r*1.5+8,Math.min(W,H)*0.42),x=clamp(e.clientX,pad,W-pad),y=clamp(e.clientY,pad,H-pad);L[layoutDrag.i]=[(W-x)/u,(H-y)/u,L[layoutDrag.i][2]];G.btns=L;syncLayout();layoutDrag.x=x;layoutDrag.y=y;save();}});
addEventListener('pointerup',()=>{layoutDrag=null;});

/* ---------- cheat sheet + training screens ---------- */
MS.cheat=function(){
  mt('CONTROLS');mbk();
  const rows=[
    ['LEFT SIDE / JOYSTICK','move, aim, sprint'],
    ['SHOOT','hold to charge, release to fire'],
    ['PASS','tap / swipe for variants'],
    ['THROUGH','tap / swipe for through balls'],
    ['SPRINT','hold; swipe = skill move'],
    ['SWITCH','tap during play; slide to tackle'],
    ['FAKE SHOT','swipe back while charging shoot']
  ];
  rows.forEach((r,i)=>mtx((i+1)+'. '+r[0]+'  —  '+r[1],.3+i*.07,'#dfe7ee',.034));
};
MS.train=function(){
  mt('TRAINING');mbk();
  if(train.on){
    const d=TRAIN[train.drill];
    mtx('DRILL: '+d.n, .28,'#ffe600',.05);
    mtx(d.p,.42,'#fff',.035);
    mtx('Success: '+train.count+' / '+d.need,.58,'#5cff8a',.05);
    ubtn(W*.3,H*.78,W*.4,H*.1,train.count>=d.need?'NEXT DRILL':'END TRAINING',()=>{train.on=false;train.count=0;M.scr='train';},Y);
    return;
  }
  TRAIN.forEach((d,i)=>ubtn(W*.1,H*(.24+i*.12),W*.8,H*.1,d.n,()=>{train.on=true;train.drill=i;train.count=0;pre('prac');},0));
  mtx('Complete each drill. The prompt shows what to do.',.9,'#9fb0c0',.03);
};

/* ---------- stage 10 HUD overlay (hints / training) ---------- */
const _r10=render;render=function(a){_r10(a);ctx.setTransform(dpr,0,0,dpr,0,0);stage10Hud(a);};
function stage10Hud(){
  if(S.mode==='menu'||S.mode==='half'||S.mode==='full'||S.mode==='subs')return;
  if(train.on&&TRAIN[train.drill]){
    const d=TRAIN[train.drill],p=Math.min(1,train.count/d.need);
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(W*.18,H*.02,W*.64,H*.11);
    txt(d.p,W/2,H*.055,H*.022,'#fff',700);
    ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(W*.18,H*.09,W*.64,H*.018);
    ctx.fillStyle=p>=1?'#5cff8a':'#ffe600';ctx.fillRect(W*.18,H*.09,W*.64*p,H*.018);
  }
  if(G.tut===0&&S.tutT!==undefined&&S.tutT<12){
    const al=clamp((12-S.tutT)/3,0,1);
    if(al>0){ctx.globalAlpha=al;
      ctx.fillStyle='rgba(12,18,30,.82)';rr(W*.23,H*.89,W*.44,H*.08,H*.04);ctx.fill();
      fit('DRAG LEFT HALF to move · tap/hold buttons to act',W*.45,H*.93,W*.4,H*.03,'#fff');
      ctx.globalAlpha=1;}
  }
}

/* swipe-anywhere right side (FC Mobile style) */
{
  let __swP=0,__sw=null;
  addEventListener('pointerdown',e=>{if(S.mode!=='play'||e.clientX<=W*0.5||G.swAnywhere!==1)return;if(btnAt(e.clientX,e.clientY))return;
    const fy=e.clientY/H,slot=fy<0.32?1:fy<0.62?0:fy<0.82?2:3;
    __swP++;press(slot,'sw'+__swP);__sw={slot,pid:'sw'+__swP};});
  addEventListener('pointermove',e=>{if(__sw)gMove(__sw.pid,e.clientX,e.clientY);});
  addEventListener('pointerup',e=>{if(__sw){release(__sw.pid,false);__sw=null;}});
}
