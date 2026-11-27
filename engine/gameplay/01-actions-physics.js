'use strict';
/* ===================== 4. ACTIONS (kick, pass, shoot, tackle) ===================== */
function clearOff(){for(const q of P)q.off=false;ball.ind=false;ball.refContact=null;}   // any new touch ends offside / indirect-kick status
function registerBallContact(p){                                  // shared post-contact lock for every loose-ball contact path
  const b=ball;
  if(p)p.kcd=Math.max(p.kcd||0,0.3);
  b.contactPickupTicks=Math.max(b.contactPickupTicks||0,8);          // 8 fixed ticks = 133 ms; independent of the match clock
}
function take(p,byHand=false){if(!p.gk||ball.gkNoHands!==p.team){ball.gkNoHands=null;ball.gkNoHandsFrom=null;}if(ball.gkReleasedBy!==p)ball.gkReleasedBy=null;ball.contactPickupTicks=0;ball.owner=p;ball.last=p;ball.receiver=null;ball.gkHold=0;ball.gkHoldActive=!!(p.gk&&byHand);ball.gkHoldWarned=false;ball.gkHoldShown=0;p.poss=0;p.force=false;clearOff();}
function markOff(p){                                       // snapshot the second-last opponent at the exact moment of the team-mate's touch
  clearOff();const t=p.team,d=dirOf(t),line=PITCH11Law.secondLastOpponentPosition(P,t,d);
  if(line===null)return;
  for(let i=t*11;i<t*11+11;i++){
    const q=P[i];
    if(q!==p&&!q.out&&PITCH11Law.isOffsidePosition({
      attackerX:q.x,ballX:ball.x,secondLastOpponentX:line,direction:d,halfway:CX
    }))q.off=true;
  }
}
function applyOffsideTouch(p,previousLast,deliberatePlay,deliberateSave){
  const action=PITCH11Law.offsideTouchAction({
    sameTeam:!!previousLast&&previousLast.team===p.team,
    deliberatePlay:!!deliberatePlay,deliberateSave:!!deliberateSave
  });
  if(action==='recalculate')markOff(p);
  else if(action==='reset')clearOff();
  else ball.ind=false;
}
function kick(p,vx,vy,vz,spin,rcv,tx,ty,mode){
  const b=ball,a=Math.atan2(vy,vx),rs=S.rs;
  // The offside snapshot uses the ball's actual first/last point of contact, not its previous frame position.
  b.x=p.x+Math.cos(a)*9;b.y=p.y+Math.sin(a)*9;
  if(rs&&(rs.kind==='throw'||rs.kind==='corner'||rs.kind==='gk'))clearOff();else markOff(p);
  if(rs&&(rs.ind||rs.kind==='throw'||rs.kind==='drop'))b.ind=true; // indirect kicks, throw-ins and dropped balls cannot score untouched
  b.protect=0;b.gkHold=0;b.gkReleasedBy=PITCH11Law.goalkeeperReleaseMarker(p,b.gkHoldActive);b.gkHoldActive=false;b.gkHoldWarned=false;b.gkHoldShown=0;
  b.gkNoHands=p.gk?null:(rcv&&rcv.gk&&rcv.team===p.team?p.team:null);b.gkNoHandsFrom=b.gkNoHands===null?null:p;
  b.owner=null;b.last=p;b.vx=vx;b.vy=vy;b.vz=vz;b.spin=spin||0;b.receiver=rcv||null;b.tx=tx||0;b.ty=ty||0;b.pmode=mode||'';
  p.face=a;p.kcd=(S.so&&S.so.live&&p===S.so.shooter)?0:0.35;p.poss=0;
  if(S.so&&S.so.live&&p===S.so.shooter)S.so.kickAt=S.so.t;
}
function doShoot(p,power,ang,lift,em){
  const pen=!!(S.rs&&S.rs.kind==='pen');
  ang+=rnd(-.5,.5)*(0.06+power*0.16)*(1.5-p.st.shoot)*(1+0.5*p.fat)*(em||1)*SHV.acc*(1+clamp((45-nearestOpp(p))/45,0,1)*0.7)*(1+Math.max(0,power-0.85)*1.6);   // harder, pressured or over-hit = less accurate
  const v=SHV.vf>0?SHV.vf:(175+165*power)*(0.9+0.2*p.st.shoot)*SHV.v,spin=SHV.sp!==null?SHV.sp:clamp(p.turn*0.2,-1.2,1.2)*(0.4+power*0.6); // turning while shooting bends the ball
  kick(p,Math.cos(ang)*v,Math.sin(ang)*v,SHV.vz>=0?SHV.vz:Math.min(105,4+power*power*48*rnd(0.5,1.2)+(lift||0)),spin,null,0,0,'shot');
  if(power>0.75)FX.shake=Math.max(FX.shake,3+power*4);
  ball.shotId++;ball.pen=pen;
  SHV.acc=SHV.v=1;SHV.vf=0;SHV.vz=-1;SHV.sp=null;   // variant parameters apply to one shot only
}
function doPass(p,t,mode){
  const d=dirOf(p.team);
  // estimate transit time (used for both lead and ball speed)
  let T=clamp(0.55+Math.hypot(t.x-p.x,t.y-p.y)/520,0.55,1.35);
  if(mode==='lob')T=clamp(Math.hypot(t.x-p.x,t.y-p.y)/250,0.8,1.5);
  const R=(mode==='thru'?0.75:mode==='lob'?0.5:0.45);
  let tx=t.x+t.vx*T*R,ty=t.y+t.vy*T*R;
  if(mode==='thru'){tx+=d*42;ty+=(CY-t.y)*0.10;}
  tx=clamp(tx,PX0+8,PX1-8);ty=clamp(ty,PY0+8,PY1-8);
  const dx=tx-p.x,dy=ty-p.y,dist=Math.hypot(dx,dy)||1;
  let v,vz=0;
  if(mode==='lob'){vz=BALL_GRAV*T/2;v=KA*dist/Math.max(0.08,1-Math.exp(-KA*T))*1.04;}
  else{
    T=clamp(dist/520+0.5,0.5,1.3);
    const denom=1-Math.exp(-KG*T);
    v=clamp(KG*dist/Math.max(0.04,denom)*(mode==='thru'?1.2:1.0)+12,150,400)*PSV.v;
  }
  const real=t.team!==undefined;
  const ps=p.st.pass,a0=Math.atan2(dy,dx)+rnd(-1,1)*(1.35-ps)*0.08*(0.4+dist/400)*(1+0.5*p.fat)*PSV.err*(1+passPress(p))*(p.team?1.4:1)-PSV.curl*0.5,vv=v*(1+rnd(-1,1)*(1-ps)*0.08);
  kick(p,Math.cos(a0)*vv,Math.sin(a0)*vv,vz,PSV.curl*3,real?t:null,tx,ty,mode);
  PSV.thr=0;PSV.v=1;PSV.err=1;PSV.curl=0;
  if(real&&p===ctrl&&t.team===p.team&&!t.gk){if(G.rf.pgo&&mode!=='lob')passGo(p,t);ctrl=t;S.swCd=0.6;I.pass=I.thru=I.lob=I.shootUp=I.skill=false;}   // the button press belonged to the passer: the new controlled player must not see it (it armed an automatic first-time pass)
}
function laneBlock(p,t){                                   // 1 if an opponent stands on the pass line
  const ax=p.x,ay=p.y,bx=t.x-ax,by=t.y-ay,L=bx*bx+by*by||1,o=1-p.team;
  for(let i=o*11;i<o*11+11;i++){
    const q=P[i],u=clamp(((q.x-ax)*bx+(q.y-ay)*by)/L,0,1),dx=ax+bx*u-q.x,dy=ay+by*u-q.y;
    if(dx*dx+dy*dy<196&&u>0.05&&u<0.98)return 1;
  }
  return 0;
}
function nearestOpp(t){let m=1e9;const o=1-t.team;for(let i=o*11;i<o*11+11;i++)m=Math.min(m,Math.hypot(P[i].x-t.x,P[i].y-t.y));return m;}
function bestTarget(p,ang,mode,free){                    // human pass: best teammate in the aimed cone (width set by PASS ASSIST)
  let best=null,bs=-9;const cw=PAS_CW[G.rf.pas===undefined?1:G.rf.pas]*(free?1.8:1);
  for(let i=p.team*11;i<p.team*11+11;i++){const t=P[i];if(t===p||t.out)continue;const sc=passScore(p,t,ang,mode,cw);if(sc>bs){bs=sc;best=t;}}
  return bs>-5?best:null;
}
function humanPass(p,mode){
  const ang=Math.hypot(I.mx,I.my)>0.25?Math.atan2(I.my,I.mx):p.face;
  const t=bestTarget(p,ang,mode,Math.hypot(I.mx,I.my)<=0.25&&G.rf.pas===2);
  doPass(p,t||{x:p.x+Math.cos(ang)*160,y:p.y+Math.sin(ang)*160,vx:0,vy:0},mode); // no target: pass into space
}
function aimAng(p){                                        // always at the opponent goal; the stick only picks the spot inside the frame (penalties keep their own aim limits)
  const d=dirOf(p.team),gx=d>0?PX1:PX0,own=S.rs&&S.rs.p===p;
  if(own&&S.rs.kind==='pen')return p.face;
  const hu=p===ctrl&&Math.hypot(I.mx,I.my)>0.3,m=GOALH-6;let ty;
  if(hu){
    const a=Math.atan2(I.my,I.mx);
    if(Math.cos(a)*d>0.35)ty=clamp(p.y+Math.tan(a)*(gx-p.x),CY-m,CY+m);   // stick points at the goal: aim where that line meets the goal line
    else ty=CY+clamp(I.my,-1,1)*m;                                        // stick sideways / back: just up or down in the frame
  }else{const gk=GK[1-p.team];ty=CY+(gk.y>CY+4?-1:gk.y<CY-4?1:0)*12;}    // no stick: the side away from the keeper
  return Math.atan2(ty-p.y,gx-p.x);
}
function tryTackle(p,chance,context){
  const b=ball,o=b.owner;
  if(p.tcd>0||p.stun>0||!o||o.team===p.team||o.gk||b.protect>0)return false;
  p.tcd=0.9;p.stam=Math.max(0,p.stam-0.04);
  if(Math.hypot(b.x-p.x,b.y-p.y)>18+5*p.st.def){p.stun=0.25;return false;}  // lunged and missed
  const behind=Math.abs(angd(Math.atan2(o.y-p.y,o.x-p.x),o.face))<1;   // tackled from behind
  const win=Math.random()<clamp(chance*(p.team?0.85:1.12)*(0.6+0.8*p.st.def)*(1.35-0.7*o.st.drib)*(o.skill>0?0.35:1)*(1+(p.st.phys-o.st.phys)*0.5),0.03,0.9);
  const strictScale=G.rf&&Number.isInteger(G.rf.strict)?[.8,1,1.25][clamp(G.rf.strict,0,2)]:1;
  if(Math.random()<Math.min(.95,(0.05+(behind?0.22:0)+(p.sp?0.08:0))*(win?0.35:1)*(1.5-p.st.def)*strictScale)){foul(p,o,behind,{reckless:behind&&!!(context&&context.sprinting),attemptToPlayBall:true});return true;}
  if(win){
    o.stun=0.5;o.kcd=0.6;o.vx*=0.3;o.vy*=0.3;
    FX.hit=4;
    if(Math.random()<0.65)take(p);
    else{b.owner=null;registerBallContact(p);b.last=p;const a=Math.atan2(b.y-p.y,b.x-p.x)+rnd(-.7,.7),v=rnd(110,200);b.vx=Math.cos(a)*v;b.vy=Math.sin(a)*v;}
    return true;
  }
  p.stun=0.45;return false;
}
function humanAct(p){
  p.ix=I.mx;p.iy=I.my;p.sp=I.sprint;
  if(W8.p===p){p.ix*=0.2;p.iy*=0.2;p.sp=false;}               // shot wind-up: planted feet
  const own=ball.owner===p,rs=S.rs&&S.rs.p===p?S.rs:null;
  if(rs){                                                  // set piece: the taker stands still and only aims
    p.ix=p.iy=0;
    if(Math.hypot(I.mx,I.my)>0.3){let a=Math.atan2(I.my,I.mx);if(rs.kind==='pen'){const g=dirOf(p.team)>0?0:Math.PI;a=g+clamp(angd(a,g),-0.45,0.45);}p.face=a;}
  }
  if(I.shoot&&own)I.chargeT+=DT;
  if(I.shootUp){if(own||(I.svar==='ft'&&!ball.owner))shootGo(p,rs);I.chargeT=0;}  // stage 8: shootGo = normal shot (free kicks get lift over the wall) or a gesture variant
  if(ball.owner===p){if(I.pass||I.thru)passVar(p);else if(I.lob)humanPass(p,'lob');else if(I.skill&&!rs)skillAct(p);}
  if(I.sw){
    const o=ball.owner;
    if(o&&o.team!==p.team&&Math.hypot(ball.x-p.x,ball.y-p.y)<28)tryTackle(p,0.55);
    else if(!own)switchPlayer();
  }
  if(I.tackle){const o=ball.owner;if(o&&o.team!==p.team&&Math.hypot(ball.x-p.x,ball.y-p.y)<28)tryTackle(p,0.55);}   // stage 7 buttons
  if(I.swp&&!own)switchPlayer();
}
function skillMove(p,a,K){                                 // dodge burst: may beat nearby defenders (dribbling vs defending); tackles on you mostly fail meanwhile. K (optional) = skill-move variant {m speed x, d difficulty, r radius, t time, ok forced outcome}
  if(p.gk||p.skill>0||p.stun>0||p.dive>0||ball.owner!==p||p.stam<0.06)return false;
  if(a==null)a=p.face+(Math.random()<0.5?1:-1)*1.9;         // no stick: spin away
  p.skill=K?K.t:0.55;p.stam=Math.max(0,p.stam-0.07);
  const v=(130+90*p.st.drib)*(K?K.m:1);p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v;p.face=a;
  const o=1-p.team,rad=K?K.r:36;
  for(let i=o*11+1;i<o*11+11;i++){
    const q=P[i];if(q.out)continue;
    if(Math.hypot(q.x-p.x,q.y-p.y)<rad&&(K&&K.ok!==undefined?(K.ok&&Math.random()<0.9):Math.random()<clamp(0.45+0.9*(p.st.drib-q.st.def)-(K?K.d:0),0.1,0.85))){q.stun=0.6;q.tcd=0.5;}
  }
  return true;
}
function switchPlayer(){
  let best=null,bd=1e9;const b=ball;
  if(b.receiver&&b.receiver.team===0&&b.receiver!==ctrl&&!b.owner)best=b.receiver;
  else for(let i=0;i<11;i++){const p=P[i];if(p.gk||p.out||p===ctrl)continue;const d=Math.hypot(p.x-b.x,p.y-b.y);if(d<bd){bd=d;best=p;}}
  if(best){ctrl=best;S.swCd=0.9;}
}
function autoSwitch(){                                     // human team: control the ball carrier, else the nearest outfielder
  const o=ball.owner;
  if(o&&o.team===0){ctrl=o;return;}
  if(S.swCd>0&&ctrl)return;
  const bx=ball.x+ball.vx*0.2,by=ball.y+ball.vy*0.2;
  let best=ctrl,bd=ctrl?Math.hypot(ctrl.x-bx,ctrl.y-by)*0.8:1e9;   // 0.8 = hysteresis, avoids flicker
  for(let i=0;i<11;i++){const p=P[i];if(p.gk||p.out)continue;const d=Math.hypot(p.x-bx,p.y-by);if(d<bd){bd=d;best=p;}}
  if(best!==ctrl){ctrl=best;S.swCd=0.3;}
}

