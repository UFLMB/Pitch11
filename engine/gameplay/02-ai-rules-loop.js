'use strict';
/* ===================== 6. AI ===================== */
const HP=[0,0];let mkT=0;
function homePos(p){                                       // formation spot, shifted with the ball and the attack
  const t=p.team,d=dirOf(t),f=FRM[t][p.role],b=ball,rs=S.rs;
  const prog=((b.x-(d>0?PX0:PX1))*d)/PW;
  let along=f[0]*PW*0.9+(prog-0.5)*PW*0.42*(p.role?1:0);
  if(TI[t].att&&p.line>=2)along+=PW*0.07*(p.line>=3?1.4:1);
  along=clamp(along+(p.role?PW*0.06*TC[t].line:0),p.role?35:26,PW-40);
  const wf=.5+(f[1]-.5)*(1+0.25*TC[t].width);let y=PY0+(d>0?wf:1-wf)*PH+(b.y-CY)*0.28*(p.role?1:0);
  const box=rs&&rs.box&&p.role&&(t!==rs.team||p.line>=2||p.role===2||p.role===3);
  if(box){along=t===rs.team?PW-60-(p.role%3)*18:40+(p.role%4)*18;y=CY+((p.role*7)%9-4)*24;}   // corner / free kick near goal: into the box
  let x=d>0?PX0+along:PX1-along;
  if(rs&&rs.wall&&rs.wall.includes(p)){const k=rs.wall.indexOf(p)-1;x=rs.wx+rs.wnx*k*15;y=rs.wy+rs.wny*k*15;}   // defensive wall
  else if(p.line>=2&&!box&&x*d>TI[t].off-5&&b.x*d<TI[t].off)x=(TI[t].off-5)*d;                                // stay onside
  HP[0]=x;HP[1]=clamp(y,PY0+20,PY1-20);
}
function goTo(p,x,y,spr){
  const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);if(d<4)return;
  const m=Math.min(1,d/22);p.ix=dx/d*m;p.iy=dy/d*m;p.sp=!!spr&&d>45&&p.stam>0.15;
}
function interceptTo(p){
  const b=ball;let x=b.x+b.vx*0.42,y=b.y+b.vy*0.42;
  if(b.z>12){const tl=(b.vz+Math.sqrt(b.vz*b.vz+2*BALL_GRAV*b.z))/BALL_GRAV;x=b.x+b.vx*tl*0.94;y=b.y+b.vy*tl*0.94;}
  goTo(p,clamp(x,PX0,PX1),clamp(y,PY0,PY1),true);
}
function teamInfo(){
  const b=ball;
  for(let t=0;t<2;t++){
    const ti=TI[t];ti.c1=ti.c2=null;let d1=1e9,d2=1e9;
    for(let i=t*11+1;i<t*11+11;i++){
      const p=P[i];if(p.out||p.substitutionExiting)continue;
      const d=(p.x-b.x)*(p.x-b.x)+(p.y-b.y)*(p.y-b.y);
      if(d<d1){d2=d1;ti.c2=ti.c1;d1=d;ti.c1=p;}else if(d<d2){d2=d;ti.c2=p;}
    }
    ti.att=b.owner?b.owner.team===t:!!(b.last&&b.last.team===t);
    let a1=-1e9,a2=-1e9;const dd=dirOf(t);                 // offside line = second-last opponent
    for(let i=(1-t)*11;i<(1-t)*11+11;i++){const q=P[i];if(q.out)continue;const v=q.x*dd;if(v>a1){a2=a1;a1=v;}else if(v>a2)a2=v;}
    ti.off=a2;
  }
  if(mkT<=0){mkT=0.35;assignMarks(0);assignMarks(1);}else mkT-=DT;   // re-pick who marks whom a few times a second
}
function aiPlayer(p){
  p.ix=p.iy=0;p.sp=false;
  if(p.gk)aiGK(p);else if(ball.owner===p)aiCarrier(p);else aiOff(p);
}
function aiOff(p){
  const b=ball,t=p.team,ti=TI[t],d=dirOf(t);
  if(b.receiver===p&&!b.owner){                            // run onto a pass sent to me
    if(b.pmode==='thru'||b.pmode==='lob')goTo(p,b.tx,b.ty,true);else interceptTo(p);
    return;
  }
  if(!b.owner){                                            // loose ball: nearest chase it
    if(ti.c1===p||(ti.c2===p&&(p.x-b.x)*(p.x-b.x)+(p.y-b.y)*(p.y-b.y)<8100)){interceptTo(p);return;}
  }else if(b.owner.team!==t&&!S.rs){                         // opponent has it: press and cover
    const o=b.owner;
    if(ti.c1===p){
      jockey(p,o);
      if(Math.hypot(b.x-p.x,b.y-p.y)<19&&Math.random()<0.035*(t?DIF[G.diff].tk:1)*(1+0.4*TC[t].press)*(1+(Math.hypot(b.x-o.x,b.y-o.y)>11?1.2:0)))tryTackle(p,0.38);
      return;
    }
    if(ti.c2===p){
      const gx=d>0?PX0:PX1,dx=gx-o.x,dy=CY-o.y,m=Math.hypot(dx,dy)||1;
      goTo(p,o.x+dx/m*55,o.y+dy/m*55,true);return;
    }
  }
  const rs=S.rs;
  if(!ti.att&&p.mk&&!p.mk.out&&!(rs&&(rs.box||(rs.wall&&rs.wall.includes(p))))){   // defending: mark my man
    if(!b.owner&&b.receiver===p.mk){interceptTo(p);return;}                       // pass to my man: step in front
    markPos(p);return;
  }
  if(b.owner&&b.owner.team===t&&b.owner!==p&&(!rs||rs.kind==='throw'||rs.kind==='gk'||rs.kind==='drop'||rs.kind==='ko')){offBall(p);return;}   // attacking: make a run
  homePos(p);goTo(p,HP[0],HP[1],false);
}
function assignMarks(t){                                   // greedy one-to-one marking: closest (defender home, attacker) pairs first
  const o=1-t,gx=dirOf(t)>0?PX0:PX1,ti=TI[t],pairs=[];
  for(let i=t*11+1;i<t*11+11;i++){
    const p=P[i];p.mk=null;
    if(p.out||p.substitutionExiting||p.line>=3||p===ti.c1||p===ti.c2)continue;
    homePos(p);
    for(let j=o*11+1;j<o*11+11;j++){
      const q=P[j];if(q.out||q===ball.owner)continue;
      const dist=Math.hypot(q.x-HP[0],q.y-HP[1]);
      if(dist<270)pairs.push([dist+Math.abs(q.x-gx)*0.25,p,q]);
    }
  }
  pairs.sort((a,b)=>a[0]-b[0]);
  const used=new Set();
  for(const pr of pairs){if(pr[1].mk||used.has(pr[2]))continue;pr[1].mk=pr[2];used.add(pr[2]);}
}
function markPos(p){                                       // stand goal-side of my man; midfielders also screen the passing lane
  const m=p.mk,gx=dirOf(p.team)>0?PX0:PX1,b=ball;
  let ux=gx-m.x,uy=CY-m.y,l=Math.hypot(ux,uy)||1;ux/=l;uy/=l;
  let vx=b.x-m.x,vy=b.y-m.y,bl=Math.hypot(vx,vy)||1;vx/=bl;vy/=bl;
  const k=24-10*p.st.def,w=p.role<=4?0.25:0.45;
  let ax=ux*(1-w)+vx*w,ay=uy*(1-w)+vy*w;const al=Math.hypot(ax,ay)||1;
  let x=m.x+ax/al*k,y=m.y+ay/al*k;
  homePos(p);const dh=Math.hypot(x-HP[0],y-HP[1]);          // never drift too far from the defensive shape
  if(dh>260){x=HP[0]+(x-HP[0])/dh*260;y=HP[1]+(y-HP[1])/dh*260;}
  goTo(p,x,y,Math.hypot(x-p.x,y-p.y)>50);
}
function offBall(p){                                       // pick a run: forward, onside, into space, away from the pass-lane blockers
  const b=ball,o=b.owner,t=p.team,d=dirOf(t),ti=TI[t];
  const run=(p.line>=3?1:p.line===2?0.6:p.wide?0.3:0.08)*(0.7+0.3*p.st.pace);
  p.rt-=DT;
  if(p.rt<=0||Math.hypot(p.rx-p.x,p.ry-p.y)<8){
    p.rt=rnd(0.3,0.65);homePos(p);
    const hx=HP[0],hy=HP[1];let bx=hx,by=hy,bs=-1e9;
    for(let k=0;k<11;k++){
      let cx=hx+d*rnd(-30,60+190*run);const cy=clamp(hy+rnd(-120,120),PY0+20,PY1-20);
      if(p.line>=2&&cx*d>ti.off-6&&b.x*d<=ti.off)cx=(ti.off-6)*d;     // stay onside
      cx=clamp(cx,PX0+20,PX1-20);
      const od=Math.hypot(cx-o.x,cy-o.y);
      const s=(cx-hx)*d*0.006*run+Math.min(nearestOpp({x:cx,y:cy,team:t}),80)*0.03-Math.abs(od-170)*0.005-laneBlock(o,{x:cx,y:cy})-Math.hypot(cx-hx,cy-hy)*0.003*(1.1-run)+(Math.abs(cy-o.y)>60?0.15:0)-teamCrowd(cx,cy,p)*0.45;
      if(s>bs){bs=s;bx=cx;by=cy;}
    }
    p.rx=bx;p.ry=by;
  }
  goTo(p,p.rx,p.ry,run>0.5&&p.stam>0.3&&Math.hypot(p.rx-p.x,p.ry-p.y)>70);
}
const BP={t:null,s:-9};
function bestAiPass(p){
  BP.t=null;BP.s=-9;const d=dirOf(p.team);
  for(let i=p.team*11;i<p.team*11+11;i++){
    const t=P[i];if(t===p)continue;
    const dx=t.x-p.x,dy=t.y-p.y,dist=Math.hypot(dx,dy);
    if(dist<45||dist>380||(t.gk&&dist>220))continue;
    const s=dx*d*0.007-dist*0.0014+Math.min(nearestOpp(t),80)*0.013-laneBlock(p,t)*1.6-(t.gk?0.9:0)-(nearestOpp(t)<15?0.4:0)-(t.line>=2&&t.x*d>TI[p.team].off+2?1.6:0)+(Math.abs(t.y-p.y)>40&&dx*d>-20?0.12:0);
    if(s>BP.s){BP.s=s;BP.t=t;}
  }
  return BP;
}
function aiPass(p,t){
  const dist=Math.hypot(t.x-p.x,t.y-p.y),d=dirOf(p.team),blocked=laneBlock(p,t),fwd=(t.x-p.x)*d;
  let m='pass';
  if(blocked&&dist>140&&Math.random()<0.5)m='lob';
  else if(!blocked&&fwd>90&&Math.random()<0.3)m='thru';
  else if(dist>300&&Math.random()<0.2)m='lob';
  doPass(p,t,m);
}
function aiShoot(p,lift,pen,em){
  const d=dirOf(p.team),gx=d>0?PX1:PX0,gk=GK[1-p.team],dist=Math.abs(gx-p.x),r=Math.random(),far=gk.y>CY?-1:1;
  let ty=CY+far*rnd(14,GOALH-6);                           // usually the far corner
  if(r<0.2)ty=CY-far*rnd(10,GOALH-6);                      // sometimes the near post
  else if(r<0.28)ty=CY+rnd(-10,10);                        // sometimes straight down the middle
  if(!pen&&!lift&&Math.abs(gk.x-gx)>28&&dist<260&&Math.random()<0.45)lift=32;   // keeper off his line: chip
  doShoot(p,pen?rnd(0.7,0.95):clamp(0.5+dist/520,0.55,1),Math.atan2(ty-p.y,gx-p.x),lift,(em||1)*(p.team&&!pen?1.5+dist/450:1));   // the AI side is less accurate, more so from range
  ball.spin+=rnd(-.5,.5)*(1.2-p.st.shoot);
}
function aiCarrier(p){
  const d=dirOf(p.team),gx=d>0?PX1:PX0,opp=1-p.team,rs=S.rs&&S.rs.p===p?S.rs:null;
  if(rs&&rs.kind==='pen'){if(p.freeze>0)p.freeze-=DT;else aiShoot(p,0,true);return;}
  if(p.freeze>0){p.freeze-=DT;if(p.freeze<=0){p.force=true;p.think=0;}return;}  // restart: wait, then must pass
  let no=null,nd=1e9;
  for(let i=opp*11;i<opp*11+11;i++){const dd=Math.hypot(P[i].x-p.x,P[i].y-p.y);if(dd<nd){nd=dd;no=P[i];}}
  const toGoal=Math.abs(gx-p.x);
  let ax=d,ay=clamp((CY-p.y)*0.004,-0.5,0.5);
  if(no&&nd<65){const k=(65-nd)/65*1.8;ax+=(p.x-no.x)/nd*k;ay+=(p.y-no.y)/nd*k;}
  if(p.y<PY0+35)ay+=0.8;else if(p.y>PY1-35)ay-=0.8;
  const m=Math.hypot(ax,ay)||1;p.ix=ax/m;p.iy=ay/m;p.sp=nd>70;
  if(no&&nd<38&&!rs&&!p.force&&p.freeze<=0&&Math.random()<DT*1.3*p.st.drib){   // pressed: try a skill move round the defender
    const ba=Math.atan2(no.y-p.y,no.x-p.x),sg=Math.sin(ba+Math.PI/2)*(CY-p.y)>=0?1:-1,pa=ba+sg*Math.PI/2;
    skillMove(p,Math.atan2(Math.sin(pa)*0.8,Math.cos(pa)*0.6+d*0.8));
  }
  p.think-=DT;
  if(p.think>0&&!p.force)return;
  p.think=rnd(0.2,0.45)*(1-0.25*TC[p.team].tempo);
  if(p.force&&rs){
    if(rs.kind==='fk'&&!rs.ind&&toGoal<330&&Math.random()<0.75){aiShoot(p,180);return;}   // lift it over the wall
    if(rs.kind==='corner'){                                // cross to the attacker nearest the goal mouth
      let bt=null,bd=1e9;
      for(let i=p.team*11+1;i<p.team*11+11;i++){const q=P[i];if(q.out)continue;const dd=Math.hypot(q.x-(gx-d*40),q.y-CY);if(dd<bd){bd=dd;bt=q;}}
      if(bt){doPass(p,bt,'lob');return;}
    }
  }
  if(!p.force&&toGoal>330&&toGoal<650&&Math.abs(p.y-CY)<340&&p.poss>1.2&&Math.random()<0.4){
    const dd=dirOf(p.team);p.ix=dd;p.iy=clamp((CY-p.y)*0.02,-0.6,0.6);return;   // drive forward into the final third
  }
  if(!p.force&&toGoal<250&&Math.abs(p.y-CY)<190&&Math.random()<(toGoal<150?0.5:0.22)){aiShoot(p);return;}
  const o=bestAiPass(p),press=nd<44;
  if(toGoal<200&&Math.abs(p.y-CY)<190&&!p.force&&Math.random()<0.25){aiShoot(p);return;}
  if(o.t&&(p.force||(press&&o.s>0.05)||(o.s>0.85&&Math.random()<0.5)||p.poss>2.2-0.9*TC[p.team].tempo))aiPass(p,o.t);
  else if(p.force)doPass(p,{x:p.x+d*140,y:p.y,vx:0,vy:0},'pass');
}
function gkDistribute(p){
  const o=bestAiPass(p),d=dirOf(p.team);
  if(o.t)doPass(p,o.t,Math.hypot(o.t.x-p.x,o.t.y-p.y)>200?'lob':'pass');
  else{
    // safe outlet: nearest open defender forward, else a guarded short pass to a full-back
    let bt=null,bd=1e9;
    for(let i=p.team*11+1;i<p.team*11+11;i++){const q=P[i];if(q.out||laneBlock(p,q))continue;const dd=Math.hypot(q.x-p.x,q.y-p.y);if(dd<bd){bd=dd;bt=q;}}
    if(bt)doPass(p,bt,'pass');
    else doPass(p,{x:p.x+d*120,y:CY,vx:0,vy:0},'pass');
  }
}
function gkFirst(p){                                       // true if nobody else is clearly closer to the ball
  const dp=Math.hypot(ball.x-p.x,ball.y-p.y)*0.85;
  for(const q of P)if(q!==p&&Math.hypot(ball.x-q.x,ball.y-q.y)<dp)return false;
  return true;
}
function firstTo(p,x,y){                                   // can the keeper beat everyone else to this spot?
  const tg=Math.hypot(p.x-x,p.y-y)/80;
  for(const q of P){if(q===p||q.out)continue;if(Math.hypot(q.x-x,q.y-y)/(q.gk?80:95)<tg*1.1)return false;}
  return true;
}
function aiGK(p){
  const b=ball,d=dirOf(p.team),gx=d>0?PX0:PX1,st=p.st,rs=S.rs,o=b.owner;
  p.claim=false;
  if(o===p){if(p.freeze>0)p.freeze-=DT;else if(p.poss>1.1)gkDistribute(p);return;}
  if(p.dive>0){
    p.dive=Math.max(0,p.dive-DT);
    if(p.dive===0){p.vx=p.vy=0;p.diveTx=p.diveTy=null;}
    return;
  }
  if(!o&&b.last&&b.last.team!==p.team&&-d*b.vx>140){       // incoming: predict where it crosses the goal line
    const D=gx-b.x,k=b.z>2?KA:KG,r=D*k/b.vx;
    if(r>0&&r<0.97){
      const tt=-Math.log(1-r)/k,yp=b.y+b.vy/b.vx*D,zp=b.z+b.vz*tt-0.5*BALL_GRAV*tt*tt;
      if(Math.abs(yp-CY)<GOALH+BR+5&&tt<1&&zp>=-8&&zp<GOALZ+BR+8){
        if(p.seenShot!==b.shotId){                         // handling stat: better keepers react faster and misjudge less
          p.seenShot=b.shotId;p.react=(b.pen?rnd(0,0.08):rnd(GK_REACT[0],GK_REACT[1]))*(1.5-st.def)*(p.team?DIF[G.diff].gk:1);
          p.err=rnd(-GK_ERR,GK_ERR)*(b.pen?1.6:1)*(1.6-st.def)*(p.team?DIF[G.diff].gk:1);
        }
        if(p.react>0)return;                               // reaction delay: keeper is frozen
        if(p.divedShot!==b.shotId){
          p.divedShot=b.shotId;
          const tx=gx+d*4,ty=clamp(yp+p.err,CY-GOALH+BR,CY+GOALH-BR);
          const dx=tx-p.x,dy=ty-p.y,dist=Math.hypot(dx,dy),tm=clamp(tt+0.15,0.3,0.7);
          const maxSpeed=GK_DIVE*(0.85+0.3*st.pace)*(GOALH/36.6);
          const speed=dist>2?Math.min(maxSpeed,dist/tm):0;
          p.dive=tm;p.diveTx=tx;p.diveTy=ty;
          p.vx=dist>2?dx/dist*speed:0;p.vy=dist>2?dy/dist*speed:0;
          p.diveAng=dist>2?Math.atan2(dy,dx):0;
          return;
        }
      }
    }
  }
  if(rs&&rs.kind==='pen'&&rs.team!==p.team){goTo(p,gx+d*4,CY,false);return;}   // penalty: keeper stays on the line
  if(o&&o.team!==p.team&&!rs&&Math.abs(o.x-gx)<200&&Math.abs(o.y-CY)<175){     // one-on-one: close the angle, then smother
    const dd=Math.hypot(o.x-p.x,o.y-p.y);
    if(dd<22&&p.tcd<=0&&b.protect<=0){
      p.tcd=0.8;
      if(Math.random()<0.35+0.4*st.def){take(p,true);o.stun=0.4;p.freeze=0.5;}
      else{b.owner=null;registerBallContact(p);b.last=p;const a=Math.atan2(b.y-CY,b.x-gx)+rnd(-.8,.8),v=rnd(120,220);b.vx=Math.cos(a)*v;b.vy=Math.sin(a)*v;o.stun=0.35;o.kcd=0.5;}
      return;
    }
    const od=Math.hypot(o.x-gx,o.y-CY)||1,R=clamp(od*0.4,12,60);
    if(dd<75)goTo(p,o.x+o.vx*0.25,o.y+o.vy*0.25,true);
    else goTo(p,gx+(o.x-gx)/od*R,CY+(o.y-CY)/od*R,true);
    return;
  }
  if(!o){                                                  // loose ball: sweep it up or claim a cross if I get there first
    const hv=Math.hypot(b.vx,b.vy),hi=b.z>10;
    let lx=b.x+b.vx*0.25,ly=b.y+b.vy*0.25;
    if(hi){const tl=(b.vz+Math.sqrt(b.vz*b.vz+2*BALL_GRAV*b.z))/BALL_GRAV;lx=b.x+b.vx*tl*0.94;ly=b.y+b.vy*tl*0.94;}
    if(hv<(hi?600:360)&&Math.abs(b.x-gx)<330&&Math.abs(lx-gx)<(hi?165:250)&&Math.abs(ly-CY)<(hi?190:225)&&firstTo(p,lx,ly)){
      p.claim=hi;goTo(p,lx,ly,true);return;
    }
  }
  const bx=b.x-gx,by=b.y-CY,bl=Math.hypot(bx,by)||1,R=clamp(8+(400-bl)*0.055,8,28);   // default: stand on the ball-goal line, further out as the ball gets closer
  const tx=gx+bx/bl*R,ty=clamp(CY+by/bl*R,CY-GOALH+5,CY+GOALH-5);
  goTo(p,tx,ty,Math.hypot(tx-p.x,ty-p.y)>40);
}