/* ===================== 5. PHYSICS ===================== */
function integrate(p){
  if(p.out)return;
  p.anim+=Math.hypot(p.vx,p.vy)*DT*0.35;
  if(p.dive>0){
    if(p.gk&&Number.isFinite(p.diveTx)&&Number.isFinite(p.diveTy)){
      const dx=p.diveTx-p.x,dy=p.diveTy-p.y,dist=Math.hypot(dx,dy),step=Math.hypot(p.vx,p.vy)*DT;
      if(dist<=step+0.05){p.x=p.diveTx;p.y=p.diveTy;p.vx=p.vy=0;}
      else if(dist>0){p.x+=dx/dist*step;p.y+=dy/dist*step;}
      clampPos(p);return;
    }
    p.x+=p.vx*DT;p.y+=p.vy*DT;clampPos(p);return;
  }  // goalkeeper dive
  const mag=Math.hypot(p.ix,p.iy),moving=mag>0.05;
  let max=(p.gk?58:RUN)*(p.gk?0.94+0.12*p.st.pace:0.9+0.2*p.st.pace)*(p.sp&&!p.winded?SPRINT:1)*(ball.owner===p?0.9+0.06*p.st.drib:1)*(p.stun>0?0.25:1)*(1-0.18*p.fat)*(0.8+0.2*Math.min(1,p.stam*4))*(p.limp?0.55:1);
  let tx=0,ty=0;
  if(moving){const m=Math.min(1,mag)/mag;tx=p.ix*m*max;ty=p.iy*m*max;}
  const a=Math.min(1,DT*(moving?7:10));
  p.vx+=(tx-p.vx)*a;p.vy+=(ty-p.vy)*a;
  if(p.sp&&moving&&p.stun<=0&&!p.winded)p.stam=Math.max(0,p.stam-DT*0.075*(1.7-p.st.stam)*(1+0.5*p.fat));   // sprint drain: low stamina stat and tiredness drain faster
  else p.stam=Math.min(1,p.stam+DT*0.06*(0.55+0.9*p.st.stam)*(moving?0.7:1.5)*(1-0.4*p.fat));
  if(p.stam<=0.02)p.winded=true;else if(p.stam>0.25)p.winded=false;                                        // winded: no sprinting until partly recovered
  if(moving)p.fat=Math.min(1,p.fat+DT*0.0016*(p.sp&&!p.winded?2:1)*(1.6-p.st.stam)*(1+0.15*TC[p.team].press));   // long-term tiredness: slows the player, reason to sub
  p.x+=p.vx*DT;p.y+=p.vy*DT;
  if(Math.hypot(p.vx,p.vy)>12){
    const da=angd(Math.atan2(p.vy,p.vx),p.face);
    p.face+=da*Math.min(1,DT*12);
    p.turn+=(da*12-p.turn)*0.3;
  }else p.turn*=0.8;
  clampPos(p);
}
function clampPos(p){p.x=clamp(p.x,PX0-18,PX1+18);p.y=clamp(p.y,PY0-18,PY1+18);}
function separate(){                                       // bounded, order-independent player-player collision resolution
  const ITERATIONS=4,MAX_STEP_PER_ITERATION=0.45,RELAXATION=0.45;
  const count=P.length;
  const dxMove=new Float64Array(count),dyMove=new Float64Array(count);
  for(let iteration=0;iteration<ITERATIONS;iteration++){
    dxMove.fill(0);dyMove.fill(0);
    for(let i=0;i<count;i++){
      const a=P[i];if(a.dive>0||a.out||a.substitutionExiting)continue;
      for(let j=i+1;j<count;j++){
        const b=P[j];if(b.dive>0||b.out||b.substitutionExiting)continue;
        let dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy;
        if(d2>=144)continue;
        let d;
        if(d2<1e-8){
          // Deterministic fallback direction for coincident players; no random impulse.
          const angle=((i+1)*0.754877666+(j+1)*0.569840296)*Math.PI*2;
          dx=Math.cos(angle);dy=Math.sin(angle);d=0;
        }else{d=Math.sqrt(d2);dx/=d;dy/=d;}
        const overlap=12-d;
        if(overlap<=0)continue;
        const strengthA=Math.max(0.01,Number(a.st&&a.st.phys)||0.5);
        const strengthB=Math.max(0.01,Number(b.st&&b.st.phys)||0.5);
        const total=strengthA+strengthB;
        const correction=overlap*RELAXATION;
        // Keep the original physical-strength weighting: stronger players move less.
        const moveA=correction*strengthB/total;
        const moveB=correction*strengthA/total;
        dxMove[i]-=dx*moveA;dyMove[i]-=dy*moveA;
        dxMove[j]+=dx*moveB;dyMove[j]+=dy*moveB;
      }
    }
    // Apply accumulated Jacobi corrections together, avoiding pair-order bias.
    for(let i=0;i<count;i++){
      const p=P[i];if(p.dive>0||p.out||p.substitutionExiting)continue;
      const mx=dxMove[i],my=dyMove[i],length=Math.hypot(mx,my);
      if(length>MAX_STEP_PER_ITERATION){
        const scale=MAX_STEP_PER_ITERATION/length;
        p.x+=mx*scale;p.y+=my*scale;
      }else if(length>0){p.x+=mx;p.y+=my;}
      if(length>0)clampPos(p);
    }
  }
}
function dribbleBallTarget(carrier){
  const speed=Math.hypot(carrier.vx,carrier.vy);
  const control=clamp(carrier.st&&carrier.st.drib!==undefined?carrier.st.drib:0.5,0,1);
  const stamina=clamp(carrier.stam===undefined?1:carrier.stam,0,1);
  const sprint=carrier.sp&&!carrier.winded;
  const lead=7.5+clamp(speed*0.018,0,4)+(1-control)*1.2+(1-stamina)*0.5+(sprint?1.2:0);
  return{x:carrier.x+Math.cos(carrier.face)*lead,y:carrier.y+Math.sin(carrier.face)*lead,rate:14+control*4};
}
function stepBall(){
  const b=ball;
  if(b.owner){                                             // controlled, non-oscillating dribble touch
    const o=b.owner,sp=Math.hypot(o.vx,o.vy),target=dribbleBallTarget(o);
    const follow=1-Math.exp(-target.rate*DT);               // frame-rate-independent soft follow, not a hard attachment
    b.x+=(target.x-b.x)*follow;b.y+=(target.y-b.y)*follow;
    b.vx=o.vx;b.vy=o.vy;b.z=b.vz=b.spin=0;b.rot+=sp*DT/BR;return;
  }
  if(b.spin){                                              // curve: rotate the velocity vector
    const c=Math.cos(b.spin*DT),s=Math.sin(b.spin*DT),vx=b.vx*c-b.vy*s;
    b.vy=b.vx*s+b.vy*c;b.vx=vx;b.spin*=b.z>1?0.996:0.96;if(Math.abs(b.spin)<0.02)b.spin=0;
  }
  if(b.z>1){b.vx*=FA;b.vy*=FA;}else{b.vx*=FG;b.vy*=FG;if(b.z===0&&b.vz===0){const rv=rollResistance(b.vx,b.vy);b.vx=rv[0];b.vy=rv[1];}}
  if(b.z===0&&b.vz===0&&b.vx*b.vx+b.vy*b.vy<9)b.vx=b.vy=0;
  if(b.z>0||b.vz!==0){
    b.vz-=BALL_GRAV*DT;b.z+=b.vz*DT;
    if(b.z<=0){b.z=0;const impact=-b.vz;if(impact>18){AU.bounce(impact);const e=clamp(0.53+impact*0.0004,0.53,0.58);b.vz=impact*e;b.vx*=0.92;b.vy*=0.92;}else b.vz=0;}  // smooth, impact-speed-dependent turf rebound
  }
  const ox=b.x;b.x+=b.vx*DT;b.y+=b.vy*DT;
  goalHit(ox);
  if(S.mode==='goal')netClamp();
  b.rot+=Math.hypot(b.vx,b.vy)*DT/BR;
}
function goalHit(ox){                                      // crossbar + posts
  const b=ball;
  for(const gx of [PX0,PX1]){
    if(ox!==b.x&&(ox-gx)*(b.x-gx)<=0&&Math.abs(b.y-CY)<GOALH&&b.z>GOALZ-BR&&b.z<GOALZ+BR){
      b.x=ox;b.vx*=-0.52;b.vz=(b.z>GOALZ?1:-1)*Math.abs(b.vz)*0.5+6;hitPost(Math.hypot(b.vx,b.vy)/.52);
    }
    for(const s of [-1,1]){
      const py=CY+s*GOALH,dx=b.x-gx,dy=b.y-py,dd=Math.hypot(dx,dy),R=BR+2.5;
      if(dd<R&&dd>0&&b.z<GOALZ+2){
        const nx=dx/dd,ny=dy/dd,vn=b.vx*nx+b.vy*ny;
        if(vn<0){b.vx-=1.75*vn*nx;b.vy-=1.75*vn*ny;hitPost(-vn);}
        b.x=gx+nx*R;b.y=py+ny*R;
      }
    }
  }
}
function netClamp(){                                       // ball stays inside the net after a goal
  const b=ball;
  for(const gx of [PX0,PX1]){
    const out=gx===PX0?-1:1,dx=(b.x-gx)*out;
    if(dx>0&&Math.abs(b.y-CY)<GOALH+6){
      if(dx>GOALD-BR){b.x=gx+out*(GOALD-BR);b.vx*=-0.15;}
      if(Math.abs(b.y-CY)>GOALH-BR){b.y=CY+Math.sign(b.y-CY)*(GOALH-BR);b.vy*=-0.2;}
      b.vx*=0.93;b.vy*=0.93;
    }
  }
}
function touches(){                                        // a free ball is picked up by the nearest outfielder; airborne balls become volleys, headers or chest control
  const b=ball;if(b.owner||b.z>42||(b.contactPickupTicks||0)>0)return;
  const air=b.z>12;if(air&&b.hcd>0)return;
  let best=null,bs=-1e9,secondTouchCandidate=null,secondTouchScore=-1e9;
  for(const p of P){
    const shootoutKicker=!!(S.so&&S.so.live&&p===S.so.shooter);
    if((p.gk&&!shootoutKicker)||p.out||p.substitutionExiting||(p.kcd>0&&!shootoutKicker)||p.stun>0)continue;
    const d=Math.hypot(b.x-p.x,b.y-p.y),r=(p===b.receiver?TUNING.rcv.r:11)+(p.st.drib-0.65)*4+(air?3:0);
    if(d>=r)continue;
    const s=air?p.st.phys*8+p.st.def*2+(p===b.receiver?2:0)-d*0.4+rnd(0,6):-d+(p===b.receiver?TUNING.rcv.bonus:0);   // aerial duel: strength and timing win it; the intended receiver wins a ground 50/50
    if(shootoutKicker){if(s>secondTouchScore){secondTouchScore=s;secondTouchCandidate=p;}continue;}
    if(p===b.dbl&&b.last===p){if(s>secondTouchScore){secondTouchScore=s;secondTouchCandidate=p;}continue;}
    if(s>bs){bs=s;best=p;}
  }
  // The restart taker is excluded from normal possession, but a controlled touch
  // by that same player is still an offence even when the ball has stopped moving.
  if(secondTouchCandidate&&secondTouchScore>bs){
    if(S.so&&S.so.live&&secondTouchCandidate===S.so.shooter){
      const accidental=b.last===secondTouchCandidate&&Number.isFinite(S.so.kickAt)&&S.so.t-S.so.kickAt<=0.25;
      if(accidental)b.shootoutDoubleTouch=true;else b.shootoutDeliberateDoubleTouch=true;
      best=secondTouchCandidate;bs=secondTouchScore;
    }else if(b.pen&&!b.penaltyWasShootout&&secondTouchCandidate===b.penaltyKicker){
      b.penaltyDoubleTouch=true;best=secondTouchCandidate;bs=secondTouchScore;
    }else{
      const d=dirOf(secondTouchCandidate.team),gx=d>0?PX0:PX1;
      const insideOwnPenaltyArea=(b.x-gx)*d>=0&&(b.x-gx)*d<=PEN_DEPTH&&Math.abs(b.y-CY)<=PEN_WIDTH/2;
      b.restartDoubleTouchPending={player:secondTouchCandidate,x:b.x,y:b.y,kind:b.dblKind,
        decision:PITCH11Law.restartSecondTouchRestart({isKicker:true,insideOwnPenaltyArea,restartKind:b.dblKind})};
      return;
    }
  }
  if(!best)return;
  if(best!==b.dbl){b.dbl=null;b.ind=false;}              // another player's touch ends the second-touch restriction and allows a goal after a throw-in / drop
  if(!S.prac&&!best.off){
    const challenger=P.find(p=>{
      if(!p.off||p.out||p.team===best.team)return false;
      const dx=b.x-p.x,dy=b.y-p.y;
      const approaching=p.vx*dx+p.vy*dy>0.1||b.vx*(-dx)+b.vy*(-dy)>0.1;
      return PITCH11Law.offsideChallengeInterference({offside:true,approaching,
        attackerX:p.x,attackerY:p.y,opponentX:best.x,opponentY:best.y,
        ballX:b.x,ballY:b.y,radius:15});
    });
    if(challenger){callOffside(challenger);return;}
    const blocker=P.find(p=>p.off&&!p.out&&p.team!==best.team&&PITCH11Law.offsideLineOfSightInterference({
      offside:true,attackerX:p.x,attackerY:p.y,keeperX:best.x,keeperY:best.y,
      ballX:b.x,ballY:b.y,radius:5.5
    }));
    if(blocker){callOffside(blocker);return;}
  }
  if(!S.prac&&best.off){callOffside(best);return;}
  if(Math.hypot(b.vx,b.vy)>400+90*best.st.drib+(best===b.receiver?TUNING.rcv.hot+260:0)){           // too hot to control: deflect
    const previousLast=b.last,a=rnd(-.5,.5),c=Math.cos(a),s=Math.sin(a),vx=b.vx*0.45;
    b.vx=vx*c-b.vy*0.45*s;b.vy=vx*s+b.vy*0.45*c;registerBallContact(best);b.last=best;b.receiver=null;applyOffsideTouch(best,previousLast,false,false);
    return;
  }
  if(air)airPlay(best);
  else{
    const sp=Math.hypot(b.vx,b.vy);
    if(sp>240&&!S.rs&&Math.random()<0.5-0.4*best.st.drib+(sp-240)/1500+(best.team?0.08:-0.06)){      // heavy first touch: the ball bobbles away instead of sticking
      const previousLast=b.last,a=rnd(-.55,.55),c=Math.cos(a),sn=Math.sin(a),nx=(b.vx*c-b.vy*sn)*.32,ny=(b.vx*sn+b.vy*c)*.32;
      b.vx=nx;b.vy=ny;b.vz=rnd(20,45);registerBallContact(best);applyOffsideTouch(best,previousLast,true,false);b.last=best;return;
    }
    take(best);
  }
}
function airPlay(p){                                       // ball in the air: volley / chest control low down, header higher up
  const b=ball,d=dirOf(p.team),gx=d>0?PX1:PX0,own=d>0?PX0:PX1,toGoal=Math.abs(gx-p.x),hv=Math.hypot(b.vx,b.vy);
  const hu=p===ctrl,pw=hu&&(I.shoot||I.shootUp),stick=hu&&Math.hypot(I.mx,I.my)>0.25;   // human: hold SHOOT = go for goal, stick = aim a header pass
  const canScore=toGoal<260&&Math.abs(p.y-CY)<190&&(gx-p.x)*d>0;
  if(b.z<=22){                                             // volley or cushion
    if(pw||(!hu&&canScore&&hv>90&&Math.random()<(toGoal<190?0.75:0.4))){
      b.hcd=0.2;
      if(hu)doShoot(p,0.8,aimAng(p),0,1.7);else aiShoot(p,0,false,1.7);   // volleys are harder to place
    }else take(p);
    return;
  }
  if(p.team===0&&!pw&&!stick){take(p);return;}                       // fix: your team never heads it away / clears / passes on its own - no input = just control it
  if(p===b.receiver&&!canScore&&!pw&&!stick&&hv<300){take(p);return;}   // a pass to me: bring it down
  p.jump=0.5;p.stam=Math.max(0,p.stam-0.02);b.hcd=0.3;
  if(pw||(!hu&&canScore&&Math.random()<0.8)){headShot(p);return;}
  let tg=null,mode='pass';
  if(stick)tg=bestTarget(p,Math.atan2(I.my,I.mx),'pass');
  else if(Math.abs(p.x-own)<330){tg={x:p.x+d*300,y:clamp(p.y+(p.y<CY?-1:1)*110,PY0+30,PY1-30),vx:0,vy:0};mode='lob';}   // defensive header: clear it
  else tg=bestAiPass(p).t;
  if(!tg){const a=stick?Math.atan2(I.my,I.mx):(d>0?0:Math.PI);tg={x:p.x+Math.cos(a)*190,y:p.y+Math.sin(a)*190,vx:0,vy:0};}
  if(mode==='pass'&&Math.hypot(tg.x-p.x,tg.y-p.y)>190)mode='lob';
  doPass(p,tg,mode);
}
function headShot(p){                                      // aimed so the ball is at a sensible height when it reaches the line
  const b=ball,t=p.team,d=dirOf(t),gx=d>0?PX1:PX0,gk=GK[1-t],sk=0.5*p.st.shoot+0.5*p.st.phys;
  const ty=CY+(gk.y>CY?-1:1)*rnd(8,GOALH-6)+rnd(-1,1)*(1.5-sk)*14*(1+0.5*p.fat);
  const dx=gx-p.x,dy=ty-p.y,dist=Math.hypot(dx,dy)||1,v=(180+130*sk)*rnd(0.92,1.08),tt=dist/v;
  const vz=clamp((rnd(3,24)-b.z+0.5*BALL_GRAV*tt*tt)/tt,-130,130);
  kick(p,dx/dist*v,dy/dist*v,vz,0,null,0,0,'shot');b.shotId++;b.pen=false;
}
function gkReact(p){                                       // save only a genuine threat to this keeper's own goal
  const b=ball,previousLast=b.last;if(b.owner||p.kcd>0||p.out||S.mode!=='play')return;
  const d=dirOf(p.team),gx=ownGX(p),closing=-d*b.vx;
  if(closing<70)return;                                // ball must be travelling towards this keeper's goal
  const D=gx-b.x,k=b.z>2?KA:KG,r=D*k/b.vx;
  if(!(D/b.vx>0&&r>0&&r<0.95))return;                  // no forward intersection with the own goal line
  const tt=-Math.log(1-r)/k,yp=b.y+b.vy/b.vx*D;
  const zp=b.z+b.vz*tt-0.5*BALL_GRAV*tt*tt;
  if(tt>2.2||Math.abs(yp-CY)>GOALH+BR+5||zp<-8||zp>GOALZ+BR+8)return; // wide or over/under the frame: do not dive
  const gs=GOALH/36.6,dv=p.dive>0,reach=((dv?28:12)*gs+(p.st.phys-0.7)*4*(0.8+0.4*gs))*(p.team?0.95:1.05);
  if(b.z>(dv?50:38))return;
  const sx=b.px,sy=b.py,ex=b.x-sx,ey=b.y-sy,L=ex*ex+ey*ey,u=L>0?clamp(((p.x-sx)*ex+(p.y-sy)*ey)/L,0,1):1,cx=sx+ex*u,cy=sy+ey*u;
  const dx=cx-p.x,dy=cy-p.y,dd=Math.hypot(dx,dy);if(dd>reach)return;
  const sp=Math.hypot(b.vx,b.vy),hd=0.8+0.4*p.st.def,q=dd/reach;
  if(sp>340&&q>0.5&&Math.random()<0.35*(2-p.st.def))return;
  b.x=cx;b.y=cy;
  const hold=sp<(175-q*52)*hd||(sp<(335-q*95)*hd&&Math.random()<0.36*hd);
  if(hold&&!(sp>160&&Math.random()<0.1*(1.5-hd))){take(p,true);p.dive=0;p.vx=p.vy=0;p.freeze=0.2;}
  else if(hold){b.vx=d*sp*0.12;b.vy=rnd(-30,30);b.vz=20;b.spin=0;registerBallContact(p);b.last=p;b.receiver=null;applyOffsideTouch(p,previousLast,true,true);}
  else{const side=Math.abs(b.y-CY)>4?Math.sign(b.y-CY):(Math.random()<0.5?1:-1);
    b.vx=d*sp*0.3;b.vy=side*sp*rnd(0.3,0.55);b.vz=rnd(30,70);b.spin=0;registerBallContact(p);b.last=p;b.receiver=null;applyOffsideTouch(p,previousLast,true,true);}
}