/* ===================== 7. RULES (restarts, fouls, cards, offside, advantage, injuries, subs, extra time, shootout) ===================== */
const msg=(big,sub,t)=>{S.msg={big,sub:sub||'',t:t||1.4};};
const gmin=()=>PERIOD.base[S.half]+S.clock/(PERIOD.len[S.half]||1)*PERIOD.mins[S.half];
const tag=p=>KIT[p.team].name+' '+(p.nm||'#'+p.num);
function firstIn(t){for(const r of [9,10,8,7,6,5,4,3,2,1]){const p=P[t*11+r];if(!p.out&&!p.substitutionExiting)return p;}return P[t*11+1];}
function setupKickoff(team){
  completeEligiblePendingSubs();
  const b=ball;
  b.x=b.px=CX;b.y=b.py=CY;b.z=b.pz=b.vx=b.vy=b.vz=b.spin=0;b.owner=null;b.receiver=null;b.last=null;b.ind=false;b.pen=false;b.hcd=0;
  S.rs=null;S.adv=null;clearOff();
  for(const p of P){
    if(p.out||p.substitutionExiting)continue;
    const d=dirOf(p.team),f=FRM[p.team][p.role];
    let along=f[0]*PW*0.9;
    if(!p.gk)along=Math.min(along,PW/2-(p.team===team?22:110));
    p.x=p.px=d>0?PX0+along:PX1-along;p.y=p.py=PY0+(d>0?f[1]:1-f[1])*PH;
    p.vx=p.vy=p.ix=p.iy=p.turn=0;p.face=d>0?0:Math.PI;p.stun=p.kcd=p.tcd=p.dive=p.freeze=p.react=0;p.diveRecover=0;p.sp=false;p.force=false;p.down=false;p.skill=p.jump=0;p.mk=null;p.rt=0;p.stam=Math.min(1,p.stam+0.3);
  }
  const tk=firstIn(team),d=dirOf(team);
  tk.x=tk.px=CX-d*10;tk.y=tk.py=CY;tk.freeze=0.4;
  b.owner=tk;b.last=tk;b.protect=1.2;tk.poss=0;
  S.rs={kind:'ko',team,p:tk,x:CX,y:CY};                    // kick-off: the taker stands still and has to pass
  ctrl=team===0?tk:firstIn(0);
  S.mode='kickoff';S.t=0;
}
function newMatch(){
  S.score[0]=S.score[1]=0;S.half=1;S.clock=0;S.lostTime=0;S.addedTime=0;S.addedTimeAnnounced=0;S.kick=0;S.subs=[0,0];S.subWindows=[0,0];S.subWindowUsed=[false,false];S.reds=[0,0];S.so=null;S.card=null;S.msg=null;S.forfeitTeam=null;S.subExits=[];S.subExitRunners=[];S.pendingSubs=[];S.pendingPeriodAction=null;S.pendingSubsResume=false;
  applyTeam(0,G.club);applyTeam(1,M.opp);if(!inspectMatchEquipment())return;setupKickoff(0);
}
function nextPeriod(n){if(S.subExits.length){S.pendingPeriodAction=()=>nextPeriod(n);return;}S.half=n;S.clock=0;S.lostTime=0;S.addedTime=0;S.addedTimeAnnounced=0;S.kick=n%2?0:1;setupKickoff(S.kick);}
function brk(title,btn,fn){completeEligiblePendingSubs();S.mode='half';S.t=0;S.brk={title,btn,fn};aiSubs(1,2);}
function endHalf(){
  for(const p of P){p.ix=p.iy=0;p.sp=false;}I.shoot=false;I.chargeT=0;S.adv=null;S.rs=null;
  const tie=S.score[0]===S.score[1],h=S.half;
  if(h===1)brk('HALF TIME','2ND HALF',()=>nextPeriod(2));
  else if(h===2&&S.ko&&tie)brk('FULL TIME','EXTRA TIME',()=>nextPeriod(3));
  else if(h===3)brk('EXTRA TIME - HALF TIME','ET 2ND HALF',()=>nextPeriod(4));
  else if(h===4&&S.ko&&tie)brk('EXTRA TIME OVER','PENALTIES',startShootout);
  else{S.mode='full';S.t=0;}
}
/* --- penalty shootout: 5 kicks each, early finish, then sudden death --- */
function startShootout(){
  if(S.subExits.length){S.pendingPeriodAction=startShootout;return;}
  // IFAB: both teams must have the same number of eligible players before kicks.
  for(const p of PITCH11Law.shootoutExclusions(P)){p.out=true;p.soExcluded=true;p.x=p.px=p.y=p.py=-400;p.vx=p.vy=p.ix=p.iy=0;}
  S.so={k:[[],[]],live:false,t:0,team:0,shooter:null,firstTeam:Math.random()<0.5?0:1,flipEnds:Math.random()<0.5?true:false,taken:[[],[]]};for(const p of P){p.shootoutPenaltyLineOffences=0;p.shootoutYC=0;}S.half=5;S.clock=0;soNext();
}
function soNext(){
  const so=S.so,t=PITCH11Law.shootoutNextTeam(so.k[0].length,so.k[1].length,so.firstTeam);
  if(!so.taken)so.taken=[[],[]];
  so.team=t;so.shooter=PITCH11Law.shootoutNextKicker(P,t,so.taken[t]);
  if(!so.shooter){S.mode='full';S.t=0;return;}
  const eligible=PITCH11Law.shootoutOrder(P,t);
  if(so.taken[t].filter(p=>eligible.includes(p)).length>=eligible.length)so.taken[t]=[];
  so.shooter=PITCH11Law.shootoutNextKicker(P,t,so.taken[t]);
  so.live=true;so.t=0;
  setupPen(t,so.shooter,true);S.mode='play';S.t=0;
}
const ballBeyondLine=(value,line,direction)=>direction>0?value>line+BR:value<line-BR;
const ballInsideGoalFrame=b=>Math.abs(b.y-CY)<=GOALH-BR&&b.z<=GOALZ-BR;
function soRules(){
  const so=S.so,b=ball;so.t+=DT;
  const decision=PITCH11Law.shootoutDecision({
    ball:b,shooterTeam:so.team,targetDirection:dirOf(so.team),
    left:PX0,right:PX1,top:PY0,bottom:PY1,centerY:CY,
    goalHalfWidth:GOALH,goalHeight:GOALZ,radius:BR,elapsed:so.t,restartActive:!!S.rs,doubleTouch:ball.shootoutDoubleTouch,deliberateDoubleTouch:ball.shootoutDeliberateDoubleTouch
  });
  if(decision==='retake'){soRetake();return;}
  if(decision==='goal'){soResult(true);return;}
  if(decision==='miss'){soResult(false);return;}
}
function soRetake(){
  const so=S.so,team=so.team,shooter=so.shooter;
  so.live=false;
  whistleStop(1.4,'PENALTY RETAKE','Accidental double touch',()=>{
    ball.dbl=null;ball.shootoutDoubleTouch=false;ball.shootoutDeliberateDoubleTouch=false;
    setupPen(team,shooter,true);
    S.mode='play';S.t=0;so.team=team;so.shooter=shooter;so.live=true;so.t=0;
  });
}
function soResult(ok){
  const so=S.so;so.live=false;so.k[so.team].push(ok);if(!so.taken)so.taken=[[],[]];if(so.shooter&&!so.taken[so.team].includes(so.shooter))so.taken[so.team].push(so.shooter);
  if(ok)burst(ball.x,ball.y,so.team);
  whistleStop(1.8,ok?'GOAL!':'NO GOAL','',soAfter);
}
function soAfter(){
  const a=S.so.k[0],b=S.so.k[1],sa=a.filter(Boolean).length,sb=b.filter(Boolean).length,ra=Math.max(0,5-a.length),rb=Math.max(0,5-b.length);
  const done=(a.length<5||b.length<5)?(sa>sb+rb||sb>sa+ra):(a.length===b.length&&sa!==sb);
  if(done){S.mode='full';S.t=0;}else soNext();
}
function burst(x,y,t){
  const cols=[KIT[t].shirt,'#ffffff','#ffd400'];
  for(let i=0;i<40;i++){const a=rnd(0,TAU),v=rnd(40,170);parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:rnd(0.8,1.6),c:cols[i%3]});}
}
function particles(){
  for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.x+=q.vx*DT;q.y+=q.vy*DT;q.vx*=0.97;q.vy*=0.97;q.l-=DT;if(q.l<=0)parts.splice(i,1);}
}
function goal(dr){
  const b=ball,t=dirOf(0)===dr?0:1;
  S.score[t]++;S.goalTeam=t;S.kick=1-t;S.mode='goal';S.t=0;S.adv=null;S.rs=null;
  S.scorer=(b.last&&b.last.team===t&&!b.last.gk&&!b.last.out)?b.last:firstIn(t);
  for(const p of P){p.dive=0;p.diveRecover=0;p.ix=p.iy=0;}
  burst(b.x,b.y,t);
  FX.shake=Math.max(FX.shake,13);
}
function celebrate(){
  const sc=S.scorer,gt=S.goalTeam,dr=dirOf(gt);
  for(const p of P){
    p.ix=p.iy=0;p.sp=false;
    if(p.gk||p.out||p.substitutionExiting||p.team!==gt)continue;
    if(p===sc){if(S.t<1.8)goTo(p,dr>0?PX1-20:PX0+20,sc.y<CY?PY0+25:PY1-25,true);}
    else if(sc){const dx=sc.x-p.x,dy=sc.y-p.y,d=Math.hypot(dx,dy);if(d>30){p.ix=dx/d;p.iy=dy/d;p.sp=true;}}
  }
}
/* --- stoppages --- */
function whistleStop(sec,big,sub,fn,hurt){                 // freeze play, show a message, then run fn
  completeEligiblePendingSubs();
  S.subWindowUsed=[false,false];
  S.mode='whistle';S.t=0;S.wt=sec;S.after=fn;S.inj=hurt||null;S.adv=null;msg(big,sub,sec);
  if(hurt)hurt.down=true;
  for(const p of P){p.ix=p.iy=0;p.sp=false;}I.shoot=false;I.chargeT=0;
}
function spot(team,x,y,gk,faceTo,kind){                    // place the nearest taker with the ball
  let tk=null,bd=1e9;
  for(let i=team*11;i<team*11+11;i++){const p=P[i];if(p.gk!==gk||p.out||p.inj||p.substitutionExiting)continue;const d=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);if(d<bd){bd=d;tk=p;}}
  if(!tk)tk=firstIn(team);
  tk.x=tk.px=x;tk.y=tk.py=y;tk.vx=tk.vy=0;tk.face=faceTo;tk.dive=0;tk.diveRecover=0;tk.stun=0;tk.kcd=0;
  const b=ball;
  b.x=b.px=x+Math.cos(faceTo)*10;b.y=b.py=y+Math.sin(faceTo)*10;b.z=b.pz=b.vz=b.vx=b.vy=b.spin=0;
  b.owner=tk;b.last=tk;b.receiver=null;b.protect=3;b.gkHold=0;b.gkHoldActive=false;b.gkHoldWarned=false;b.gkHoldShown=0;b.gkNoHands=null;b.gkNoHandsFrom=null;b.gkReleasedBy=null;b.restartDoubleTouchPending=null;clearOff();
  tk.poss=0;tk.freeze=gk?0.45:rnd(0.5,0.85);tk.force=false;
  S.rs={kind:kind||'drop',team,p:tk,x,y};S.adv=null;
  completeEligiblePendingSubs();
}
function outOfPlay(){
  if(S.adv){const a=S.adv;S.adv=null;a.fn();return;}      // ball died during advantage: take the foul
  const b=ball,lt=b.last?b.last.team:0;
  const boundary=PITCH11Law.firstOutBoundary({previousX:b.px,previousY:b.py,currentX:b.x,currentY:b.y,left:PX0,right:PX1,top:PY0,bottom:PY1,radius:BR});
  if(boundary==='goal-line'){
    const left=b.x<PX0,def=(dirOf(0)>0)===left?0:1;
    const crossingY=PITCH11Law.goalLineCrossingY({previousX:b.px,previousY:b.py,currentX:b.x,currentY:b.y,goalLine:left?PX0:PX1,direction:left?-1:1,radius:BR});
    if(lt===def){const cx=left?PX0+3:PX1-3,cy=crossingY<CY?PY0+3:PY1-3;spot(1-def,cx,cy,false,Math.atan2(CY-cy,CX-cx),'corner');S.rs.box=true;S.rs.r=PITCH11Law.cornerKickOpponentClearance({ballOffsetX:3,ballOffsetY:3,arcRadius:10,requiredDistance:91.5});}
    else {spot(def,left?PX0+40:PX1-40,CY,true,left?0:Math.PI,'gk');S.rs.goalLineCrossY=crossingY;}
  }else{
    const top=b.y<PY0;
    const crossingX=PITCH11Law.touchlineCrossingX({previousX:b.px,previousY:b.py,currentX:b.x,currentY:b.y,touchline:top?PY0:PY1,direction:top?-1:1,radius:BR});
    const x=clamp(crossingX,PX0+12,PX1-12),y=top?PY0-4:PY1+4;
    spot(1-lt,x,y,false,Math.atan2(CY-y,(CX-x)*0.3),'throw');
  }
}
function dropBall(t,recipientTeam){
  const x=clamp(ball.x,PX0+BR+0.1,PX1-BR-0.1),y=clamp(ball.y,PY0+BR+0.1,PY1-BR-0.1);
  const inferredTeam=recipientTeam??(ball.owner&&[0,1].includes(ball.owner.team)?ball.owner.team:PITCH11Law.predictedRestartTeam({
    x:ball.x,y:ball.y,vx:ball.vx,vy:ball.vy,z:ball.z,vz:ball.vz,gravity:BALL_GRAV,
    left:PX0,right:PX1,top:PY0,bottom:PY1,radius:BR,centerY:CY,goalHalfWidth:GOALH,goalHeight:GOALZ,
    lastTouchedTeam:t,directions:[dirOf(0),dirOf(1)]
  }));
  const recipient=PITCH11Law.droppedBallRecipient({x,y,left:PX0,right:PX1,centerY:CY,penaltyDepth:PEN_DEPTH,penaltyHalfWidth:PEN_WIDTH/2,directions:[dirOf(0),dirOf(1)],lastTouchedTeam:t,possessionTeam:inferredTeam});
  const keeper=GK[recipient.team],useKeeper=recipient.goalkeeper&&keeper&&!keeper.out&&!keeper.inj;
  spot(recipient.team,x,y,!!useKeeper,dirOf(recipient.team)>0?0:Math.PI,'drop');
  ball.dbl=null;ball.dblKind=null;ball.ind=true; // dropped-ball recipient may dribble, but a goal still needs another player's touch
  ball.x=ball.px=x;ball.y=ball.py=y;S.rs.r=40;                                                   // Law 8: everyone else remains at least 4 m away
}
function freeKick(t,x,y,ind){
  const d=dirOf(t),gx=d>0?PX1:PX0;
  const legalSpot=PITCH11Law.freeKickGoalAreaPosition({x,y,goalLine:gx,direction:d,centerY:CY,depth:SIX_DEPTH,halfWidth:SIX_WIDTH/2,indirect:!!ind});
  x=clamp(legalSpot.x,PX0+6,PX1-6);y=clamp(legalSpot.y,PY0+6,PY1-6);
  spot(t,x,y,false,Math.atan2(CY-y,gx-x),'fk');
  const rs=S.rs,dg=Math.hypot(gx-x,CY-y),ux=(gx-x)/dg,uy=(CY-y)/dg;
  rs.ind=!!ind;rs.r=91.5;
  if(dg<330){                                              // wall of 3 at 9.15 m, everyone else into the box
    rs.box=dg<300;rs.wx=x+ux*92;rs.wy=y+uy*92;rs.wnx=-uy;rs.wny=ux;
    const c=[];for(let i=(1-t)*11+1;i<(1-t)*11+11;i++)if(!P[i].out)c.push(P[i]);
    c.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));rs.wall=c.slice(0,3);
  }
}
function setupPen(t,sh,so){                                // everyone else waits outside the box (or at the halfway line in a shootout)
  const d=dirOf(t),gx=d>0?PX1:PX0,sx=gx-d*110,lx=so?CX:gx-d*205;let k=0;
  if(so&&S.so)S.so.kickAt=null;
  for(const p of P){
    p.vx=p.vy=p.ix=p.iy=0;p.dive=0;p.diveRecover=0;p.stun=p.kcd=p.freeze=0;p.force=false;p.down=false;
    if(p.out||p===sh)continue;
    if(p.gk){if(p.team===t){const pos=PITCH11Law.shootoutKickerGoalkeeperPosition({ownGoalLine:d>0?PX0:PX1,centerY:CY,penaltyHalfWidth:PEN_WIDTH/2});p.x=p.px=pos.x;p.y=p.py=pos.y;}else{p.x=p.px=gx-d*4;p.y=p.py=CY;}continue;}
    if(so){const a=(k++/20)*TAU;p.x=p.px=CX+Math.cos(a)*66;p.y=p.py=CY+Math.sin(a)*66;}
    else{p.x=p.px=lx+(p.team===t?-d:d)*14;p.y=p.py=PY0+40+(k++)*(PH-80)/20;}
  }
  sh.x=sh.px=sx-d*10;sh.y=sh.py=CY;sh.face=d>0?0:Math.PI;sh.poss=0;sh.freeze=1.2;
  const b=ball;b.x=b.px=sx;b.y=b.py=CY;b.z=b.pz=b.vx=b.vy=b.vz=b.spin=0;b.owner=sh;b.last=sh;b.receiver=null;b.protect=99;b.dbl=null;b.shootoutDoubleTouch=false;b.shootoutDeliberateDoubleTouch=false;clearOff();
  S.rs={kind:'pen',team:t,p:sh,x:sx,y:CY};S.adv=null;
  cam.x=cam.px=sx;cam.y=cam.py=CY;
  ctrl=t===0?sh:firstIn(0);
}
function restartClamp(){                                   // defenders keep 9.15 m from a free kick / corner
  const rs=S.rs;if(!rs||ball.owner!==rs.p)return;
  if(rs.kind==='pen'&&!S.so){                              // penalty: outside the area and at least 9.15 m from the spot
    const gx=dirOf(rs.team)>0?PX1:PX0,d=dirOf(rs.team),minArc=ARC_R+2;
    for(const p of P){
      if(p===rs.p||p.gk||p.out||p.substitutionExiting)continue;
      if((gx-p.x)*d<PEN_DEPTH+12&&Math.abs(p.y-CY)<PEN_WIDTH/2+12)p.x=gx-d*(PEN_DEPTH+12);
      const dx=p.x-rs.x,dy=p.y-rs.y,dist=Math.hypot(dx,dy);
      if(dist<minArc){const k=minArc/(dist||1);p.x=rs.x+dx*k;p.y=rs.y+dy*k;}
    }
    return;
  }
  if(rs.kind==='ko')for(const p of P){if(p===rs.p||p.out||p.substitutionExiting)continue;if(dirOf(p.team)>0){if(p.x>CX-2)p.x=CX-2;}else if(p.x<CX+2)p.x=CX+2;}   // all players except the kicker stay in their own half
  const R=rs.r??({ko:91.5,throw:20,gk:0,drop:40})[rs.kind];if(R===undefined)return;
  const attackDirection=dirOf(rs.team),ownGoalLine=attackDirection>0?PX0:PX1,opponentGoalLine=attackDirection>0?PX1:PX0;
  const ownPenaltyRestart=rs.kind==='fk'&&(rs.x-ownGoalLine)*attackDirection>=0&&
    (rs.x-ownGoalLine)*attackDirection<=PEN_DEPTH&&Math.abs(rs.y-CY)<=PEN_WIDTH/2;
  const opponentPenaltyRestart=rs.kind==='fk'&&(rs.x-opponentGoalLine)*(-attackDirection)>=0&&
    (rs.x-opponentGoalLine)*(-attackDirection)<=PEN_DEPTH&&Math.abs(rs.y-CY)<=PEN_WIDTH/2;
  for(const p of P){
    const goalLineDistanceException=PITCH11Law.restartGoalLineDistanceExemption({
      restartKind:rs.kind,
      onOwnGoalLine:Math.abs(p.x-opponentGoalLine)<=4.5*PLAYER_SCALE,
      betweenPosts:Math.abs(p.y-CY)<=GOALH-4.5*PLAYER_SCALE
    });
    const restrictedTeam=rs.kind==='drop'?false:(rs.kind==='ko'?p.team===rs.team:(p.team===rs.team||goalLineDistanceException));
    if(p===rs.p||p.out||p.substitutionExiting||restrictedTeam||(rs.wall&&rs.wall.includes(p)))continue;
    let dx=p.x-rs.x,dy=p.y-rs.y,d=Math.hypot(dx,dy);
    if(d<R){
      if(d<1e-6){const a=P.indexOf(p)*2.399963229728653;dx=Math.cos(a);dy=Math.sin(a);d=1;}
      p.x=rs.x+dx/d*R;p.y=rs.y+dy/d*R;p.vx=p.vy=0;
    }
    if(rs.kind==='gk'||ownPenaltyRestart||opponentPenaltyRestart){
      const gx=opponentPenaltyRestart?opponentGoalLine:ownGoalLine,dir=opponentPenaltyRestart?-attackDirection:attackDirection;
      const legal=PITCH11Law.goalKickOpponentPosition({x:p.x,y:p.y,goalLine:gx,direction:dir,penaltyDepth:PEN_DEPTH,halfWidth:PEN_WIDTH/2,centerY:CY,clearance:12});
      if(legal.x!==p.x){p.x=legal.x;p.vx=0;}
    }
  }
  if(rs.kind==='fk'&&rs.wall&&rs.wall.length>=3){
    const wallClearance=10;
    for(const p of P){
      if(p.team!==rs.team||p.out||p===rs.p)continue;
      for(let pass=0;pass<3;pass++)for(const w of rs.wall){
        if(!w||w.out)continue;
        let dx=p.x-w.x,dy=p.y-w.y,dist=Math.hypot(dx,dy);
        if(dist>=wallClearance)continue;
        if(dist<1e-6){dx=-(w.y-rs.y);dy=w.x-rs.x;dist=Math.hypot(dx,dy)||1;}
        p.x=w.x+dx/dist*wallClearance;p.y=w.y+dy/dist*wallClearance;p.vx=p.vy=0;
      }
    }
  }
}
/* --- fouls, cards, advantage --- */
function foul(p,o,behind,context){
  const b=ball,t=o.team,x=b.x,y=b.y,own=dirOf(p.team)>0?PX0:PX1;
  const pen=Math.abs(x-own)<165&&Math.abs(y-CY)<201.5;
  const d=dirOf(t),goalLine=d>0?PX1:PX0,distanceToGoal=(goalLine-o.x)*d;
  const ballControl=b.owner===o||Math.hypot(b.x-o.x,b.y-o.y)<22;
  const towardGoal=o.vx*d>8||Math.cos(o.face)*d>0.55;
  const laneWidth=50+Math.min(Math.max(distanceToGoal,0),380)*0.1;
  const defendersAhead=P.filter(q=>q.team!==t&&!q.out&&(q.x-o.x)*d>0&&
    (goalLine-q.x)*d>=0&&(q.gk||Math.abs(q.y-o.y)<laneWidth)).length;
  const attackersAhead=P.filter(q=>q.team===t&&q!==o&&!q.out&&(q.x-o.x)*d>0&&
    (goalLine-q.x)*d>=0&&Math.abs(q.y-o.y)<laneWidth).length;
  const dogso=PITCH11Law.dogsoOpportunity({distanceToGoal,lateralDistance:Math.abs(o.y-CY),
    defendersAhead,attackersAhead,ballControl,towardGoal});
  const hurt=Math.random()<0.12?o:null,prog=((x-(d>0?PX0:PX1))*d)/PW;
  const spa=!dogso&&distanceToGoal>0&&distanceToGoal<650&&Math.abs(o.y-CY)<300&&ballControl&&towardGoal&&prog>0.4;
  const advantagePossible=!hurt&&prog>0.45&&(!pen||!dogso);
  const advantageDogso=dogso&&!pen&&advantagePossible&&!(context&&context.seriousFoulPlay)&&
    !(context&&context.reckless&&p.yc>0);
  const cardBase=PITCH11Law.foulCardDecision({
    seriousFoulPlay:!!(context&&context.seriousFoulPlay),
    reckless:!!(context&&context.reckless),dogso,penaltyArea:pen,
    attemptToPlayBall:!!(context&&context.attemptToPlayBall),
    stopsPromisingAttack:spa&&!pen&&!advantagePossible,alreadyBooked:p.yc>0
  });
  const card=advantageDogso?(context&&context.reckless?(p.yc>0?3:1):0):cardBase;
  const deferCaution=advantagePossible&&card===1;
  if((card===1||card===3)&&!deferCaution)p.yc++;
  const fn=pen?()=>setupPen(t,firstIn(t),false):()=>freeKick(t,x,y,false);
  if(card&&!deferCaution)giveCard(p,card);
  if(hurt){hurt.inj=true;hurt.law5FoulSanction=card>0;hurt.law5AssessmentQuickly=card>0;hurt.law5PenaltyKicker=pen&&firstIn(t)===o;}
  // IFAB Law 3: play cannot continue once a team has fewer than seven players.
  if(PITCH11Law.matchAbandonmentDecision(P,p.team,7,!!S.so)==='abandon'){
    S.forfeitTeam=p.team;S.mode='full';S.t=0;S.adv=null;S.rs=null;S.inj=null;
    for(const q of P){q.ix=q.iy=0;q.sp=false;}
    msg('MATCH ABANDONED',KIT[p.team].name+' has fewer than seven players',3);
    return;
  }
  o.stun=0.5;o.kcd=0.6;
  if(advantagePossible&&card<2){
    const advDogso=advantageDogso&&card===0;
    S.adv={team:t,t:2.5,fn,offender:p,dogso:advDogso,caution:deferCaution};
    msg('ADVANTAGE','',1.3);
  }else{whistleStop(hurt?3:1.4,pen?'PENALTY':'FOUL',tag(p),fn,hurt);if(hurt)msg('INJURY',tag(hurt)+' is down',3);}
}
function giveCard(p,c){
  S.card={t:3,c:c===1?'#ffd400':'#e5342b',txt:(c===3?'2ND YELLOW  ':c===1?'YELLOW  ':'RED  ')+tag(p)};
  if(c>1){p.out=true;S.reds[p.team]++;p.x=p.px=p.y=p.py=-400;p.vx=p.vy=0;if(ctrl===p)ctrl=null;}
}
function callOffside(p){const t=1-p.team,x=p.x,y=p.y;whistleStop(1.4,'OFFSIDE',tag(p),()=>freeKick(t,x,y,true));}
function randInjury(){
  const p=P[Math.floor(Math.random()*22)];if(p.gk||p.out||p.inj)return;
  p.inj=true;const t=ball.owner?ball.owner.team:ball.last?ball.last.team:0;
  whistleStop(3,'INJURY',tag(p)+' is down',()=>dropBall(t),p);
}
/* --- substitutions (5 per team, bench of 7) --- */
function applySubstitution(p,bn,position){
  if(!p||!bn)return false;
  const wasCaptain=!!p.captain,oldNum=p.num,t=p.team;
  const incomingEquipment=bn.equipment||standardPlayerEquipment();
  const equipmentDecision=PITCH11Law.equipmentInspectionDecision(incomingEquipment);
  if(equipmentDecision!=='allow'){msg('EQUIPMENT CHECK',equipmentDecision==='remove-item'?'UNSAFE ITEM MUST BE REMOVED':'COMPULSORY KIT MUST BE REPLACED',2);return false;}
  p.num=bn.num;p.nm=bn.nm||'';p.skin=bn.skin;p.st=bn.st;p.equipment={...incomingEquipment,inspected:true};p.captain=false;
  p.winded=false;p.stam=1;p.fat=0;p.yc=0;p.inj=p.down=p.limp=false;p.out=false;
  p.substitutionPending=false;p.substitutionExiting=false;p.vx=p.vy=p.ix=p.iy=0;
  p.x=p.px=CX;p.y=p.py=clamp(position.y,PY0+20,PY1-20);
  if(wasCaptain)assignCaptain(t,p);
  if(typeof FO!=='undefined'){FO.board=oldNum+' > '+bn.num;FO.boardT=3;}
  msg('SUBSTITUTION',KIT[t].name+' #'+bn.num+' on',1.6);
  return true;
}
function substitutionExitTarget(p){
  const candidates=[
    {x:PX0,y:clamp(p.y,PY0,PY1)},
    {x:PX1,y:clamp(p.y,PY0,PY1)},
    {x:clamp(p.x,PX0,PX1),y:PY0},
    {x:clamp(p.x,PX0,PX1),y:PY1}
  ];
  let best=candidates[0],distance=Infinity;
  for(const q of candidates){const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<distance){distance=d;best=q;}}
  return {x:best.x,y:best.y,distance};
}
function doSub(p,bn){
  const t=p.team;
  const halftime=S.mode==='half'||(S.mode==='subs'&&S.ret==='half');
  const inStoppage=S.mode==='whistle'||(S.mode==='subs'&&S.ret==='whistle');
  const eligibility=PITCH11Law.substitutionEligibility({used:S.subs[t],windows:S.subWindows[t],inStoppage,halftime,windowUsed:S.subWindowUsed[t]});
  if(p.out||!eligibility.allowed||p.gk!==(bn.pos==='GK')||BENCH[t].indexOf(bn)<0)return false;
  const incomingEquipment=bn.equipment||standardPlayerEquipment();
  if(PITCH11Law.equipmentInspectionDecision(incomingEquipment)!=='allow'){
    msg('EQUIPMENT CHECK',PITCH11Law.equipmentInspectionDecision(incomingEquipment)==='remove-item'?'UNSAFE ITEM MUST BE REMOVED':'COMPULSORY KIT MUST BE REPLACED',2);return false;
  }
  const position={x:p.x,y:p.y},exit=substitutionExitTarget(p);
  if(p.inj||p.safetyExitException){
    if(eligibility.consumesWindow){S.subWindows[t]++;S.subWindowUsed[t]=true;}
    S.subs[t]++;BENCH[t].splice(BENCH[t].indexOf(bn),1);
    return applySubstitution(p,bn,position);
  }
  if(eligibility.consumesWindow){S.subWindows[t]++;S.subWindowUsed[t]=true;}
  S.subs[t]++;BENCH[t].splice(BENCH[t].indexOf(bn),1);
  for(const e of S.subExits)e.elapsed=0;
  S.subExits.push({player:p,bench:bn,position,target:exit,elapsed:0,team:t,exitSeconds});
  p.inj=p.down=p.limp=false;p.substitutionExiting=true;p.vx=p.vy=p.ix=p.iy=0;p.sp=false;
  msg('SUBSTITUTION','Player leaving at nearest touchline',1.2);
  return true;
}
function tickSubstitutionExits(){
  if(!S.subExits.length)return;
  for(let i=S.subExits.length-1;i>=0;i--){
    const e=S.subExits[i],p=e.player;
    if(!p||!e.bench){S.subExits.splice(i,1);continue;}
    e.elapsed+=DT;
    const dx=e.target.x-p.x,dy=e.target.y-p.y,d=Math.hypot(dx,dy),step=28*DT;
    if(d>step){p.x+=dx/d*step;p.y+=dy/d*step;p.px=p.x;p.py=p.y;}
    else{p.x=p.px=e.target.x;p.y=p.py=e.target.y;}
    const remaining=Math.max(0,d-step);
    const decision=PITCH11Law.timeLimitedSubstitutionExitDecision({
      elapsedSeconds:e.elapsed,
      nearOrCrossingExit:e.elapsed>=10&&remaining<=12
    });
    if(decision==='allow'||(d<=step&&e.elapsed<10)){
      applySubstitution(p,e.bench,e.position);S.subExits.splice(i,1);
    }else if(decision==='delay-substitute'){
      p.substitutionPending=true;S.subExitRunners.push(e);
      S.pendingSubs.push({player:p,bench:e.bench,position:e.position,team:e.team,running:false,elapsed:0});
      S.subExits.splice(i,1);
      msg('SUBSTITUTE DELAYED','Player must still leave; substitute waits one minute',2.2);
    }
  }
  if(!S.subExits.length&&S.pendingSubsResume){S.pendingSubsResume=false;S.mode=S.ret;}
  if(!S.subExits.length&&S.pendingPeriodAction){const fn=S.pendingPeriodAction;S.pendingPeriodAction=null;fn();}
}
function tickSubExitRunners(){
  for(let i=S.subExitRunners.length-1;i>=0;i--){
    const e=S.subExitRunners[i],p=e.player;
    if(!p){S.subExitRunners.splice(i,1);continue;}
    const dx=e.target.x-p.x,dy=e.target.y-p.y,d=Math.hypot(dx,dy),step=28*DT;
    if(d>step){p.x+=dx/d*step;p.y+=dy/d*step;p.px=p.x;p.py=p.y;}
    else{
      p.x=p.px=p.y=p.py=-400;p.out=true;p.substitutionExiting=false;p.vx=p.vy=p.ix=p.iy=0;
      S.subExitRunners.splice(i,1);
    }
  }
}
function startPendingSubstitutionClocks(){for(const q of S.pendingSubs)q.running=false;}
function tickPendingSubstitutionClocks(){
  if(S.mode!=='play'||S.rs)return;
  for(const q of S.pendingSubs){if(!q.running){q.running=true;q.elapsed=0;}else q.elapsed+=DT;}
}
function completeEligiblePendingSubs(){
  for(let i=S.pendingSubs.length-1;i>=0;i--){
    const q=S.pendingSubs[i];
    if(PITCH11Law.timeLimitedSubstitutionEntryDecision({elapsedSinceRestart:q.elapsed,firstStoppage:true,playerExited:q.player&&q.player.out===true})!=='allow')continue;
    applySubstitution(q.player,q.bench,q.position);S.pendingSubs.splice(i,1);
    msg('SUBSTITUTE ENTERED','One-minute delay completed',1.8);
  }
}
function aiSubs(t,max,q){                                  // swap injured / tired players
  let n=0;
  while(n<max&&S.subs[t]<5&&BENCH[t].length){
    let p=q&&!q.out?q:null;
    if(!p)for(let i=t*11+1;i<t*11+11;i++){const c=P[i];if(!c.out&&(c.inj||c.fat>0.38)&&(!p||c.fat>p.fat))p=c;}
    if(!p)break;
    const bn=BENCH[t].find(b=>b.pos===p.pos)||BENCH[t].find(b=>b.pos!=='GK');
    if(!bn||!doSub(p,bn))break;
    n++;q=null;
  }
}
function injured(q){                                       // after the stoppage: substitute, or apply the one-minute off-field protocol
  const t=q.team;q.down=false;
  const eligibility=PITCH11Law.substitutionEligibility({used:S.subs[t],windows:S.subWindows[t],inStoppage:true,halftime:false,windowUsed:S.subWindowUsed[t]});
  if(!eligibility.allowed||!BENCH[t].length){q.limp=true;sendOffForAssessment(q);return false;}
  if(t===1){aiSubs(1,1,q);if(q.inj&&!q.out)sendOffForAssessment(q);return false;}
  S.sel=q;openSubs('whistle');return true;
}
function openSubs(ret,manualPause=false){S.ret=ret;S.manualPause=manualPause===true;S.mode='subs';M.conf=0;}
function resumeSubs(){S.manualPause=false;M.instr=0;for(const p of P)if(p.inj&&!p.out){p.limp=true;sendOffForAssessment(p);}S.sel=null;S.pv=null;if(S.subExits.length){S.pendingSubsResume=true;return;}S.mode=S.ret;}
function rules(){
  const b=ball;
  if(b.restartDoubleTouchPending){
    const event=b.restartDoubleTouchPending;b.restartDoubleTouchPending=null;b.dbl=null;
    const decision=event.decision||PITCH11Law.restartSecondTouchRestart({isKicker:true,restartKind:event.kind});
    if(decision==='indirect-free-kick'||decision==='direct-free-kick'){
      whistleStop(1.2,'SECOND TOUCH',decision==='indirect-free-kick'?'Indirect free kick':'Direct free kick',
        ()=>freeKick(1-event.player.team,event.x,event.y,decision==='indirect-free-kick'));
      return;
    }
    if(decision==='penalty'){
      whistleStop(1.2,'PENALTY','Second-touch offence',()=>setupPen(1-event.player.team,firstIn(1-event.player.team),false));
      return;
    }
  }
  if(S.so&&S.so.live){soRules();return;}
  if(b.gkNoHands!==null&&b.last!==b.gkNoHandsFrom&&b.last!==GK[b.gkNoHands]){b.gkNoHands=null;b.gkNoHandsFrom=null;}
  if(b.gkReleasedBy&&b.last!==b.gkReleasedBy)b.gkReleasedBy=null;
  if(b.gkHoldActive&&b.owner&&b.owner.gk){
    const keeper=b.owner,d=dirOf(keeper.team),gx=d>0?PX0:PX1;
    const insideArea=(b.x-gx)*d>=0&&(b.x-gx)*d<=PEN_DEPTH&&Math.abs(b.y-CY)<=PEN_WIDTH/2;
    const secondTouch=b.gkReleasedBy===keeper,prohibitedPass=b.gkNoHands===keeper.team;
    const handlingRestart=PITCH11Law.goalkeeperIllegalHandlingRestart(insideArea,prohibitedPass||secondTouch);
    if(handlingRestart){
      const x=b.x,y=b.y;b.gkNoHands=null;b.gkNoHandsFrom=null;b.gkReleasedBy=null;b.gkHold=0;b.gkHoldWarned=false;b.gkHoldShown=0;b.gkHoldActive=false;
      const label=!insideArea?'HANDBALL':secondTouch?'SECOND TOUCH':'BACK-PASS / THROW-IN';
      whistleStop(1.4,label,'Goalkeeper handled the ball illegally',()=>freeKick(1-keeper.team,x,y,handlingRestart==='indirect-free-kick'));return;
    }
    b.gkHold+=DT;
    if(!b.gkHoldWarned&&b.gkHold>=3){b.gkHoldWarned=true;b.gkHoldShown=5;msg('GOALKEEPER 5-SECOND COUNTDOWN','5',1.1);}else if(b.gkHoldWarned){const remaining=Math.max(1,Math.ceil(8-b.gkHold));if(remaining!==b.gkHoldShown){b.gkHoldShown=remaining;msg('GOALKEEPER 5-SECOND COUNTDOWN',String(remaining),1.1);}}
    if(PITCH11Law.goalkeeperHandControlDecision(true,b.gkHold)==='corner'){
      const x=gx===PX0?PX0+3:PX1-3,y=b.y<CY?PY0+3:PY1-3;
      const topY=PY0+3,bottomY=PY1-3;
      const cy=!keeper?bottomY:(Math.hypot(keeper.x-x,keeper.y-topY)<=Math.hypot(keeper.x-x,keeper.y-bottomY)?topY:bottomY);
      const violations=(keeper.gkHoldOffences||0)+1;keeper.gkHoldOffences=violations;
      const sanction=PITCH11Law.goalkeeperHoldSanction(violations);
      if(sanction!=='none'){
        keeper.yc++;giveCard(keeper,keeper.yc>=2?3:1);
        if(PITCH11Law.matchAbandonmentDecision(P,keeper.team,7,!!S.so)==='abandon'){
          S.forfeitTeam=keeper.team;S.mode='full';S.t=0;S.adv=null;S.rs=null;S.inj=null;
          msg('MATCH ABANDONED',KIT[keeper.team].name+' has fewer than seven players',3);return;
        }
      }
      spot(1-keeper.team,x,cy,false,Math.atan2(CY-cy,CX-x),'corner');S.rs.box=true;S.rs.r=PITCH11Law.cornerKickOpponentClearance({ballOffsetX:3,ballOffsetY:3,arcRadius:10,requiredDistance:91.5});
      msg('8-SECOND VIOLATION','CORNER KICK',2);return;
    }
  }else if(!b.gkHoldActive){b.gkHold=0;b.gkHoldWarned=false;b.gkHoldShown=0;}
  const goalDirection=b.x>PX1?1:-1,scoringTeam=dirOf(0)===goalDirection?0:1;
  const keeperThrowDecision=PITCH11Law.goalkeeperThrowGoalDecision({releasedByGoalkeeper:!!b.gkReleasedBy,lastTouchIsThrower:b.gkReleasedBy===b.last,keeperTeam:b.gkReleasedBy&&b.gkReleasedBy.team,scoringTeam});
  const directRestartDecision=PITCH11Law.directRestartGoalDecision({restartKickerTeam:b.dbl===b.last&&b.dbl?b.dbl.team:null,restartKind:b.dbl===b.last&&b.dbl?b.dblKind:null,scoringTeam});
  if(!b.ind&&keeperThrowDecision==='goal'&&directRestartDecision==='goal'&&ballInsideGoalFrame(b)&&(ballBeyondLine(b.x,PX0,-1)||ballBeyondLine(b.x,PX1,1))){goal(goalDirection);return;}
  if(ballBeyondLine(b.x,PX0,-1)||ballBeyondLine(b.x,PX1,1)||ballBeyondLine(b.y,PY0,-1)||ballBeyondLine(b.y,PY1,1)){outOfPlay();return;}
  if(S.adv){
    const a=S.adv;a.t-=DT;
    if(b.owner&&b.owner.team!==a.team){
      S.adv=null;
      if(a.dogso||a.caution)issueAdvantageCaution(a.offender);
      whistleStop(1.2,'NO ADVANTAGE','',a.fn);return;
    }
    if(a.t<=0){
      S.adv=null;
      if(a.dogso||a.caution)S.pendingCard={player:a.offender,card:1,goalExempt:!!a.dogso};
    }
  }
  if(!S.prac)S.clock+=DT;
  if(!S.prac){refreshLaw7AddedTime();if(PITCH11Law.periodEndDecision({clock:S.clock,regulationSeconds:plen(),addedSeconds:S.addedTime,inPlay:S.mode==='play'})==='end')endHalf();}
}

/* ===================== 10. LOOP (fixed 60 Hz step, interpolated render) ===================== */
function snap(){
  for(const p of P){p.px=p.x;p.py=p.y;}
  ball.px=ball.x;ball.py=ball.y;ball.pz=ball.z;
  cam.px=cam.x;cam.py=cam.y;cam.pv=cam.v;
}
function camUpdate(){
  const b=ball,sp=Math.hypot(b.vx,b.vy);
  let tx=b.x+b.vx*0.28,ty=b.y+b.vy*0.2;
  if(ctrl&&!ctrl.out){tx=(tx+ctrl.x)/2;ty=(ty+ctrl.y)/2;}   // keep the controlled player and ball in view
  if(S.mode==='goal'&&S.t>0.7&&S.scorer){tx=S.scorer.x;ty=S.scorer.y;}
  cam.tx=cam.tx===undefined?tx:cam.tx+(tx-cam.tx)*0.25;cam.ty=cam.ty===undefined?ty:cam.ty+(ty-cam.ty)*0.25;   // low-pass the target so kicks and tackles don't jerk the camera
  const dist=Math.hypot(cam.tx-cam.x,cam.ty-cam.y),k=0.07+Math.min(0.15,Math.max(0,dist-100)/1200);             // catch up faster after long passes / restarts, glide when close
  cam.x+=(cam.tx-cam.x)*k;cam.y+=(cam.ty-cam.y)*k;
  cam.v+=(400+Math.min(sp,600)*0.1-(S.mode==='goal'?25:0)-cam.v)*0.03;   // slight zoom out when the ball is fast
}
function update(){
  if(H>W)return;                                         // pause the entire simulation before timers or actions advance in portrait
  snap();
  S.t+=DT;
  if(S.msg&&S.msg.t>0)S.msg.t-=DT;
  if(S.card&&S.card.t>0)S.card.t-=DT;
  if(toast.t>0)toast.t-=DT;
  tickSubstitutionExits();tickPendingSubstitutionClocks();tickSubExitRunners();
  if(FX.hit>0){FX.hit--;camUpdate();return;}               // brief hit-stop on big tackles
  FX.shake=Math.max(0,FX.shake-0.8);
  updateInput();gestureTick();
  const m=S.mode;
  if(m==='menu'||m==='half'||m==='full'||m==='subs'){camUpdate();endEdges();return;}
  if(m==='kickoff'){
    stepBall();
    if(S.t>1.5){S.mode='play';S.t=0;startPendingSubstitutionClocks();}
    camUpdate();endEdges();return;
  }
  if(m==='whistle'){
    camUpdate();
    if(S.t>S.wt){
      if(S.subExits.length){endEdges();return;}
      if(S.inj){const q=S.inj;S.inj=null;if(injured(q)){endEdges();return;}}
      S.mode='play';S.t=0;startPendingSubstitutionClocks();
      if(!S.so&&S.half===2&&gmin()>60&&Math.random()<0.35)aiSubs(1,1);
      const f=S.after;S.after=null;if(f)f();
    }
    endEdges();return;
  }
  for(const p of P){
    if(p.kcd>0)p.kcd-=DT;if(p.tcd>0)p.tcd-=DT;if(p.stun>0)p.stun-=DT;if(p.react>0)p.react-=DT;if(p.skill>0)p.skill-=DT;if(p.jump>0)p.jump-=DT;
    if(ball.owner===p)p.poss+=DT;
  }
  if(S.swCd>0)S.swCd-=DT;
  if(ball.protect>0)ball.protect-=DT;if(ball.hcd>0)ball.hcd-=DT;if(ball.contactPickupTicks>0)ball.contactPickupTicks=Math.max(0,ball.contactPickupTicks-1);
  teamInfo();
  if(m==='play'){
    autoSwitch();
    const pen=S.rs&&S.rs.kind==='pen';
    for(const p of P){
      if(p.out||p.substitutionExiting)continue;
      if(S.so&&S.so.live&&p!==S.so.shooter&&!(p.gk&&p.team!==S.so.team)){p.ix=p.iy=0;p.sp=false;continue;} // shootout: only the kicker and defending goalkeeper may move
      if(pen&&p!==S.rs.p&&!p.gk){p.ix=p.iy=0;p.sp=false;continue;}   // penalty: everyone else waits
      if(p===ctrl)humanAct(p);else if(S.prac&&p.team&&!p.gk){p.ix=p.iy=0;p.sp=false;p.kcd=9;}else aiPlayer(p);
    }
    if(!S.adv&&!S.rs&&!S.so&&S.mode==='play'&&!S.prac&&Math.random()<DT*0.0006)randInjury();
  }else celebrate();
  for(const p of P)integrate(p);
  separate();
  restartClamp();
  stepBall();
  if(m==='play'){
    touches();
    if(S.mode==='play'){gkReact(GK[0]);gkReact(GK[1]);rules();}
    if(S.rs&&ball.owner!==S.rs.p)S.rs=null;                // the set piece has been taken
  }
  else if(S.t>3.4)setupKickoff(S.kick);
  particles();
  camUpdate();
  endEdges();
}
let last=performance.now(),acc=0,slow=0,stableFrames=0,qualityCooldown=0;
function frame(now){
  requestAnimationFrame(frame);
  let dt=(now-last)/1000;last=now;
  const frameMs=dt*1000;
  if(dt>0.1)dt=0.1;if(FX.slow>0){FX.slow-=dt;dt*=0.4;}
  qualityCooldown=Math.max(0,qualityCooldown-dt);
  if(frameMs>100){stableFrames=0;slow=0;}else if(frameMs>22){stableFrames=0;if(++slow>=90&&qualityCooldown<=0){setRenderScale(renderScale-0.1);slow=0;qualityCooldown=2;}}
  else if(frameMs<18){slow=Math.max(0,slow-2);if(++stableFrames>=360&&qualityCooldown<=0&&renderScale<maxRenderScale-0.025){setRenderScale(Math.min(maxRenderScale,renderScale+0.05));stableFrames=0;qualityCooldown=5;}}
  else{stableFrames=0;slow=Math.max(0,slow-1);}   // Adaptive render scale: sustained slow frames lower resolution; sustained headroom restores it.
  acc+=dt;let n=0;
  while(acc>=DT&&n<4){update();acc-=DT;n++;}
  if(n===4)acc=0;
  render(acc/DT);
}
