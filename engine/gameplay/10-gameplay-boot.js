'use strict';
/* ===================== PITCH 11 - GAMEPLAY 3.0 =====================
   Safe integration layer:
   - adaptive dribble touch based on pace, control, stamina, turn and pressure
   - prevent a second keeper-save reaction while the keeper is already diving
   Existing team tactics, collision response, ball physics and animation rigs remain
   the source of truth; this layer only refines their hand-off points.
   ================================================================== */
const _gkReact30=gkReact;
gkReact=function(p){
  // Keep checking the ball during an active dive: the base save solver uses its
  // larger dive reach to catch/parry the shot. Only aiGK owns dive initiation.
  _gkReact30(p);
};
/* Dribble target and follow are calculated only in stepBall(); no second position writer. */
/* Existing AI already includes support runs, width, cover, pressing, marking and
   onside-aware movement. Existing separate()/bodyCollide() already resolve
   player spacing and ball-body impacts; do not stack a second collision solver. */

/* Gameplay 3.0 contact response: small, mass-aware momentum transfer on closing
   player contacts. Position separation remains owned by the existing solver. */
const _separate30=separate;
separate=function(){
  const contacts=[];
  for(let i=0;i<22;i++){
    const a=P[i];if(a.out||a.dive>0)continue;
    for(let j=i+1;j<22;j++){
      const b=P[j];if(b.out||b.dive>0)continue;
      const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
      if(d<12&&d>0.1){
        const nx=dx/d,ny=dy/d,closing=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
        if(closing< -8)contacts.push({a,b,nx,ny,closing:-closing});
      }
    }
  }
  _separate30();
  for(const c of contacts){
    const {a,b,nx,ny,closing}=c;
    if(a.out||b.out||a.dive>0||b.dive>0)continue;
    const ma=0.75+clamp(a.st.phys,0,1),mb=0.75+clamp(b.st.phys,0,1);
    const impulse=clamp(closing*0.10,0,14);
    a.vx-=nx*impulse*mb/(ma+mb);a.vy-=ny*impulse*mb/(ma+mb);
    b.vx+=nx*impulse*ma/(ma+mb);b.vy+=ny*impulse*ma/(ma+mb);
  }
};
/* Match the existing stun slowdown with a restrained visual balance reaction;
   the original kick, pass, tackle and goalkeeper dive poses remain authoritative. */
const _animInfo30=animInfo;
animInfo=function(p){
  const q=_animInfo30(p);
  if(p&&q&&!q.dive&&!q.down&&p.stun>0){
    const f=clamp(p.stun/0.5,0,1);
    q.wob=(q.wob||0)+Math.sin(S.t*17+p.role)*0.12*f;
    q.bob+=(0.35*f);
  }
  return q;
};

/* Gameplay 3.0 completion: coordinated counter-press and forward-line movement.
   The existing tactical AI remains authoritative; these are targeted extensions. */
const _defendGameplay30=defend22;
defend22=function(p,o,c){
  const t=p.team,ba=clamp(al22(p,ball.x),0,PW),dist=Math.hypot(o.x-p.x,o.y-p.y);
  const beaten=al22(p,o.x)<al22(p,p.x)-10;
  if(T22.lost[t]>0&&ba>PW*0.3&&dist<120&&p.line===2&&c.cover!==p&&!beaten){
    const gx=ownGX(p),gl=Math.hypot(gx-o.x,CY-o.y)||1;
    const tx=o.x+o.vx*0.18+(gx-o.x)/gl*16;
    const ty=o.y+o.vy*0.18+(CY-o.y)/gl*16;
    go22(p,tx,ty,true);
    if(dist<42)closeIn(p,o);
    tackleTry(p,TUNING.df.auto.chance*(t?0.85*DIF[G.diff].tk:1),1);
    return;
  }
  _defendGameplay30(p,o,c);
};
const _attackGameplay30=attack22;
attack22=function(p,o,c){
  _attackGameplay30(p,o,c);
  // Preserve the existing support-triangle and winger-width decisions.
  if(c.sup.includes(p)||p.role!==9||p.line!==3)return;
  const d=dirOf(p.team),gx=ownGX(p),off=TI[p.team].off,ba=clamp(al22(p,ball.x),0,PW);
  const lead=clamp(82+ba*0.1+(p.st.pace-0.7)*28,65,145);
  const ahead=clamp(ba+lead,65,PW-35);
  const tx=gx+d*ahead;
  const ty=clamp(CY+(o.y-CY)*0.22+(p.y-CY)*0.12,PY0+45,PY1-45);
  if(tx*d>off-8&&ball.x*d<=off)go22(p,(off-8)*d,ty,true);
  else go22(p,tx,ty,Math.hypot(tx-p.x,ty-p.y)>65);
};
/* Goalkeeper AI 2.1: avoid an animated dive when the keeper is already at the
   predicted save point or cannot physically cover the required distance in time. */
const _aiGK21=aiGK;
aiGK=function(p){
  const oldDive=p.dive,oldShot=p.divedShot;
  _aiGK21(p);
  if(oldDive<=0&&p.dive>0&&p.divedShot!==oldShot){
    const d=dirOf(p.team),gx=ownGX(p),D=gx-ball.x,k=ball.z>2?KA:KG,r=D*k/ball.vx;
    if(D/ball.vx>0&&r>0&&r<0.95){
      const tt=-Math.log(1-r)/k,yp=ball.y+ball.vy/ball.vx*D;
      const tx=gx+d*4,ty=clamp(yp+p.err,CY-GOALH+BR,CY+GOALH-BR);
      const dist=Math.hypot(tx-p.x,ty-p.y),travel=p.dive*Math.hypot(p.vx,p.vy);
      if(dist<6){p.dive=0;p.vx=p.vy=0;}
      else if(dist>travel+4){p.dive=0;p.vx=p.vy=0;goTo(p,tx,ty,false);}
    }
  }
};
/* Goalkeeper post-dive recovery: keep the saved position while the keeper gets back to their feet. */
const _aiGKPostDiveRecovery=aiGK;
aiGK=function(p){
  if(!p)return;
  if((p.diveRecover||0)>0){
    p.diveRecover=Math.max(0,p.diveRecover-DT);
    p.ix=p.iy=0;
    p.vx=p.vy=0;
    return;
  }
  const wasDiving=p.dive>0;
  _aiGKPostDiveRecovery(p);
  if(wasDiving&&p.dive<=0){
    p.diveRecover=0.68;
    p.ix=p.iy=0;
    p.vx=p.vy=0;
  }
};
/* ===================== BOOT ===================== */

addEventListener('p11stadiumready',()=>{if(window.P11Stadium&&window.P11Stadium.setGoalDimensions)window.P11Stadium.setGoalDimensions({halfWidth:GOALH/10,height:GOALZ/10,depth:GOALD/10});});

addEventListener('resize',resize);
addEventListener('orientationchange',resize);
if(window.visualViewport)window.visualViewport.addEventListener('resize',resize);
if(typeof ResizeObserver!=='undefined'){const gameCanvasObserver=new ResizeObserver(resize);gameCanvasObserver.observe(cv);}
resize();
const _resetSaveSettingsAudit=resetSave;
resetSave=function(){
  _resetSaveSettingsAudit();
  G.cfg={pitch:1,goal:1,ball:1,player:1};G.mbg=0;M.ctab=0;M.conf=0;
  fixX();applyX();fixRf();fixAssistSettings();fixControlSettings();applyConfig();syncLayout();save();
};
load();fixX();applyX();fixRf();fixAssistSettings();fixControlSettings();
G.mbg=Number.isInteger(G.mbg)&&G.mbg>=0&&G.mbg<=20?G.mbg:0;
applyConfig();syncLayout();M.opp=nextOpp();newMatch();S.mode='menu';S.t=0;
requestAnimationFrame(frame);

/* Law 15: every attacking action button can execute the throw-in, but
   it must always use the two-handed overhead delivery (never a foot kick). */
const _humanThrowLaw=humanAct;
humanAct=function(p){
  const rs=S.rs;
  if(rs&&rs.kind==='throw'&&rs.p===p&&ball.owner===p){
    const actionPressed=!!(I.shoot||I.shootUp||I.pass||I.thru||I.lob||I.skill);
    if(actionPressed){
      if(SPA.rs!==rs){SPA.rs=rs;spInit(rs);}
      SPA.on=true;
      restKick(p);
      I.shoot=I.shootUp=I.pass=I.thru=I.lob=I.skill=false;
      I.chargeT=0;
      return;
    }
    const saved={shoot:I.shoot,shootUp:I.shootUp,pass:I.pass,thru:I.thru,lob:I.lob,skill:I.skill,sw:I.sw,tackle:I.tackle,swp:I.swp,chargeT:I.chargeT};
    I.shoot=I.shootUp=I.pass=I.thru=I.lob=I.skill=I.sw=I.tackle=I.swp=false;
    I.chargeT=0;
    try{_humanThrowLaw(p);}finally{Object.assign(I,saved);}
    return;
  }
  _humanThrowLaw(p);
};

/* IFAB Law 14: goalkeeper line position is checked at the instant of the penalty kick. */
function clearPenaltyLineState(){
  ball.penaltyTeam=null;ball.penaltyKicker=null;ball.penaltyKeeper=null;
  ball.penaltyKeeperOffLine=false;ball.penaltyKeeperSaved=false;
  ball.penaltyKeeperImpactedKicker=false;ball.penaltyRetakePending=false;
  ball.penaltyWasShootout=false;ball.penaltyOtherPlayerTouched=false;ball.penaltyLastTouch=null;ball.penaltyDoubleTouch=false;ball.pen=false;
}
const _setupPenLine=setupPen;
setupPen=function(t,sh,so){clearPenaltyLineState();_setupPenLine(t,sh,so);const keeper=GK[1-t];if(keeper&&!keeper.out)keeper.face=Math.atan2(sh.y-keeper.y,sh.x-keeper.x);};
const _setupKickoffLine=setupKickoff;
setupKickoff=function(t){S.penaltyExtraTime=false;clearPenaltyLineState();_setupKickoffLine(t);};
const _kickPenaltyLine=kick;
kick=function(p,vx,vy,vz,spin,rcv,tx,ty,mode){
  const rs=S.rs;
  let incident=null;
  if(rs&&rs.kind==='pen'&&rs.p===p&&mode==='shot'&&PITCH11Law.penaltyKickDirectionLegal({vx,attackDirection:dirOf(rs.team)})){
    const team=rs.team,d=dirOf(team),gx=d>0?PX1:PX0,keeper=GK[1-team];
    if(keeper&&!keeper.out){
      incident={
        team,kicker:p,keeper,shootout:!!S.so,
        offLine:PITCH11Law.goalkeeperPenaltyLineOffence({
          keeperX:keeper.x,goalLine:gx,attackDirection:d,
          footReach:4.5*PLAYER_SCALE,
          betweenPosts:Math.abs(keeper.y-CY)<=GOALH-4.5*PLAYER_SCALE
        })
      };
    }
  }
  _kickPenaltyLine(p,vx,vy,vz,spin,rcv,tx,ty,mode);
  if(incident){
    ball.penaltyTeam=incident.team;ball.penaltyKicker=incident.kicker;
    ball.penaltyKeeper=incident.keeper;ball.penaltyKeeperOffLine=incident.offLine;
    ball.penaltyKeeperSaved=false;ball.penaltyKeeperImpactedKicker=false;
    ball.penaltyRetakePending=false;ball.penaltyWasShootout=incident.shootout;
    ball.penaltyOtherPlayerTouched=false;ball.penaltyLastTouch=p;
    if(incident.offLine)varCheck('goal',{clearAndObviousError:true});
  }
};
const _gkReactPenaltyLine=gkReact;
gkReact=function(p){
  const previousLast=ball.last;
  const d=ball.penaltyTeam==null?0:dirOf(ball.penaltyTeam),gx=d>0?PX1:PX0;
  const onTarget=!!(ball.pen&&ball.penaltyKeeperOffLine&&p===ball.penaltyKeeper&&
    PITCH11Law.penaltyShotOnTarget({x:ball.x,y:ball.y,z:ball.z,vx:ball.vx,vy:ball.vy,vz:ball.vz,
      goalLine:gx,attackDirection:d,centerY:CY,goalHalfWidth:GOALH,goalHeight:GOALZ,
      radius:BR,gravity:BALL_GRAV,maxTime:2}));
  _gkReactPenaltyLine(p);
  const keeperTouched=ball.pen&&p===ball.penaltyKeeper&&(ball.owner===p||(ball.last===p&&previousLast!==p));
  if(keeperTouched)ball.penaltyLastTouch=p;
  if(onTarget&&ball.penaltyKeeperOffLine&&keeperTouched)ball.penaltyKeeperSaved=true;
};
const _outOfPlayPenaltyLine=outOfPlay;
outOfPlay=function(){
  const decision=PITCH11Law.penaltyKeeperDecision({
    keeperOffLine:ball.pen&&ball.penaltyKeeperOffLine,
    keeperSaved:ball.penaltyKeeperSaved,
    impactedKicker:ball.penaltyKeeperImpactedKicker
  });
  if(decision==='retake'){ball.penaltyRetakePending=true;return;}
  _outOfPlayPenaltyLine();
  if(ball.pen)clearPenaltyLineState();
};
const _soRulesPenaltyLine=soRules;
soRules=function(){
  if(ball.pen&&ball.penaltyKeeperOffLine&&ball.penaltyKeeperSaved){
    const stopped=ball.owner===ball.penaltyKeeper||
      (!ball.owner&&ball.z<=1&&Math.hypot(ball.vx,ball.vy)<3);
    if(stopped)ball.penaltyRetakePending=true;
    return;
  }
  _soRulesPenaltyLine();
};
function retakePenaltyForKeeperOffence(){
  const team=ball.penaltyTeam,kicker=ball.penaltyKicker,keeper=ball.penaltyKeeper,shootout=ball.penaltyWasShootout;
  ball.penaltyRetakePending=false;
  if(team==null||!keeper){clearPenaltyLineState();return;}
  const offenceCount=shootout
    ? (keeper.shootoutPenaltyLineOffences=(keeper.shootoutPenaltyLineOffences||0)+1)
    : (keeper.penaltyLineOffences=(keeper.penaltyLineOffences||0)+1);
  let sanction='First offence: goalkeeper warned';
  if(shootout){
    const decision=PITCH11Law.shootoutKeeperOffenceSanction(offenceCount-1,keeper.shootoutYC||0);
    keeper.shootoutPenaltyLineOffences=decision.offences;keeper.shootoutYC=decision.cautions;
    if(decision.card==='yellow'||decision.card==='second-yellow')giveCard(keeper,decision.card==='second-yellow'?3:1);
    if(decision.card==='yellow')sanction='Repeated shoot-out offence: goalkeeper cautioned';
    if(decision.card==='second-yellow')sanction='Repeated shoot-out offence: second yellow and sending-off';
  }else if(offenceCount>1){
    keeper.yc++;
    const card=keeper.yc>=2?3:1;
    giveCard(keeper,card);
    sanction=card===3?'Repeated offence: second yellow and sending-off':'Repeated offence: goalkeeper cautioned';
    if(card===3){
      if(PITCH11Law.matchAbandonmentDecision(P,keeper.team,7,shootout)==='abandon'){
        S.forfeitTeam=keeper.team;S.mode='full';S.t=0;S.rs=null;S.adv=null;S.inj=null;
        msg('MATCH ABANDONED',KIT[keeper.team].name+' has fewer than seven players',3);
        clearPenaltyLineState();return;
      }
      // Law 3's giveCard wrapper has already appointed the replacement goalkeeper.
    }
  }
  const taker=kicker&&!kicker.out&&!kicker.inj?kicker:firstIn(team);
  clearPenaltyLineState();
  S.penaltyRetake=true;
  whistleStop(1.2,'PENALTY RETAKE',sanction,()=>{
    try{
      setupPen(team,taker,shootout);
      if(shootout){S.mode='play';S.t=0;S.so.team=team;S.so.shooter=taker;S.so.live=true;S.so.t=0;}
    }finally{S.penaltyRetake=false;}
  });
}
const _goalPenaltyLine=goal;
goal=function(dr){_goalPenaltyLine(dr);if(ball.pen)clearPenaltyLineState();};
const _newMatchPenaltyLine=newMatch;
newMatch=function(){S.penaltyExtraTime=false;for(const p of P)p.penaltyLineOffences=0;_newMatchPenaltyLine();};
const _updatePenaltyLine=update;
update=function(){
  _updatePenaltyLine();
  if(ball.pen&&ball.penaltyKeeperOffLine&&ball.penaltyKeeperSaved&&S.penaltyExtraTime&&ball.penaltyOtherPlayerTouched&&!ball.penaltyRetakePending)
    ball.penaltyRetakePending=true;
  if(ball.pen&&!ball.penaltyDoubleTouch&&ball.owner===ball.penaltyKeeper&&!ball.penaltyKeeperSaved)clearPenaltyLineState();
  if(ball.pen&&!ball.penaltyDoubleTouch&&!ball.owner&&ball.z<=1&&Math.hypot(ball.vx,ball.vy)<3){
    const decision=PITCH11Law.penaltyKeeperDecision({keeperOffLine:ball.penaltyKeeperOffLine,keeperSaved:ball.penaltyKeeperSaved,impactedKicker:ball.penaltyKeeperImpactedKicker});
    if(decision==='retake')ball.penaltyRetakePending=true;else clearPenaltyLineState();
  }
  if(ball.pen&&ball.penaltyOtherPlayerTouched&&!ball.penaltyDoubleTouch){
    const decision=PITCH11Law.penaltyKeeperDecision({keeperOffLine:ball.penaltyKeeperOffLine,keeperSaved:ball.penaltyKeeperSaved,impactedKicker:ball.penaltyKeeperImpactedKicker});
    if(decision!=='retake')clearPenaltyLineState();
  }
  if(ball.penaltyRetakePending&&S.mode==='play')retakePenaltyForKeeperOffence();
};

const _doShootPenaltyForward=doShoot;
doShoot=function(p,power,ang,lift,em){
  const rs=S.rs,penalty=!!(rs&&rs.kind==='pen'&&rs.p===p&&!S.so);
  const shootoutPenalty=!!(rs&&rs.kind==='pen'&&rs.p===p&&S.so);
  _doShootPenaltyForward(p,power,ang,lift,em);
  if(shootoutPenalty&&!PITCH11Law.penaltyKickDirectionLegal({vx:ball.vx,attackDirection:dirOf(rs.team)})){
    const x=rs.x,y=rs.y;
    clearPenaltyLineState();S.rs=null;
    ball.x=ball.px=x;ball.y=ball.py=y;ball.z=ball.pz=ball.vx=ball.vy=ball.vz=ball.spin=0;
    ball.owner=null;ball.receiver=null;ball.last=p;ball.protect=0;
    soResult(false);
    return;
  }
  if(penalty&&!PITCH11Law.penaltyKickDirectionLegal({vx:ball.vx,attackDirection:dirOf(rs.team)})){
    const team=rs.team,x=rs.x,y=rs.y;
    clearPenaltyLineState();S.rs=null;S.adv=null;
    ball.x=ball.px=x;ball.y=ball.py=y;ball.z=ball.pz=ball.vx=ball.vy=ball.vz=ball.spin=0;
    ball.owner=null;ball.receiver=null;ball.last=p;ball.protect=0;
    whistleStop(1.4,'INDIRECT FREE KICK','The penalty kick must be taken forward',()=>freeKick(1-team,x,y,true));
  }
};

function notePenaltyOtherTouch(previousLast){
  if(ball.pen&&ball.last&&ball.last!==previousLast&&ball.last!==ball.penaltyKeeper)
    ball.penaltyOtherPlayerTouched=true;
}
const _takePenaltyAddedTime=take;
take=function(p,byHand=false){
  const penaltyTouch=ball.pen&&p!==ball.penaltyKeeper;
  _takePenaltyAddedTime(p,byHand);
  if(penaltyTouch)ball.penaltyOtherPlayerTouched=true;
};
const _touchesPenaltyAddedTime=touches;
touches=function(){const previousLast=ball.last;_touchesPenaltyAddedTime();notePenaltyOtherTouch(previousLast);};
const _bodyCollidePenaltyAddedTime=bodyCollide;
bodyCollide=function(){const previousLast=ball.last;_bodyCollidePenaltyAddedTime();if(ball.last!==previousLast&&ball.last!==ball.dbl)ball.dbl=null;notePenaltyOtherTouch(previousLast);};
const _slideHitPenaltyAddedTime=slideHit;
slideHit=function(p,sd){const previousLast=ball.last;_slideHitPenaltyAddedTime(p,sd);if(ball.last!==previousLast&&ball.last!==ball.dbl)ball.dbl=null;notePenaltyOtherTouch(previousLast);};
const _kickPenaltyAddedTime=kick;
kick=function(p,vx,vy,vz,spin,rcv,tx,ty,mode){
  const penaltyTouch=ball.pen&&p!==ball.penaltyKeeper;
  _kickPenaltyAddedTime(p,vx,vy,vz,spin,rcv,tx,ty,mode);
  if(penaltyTouch)ball.penaltyOtherPlayerTouched=true;
};
const _endHalfPenaltyAddedTime=endHalf;
endHalf=function(){
  const keeperRetake=!!(ball.pen&&PITCH11Law.penaltyKeeperDecision({
    keeperOffLine:ball.penaltyKeeperOffLine,keeperSaved:ball.penaltyKeeperSaved,
    impactedKicker:ball.penaltyKeeperImpactedKicker
  })==='retake');
  const decision=PITCH11Law.penaltyAdditionalTimeDecision({
    penaltyRestart:!!(S.rs&&S.rs.kind==='pen'),
    retakePending:!!(S.penaltyRetake||ball.penaltyRetakePending),
    keeperRetake,penaltyInFlight:!!ball.pen,
    otherPlayerTouched:!!ball.penaltyOtherPlayerTouched
  });
  if(decision==='defer'){S.penaltyExtraTime=true;S.clock=Math.max(S.clock,plen()+S.addedTime);return;}
  if(S.penaltyExtraTime){S.penaltyExtraTime=false;S.clock=Math.max(S.clock,plen()+S.addedTime);}
  _endHalfPenaltyAddedTime();
};

function queueMinimumPlayerForfeit(p){if(p&&p.out&&PITCH11Law.matchAbandonmentDecision(P,p.team,7,!!S.so)==='abandon')S.forfeitTeam=p.team;}
function finishMinimumPlayerForfeit(){if(!Number.isInteger(S.forfeitTeam))return false;const team=S.forfeitTeam;S.mode='full';S.t=0;S.adv=null;S.rs=null;S.inj=null;for(const q of P){q.ix=q.iy=0;q.sp=false;}msg('MATCH ABANDONED',KIT[team].name+' has fewer than seven players',3);return true;}
function issueAdvantageCaution(p){
  if(!p)return;
  p.yc++;
  giveCard(p,p.yc>1?3:1);
  queueMinimumPlayerForfeit(p);
}
const _whistleStopPendingCard=whistleStop;
whistleStop=function(sec,big,sub,fn,hurt){
  if(S.adv&&(S.adv.dogso||S.adv.caution)){issueAdvantageCaution(S.adv.offender);S.adv=null;}
  if(S.pendingCard){issueAdvantageCaution(S.pendingCard.player);S.pendingCard=null;}
  _whistleStopPendingCard(sec,big,sub,fn,hurt);
  finishMinimumPlayerForfeit();
};
const _outOfPlayAdvantageCards=outOfPlay;
outOfPlay=function(){
  if(S.adv&&(S.adv.dogso||S.adv.caution))issueAdvantageCaution(S.adv.offender);
  if(S.pendingCard){issueAdvantageCaution(S.pendingCard.player);S.pendingCard=null;}
  _outOfPlayAdvantageCards();
  finishMinimumPlayerForfeit();
};
const _goalPendingAdvantageCard=goal;
goal=function(dr){if(S.pendingCard){if(!S.pendingCard.goalExempt)issueAdvantageCaution(S.pendingCard.player);S.pendingCard=null;}_goalPendingAdvantageCard(dr);};
const _endHalfPendingAdvantageCard=endHalf;
endHalf=function(){
  if(S.adv){S.clock=plen();return;}
  if(S.pendingCard){issueAdvantageCaution(S.pendingCard.player);S.pendingCard=null;}
  _endHalfPendingAdvantageCard();
  finishMinimumPlayerForfeit();
};
const _newMatchPendingAdvantageCard=newMatch;
newMatch=function(){S.pendingCard=null;_newMatchPendingAdvantageCard();};

/* --- IFAB Law 11: an offside attacker may not clearly obstruct the goalkeeper's line of sight --- */
const _goalLaw11Sight=goal;
goal=function(dr){
  const scoringTeam=dirOf(0)===dr?0:1,keeper=GK[1-scoringTeam];
  if(keeper&&!keeper.out){
    const blocker=P.find(p=>p.team===scoringTeam&&!p.out&&p.off&&PITCH11Law.offsideLineOfSightInterference({
      offside:true,attackerX:p.x,attackerY:p.y,keeperX:keeper.x,keeperY:keeper.y,
      ballX:ball.x,ballY:ball.y,radius:4.8
    }));
    if(blocker){callOffside(blocker);return;}
  }
  _goalLaw11Sight(dr);
};

/* --- IFAB Laws 15/16 (2026/27): referee-signalled countdown after deliberate delay --- */
const _updateLaw1516Delay=update;
update=function(){
  _updateLaw1516Delay();
  const rs=S.rs;
  if(S.mode!=='play'||!rs||ball.owner!==rs.p||(rs.kind!=='throw'&&rs.kind!=='gk'))return;
  /* Give a normal restart its execution window. A persistent five-second delay
     is the simulation's referee judgement that the restart is being delayed. */
  if(!rs.delaySignalled){
    rs.delayWait=(rs.delayWait||0)+DT;
    if(rs.delayWait<5)return;
    rs.delaySignalled=true;rs.delayElapsed=0;rs.delayShown=5;
    msg('5-SECOND COUNTDOWN','5',1.1);
    return;
  }
  rs.delayElapsed+=DT;
  const remaining=Math.max(0,Math.ceil(5-rs.delayElapsed));
  if(remaining>0&&remaining!==rs.delayShown){
    rs.delayShown=remaining;msg('5-SECOND COUNTDOWN',String(remaining),1.1);
  }
  const decision=PITCH11Law.restartDelayDecision({kind:rs.kind,seconds:rs.delayElapsed,signalled:rs.delaySignalled});
  if(decision==='continue')return;
  const team=rs.team,x=rs.x,y=rs.y;
  if(decision==='opponent-throw-in'){
    const nx=clamp(x,PX0+12,PX1-12),ny=y<PY0?PY0-4:PY1+4;
    spot(1-team,nx,ny,false,Math.atan2(CY-ny,(CX-nx)*.3),'throw');
    msg('DELAYED THROW-IN','Opponents awarded the throw-in',2);
    return;
  }
  if(decision!=='opponent-corner')return;
  const gx=dirOf(team)>0?PX0:PX1,cx=gx===PX0?PX0+3:PX1-3;
  const topY=PY0+3,bottomY=PY1-3;
  const cy=PITCH11Law.goalKickDelayCornerY({crossingY:rs.goalLineCrossY,topY,bottomY});
  spot(1-team,cx,cy,false,Math.atan2(CY-cy,CX-cx),'corner');
  S.rs.box=true;S.rs.r=PITCH11Law.cornerKickOpponentClearance({ballOffsetX:3,ballOffsetY:3,arcRadius:10,requiredDistance:91.5});
  msg('DELAYED GOAL KICK','CORNER KICK',2);
};

/* --- IFAB Law 3: a team must designate a goalkeeper after its goalkeeper is sent off --- */
const _law3ReplacementGoalkeeper=giveCard;
giveCard=function(p,c){
  const wasGoalkeeper=!!(p&&p.gk),team=p&&p.team;
  _law3ReplacementGoalkeeper(p,c);
  if(c<=1||!wasGoalkeeper||S.mode==='full'||S.so)return;
  const replacement=PITCH11Law.replacementGoalkeeper(P,team);
  if(!replacement)return;
  replacement.gk=true;replacement.pos='GK';replacement.line=0;replacement.st=mkStats('GK');
  replacement.dive=0;replacement.freeze=0;GK[team]=replacement;
  msg('GOALKEEPER SENT OFF',tag(replacement)+' takes over in goal',2);
};

/* Reset repeated goalkeeper time-wasting sanctions for each new match. */
const _newMatchGkHoldSanction=newMatch;
newMatch=function(){_newMatchGkHoldSanction();for(const p of P)p.gkHoldOffences=0;};

/* --- IFAB Law 9: referee contact can require a dropped ball --- */
function refereeContactPromisingAttack(p){
  if(!p||p.out)return false;
  const d=dirOf(p.team),gx=d>0?PX1:PX0;
  return (p.x-CX)*d>PW*.12&&(gx-p.x)*d<PW*.4&&Math.abs(p.y-CY)<PH*.45&&(ball.vx*d>25||p.vx*d>25);
}
function stopForRefereeContact(contact){
  if(!contact)return;
  ball.refContact=null;ball.x=ball.px=contact.x;ball.y=ball.py=contact.y;ball.z=ball.pz=0;
  ball.vx=ball.vy=ball.vz=ball.spin=0;ball.owner=null;ball.receiver=null;
  whistleStop(1.4,'REFEREE CONTACT','Dropped ball',()=>dropBall(contact.team,contact.recipientTeam));
}
function resolveRefereeContact(p){
  const contact=ball.refContact;if(!contact)return false;
  const possessionChanged=!!p&&p.team!==contact.team;
  const promisingAttack=!!p&&p.team===contact.team&&refereeContactPromisingAttack(p);
  const decision=PITCH11Law.refereeContactDecision({possessionChanged,promisingAttack});
  if(decision==='dropped-ball'){stopForRefereeContact(contact);return true;}
  ball.refContact=null;
  return false;
}
const _takeLaw9Referee=take;
take=function(p,byHand){if(resolveRefereeContact(p))return;_takeLaw9Referee(p,byHand);};
const _kickLaw9Referee=kick;
kick=function(p,vx,vy,vz,spin,rcv,tx,ty,mode){if(resolveRefereeContact(p))return;_kickLaw9Referee(p,vx,vy,vz,spin,rcv,tx,ty,mode);};
const _goalLaw9Referee=goal;
goal=function(dr){
  const contact=ball.refContact;
  if(contact&&PITCH11Law.refereeContactDecision({directGoal:true})==='dropped-ball'){stopForRefereeContact(contact);return;}
  _goalLaw9Referee(dr);
};
const _outOfPlayLaw9Referee=outOfPlay;
outOfPlay=function(){ball.refContact=null;_outOfPlayLaw9Referee();};
const _touchesLaw9Referee=touches;
touches=function(){const previousLast=ball.last;_touchesLaw9Referee();if(ball.last!==previousLast&&ball.last&&ball.last!==ball.dbl)resolveRefereeContact(ball.last);};
const _bodyCollideLaw9Referee=bodyCollide;
bodyCollide=function(){const previousLast=ball.last,refContact=ball.refContact;_bodyCollideLaw9Referee();if(ball.last!==previousLast&&ball.last&&ball.last!==ball.dbl){if(refContact)ball.refContact=refContact;resolveRefereeContact(ball.last);}};
const _slideHitLaw9Referee=slideHit;
slideHit=function(p,sd){const previousLast=ball.last,refContact=ball.refContact;_slideHitLaw9Referee(p,sd);if(ball.last!==previousLast&&ball.last&&ball.last!==ball.dbl){if(refContact)ball.refContact=refContact;resolveRefereeContact(ball.last);}};

/* A second player's deflection clears the direct-restart/second-touch marker, including goalkeeper parries. */
const _aiGKDirectRestart=aiGK;
aiGK=function(p){
  const previousLast=ball.last;
  _aiGKDirectRestart(p);
  if(ball.last!==previousLast&&ball.last!==ball.dbl)ball.dbl=null;
};
/* --- IFAB Law 7: match clock includes stoppages and adds the lost time back on top --- */
function refreshLaw7AddedTime(){
  if(S.prac||S.half<1||S.half>4)return;
  const unit=periodSecondsPerMatchMinute();
  const required=PITCH11Law.addedTimeSeconds(S.lostTime,unit);
  if(required>S.addedTime)S.addedTime=required;
  const announced=Math.ceil(S.addedTime/unit);
  if(S.clock>=plen()&&announced>S.addedTimeAnnounced){
    S.addedTimeAnnounced=announced;
    FO.board='+'+announced;FO.boardT=4;
    msg('ADDED TIME','+'+announced+' MIN',2);
  }
}
const _updateLaw7StoppageClock=update;
update=function(){
  const priorMode=S.mode,priorHalf=S.half,practice=!!S.prac;
  _updateLaw7StoppageClock();
  if(practice||S.prac||priorHalf<1||priorHalf>4||S.half!==priorHalf||H>W)return;
  const stopped=priorMode==='whistle'||priorMode==='goal'||(priorMode==='subs'&&S.ret!=='half'&&!PITCH11Law.manualPauseExcludesAddedTime({mode:priorMode,manualPause:S.manualPause}))||priorMode==='replay'||
    (priorMode==='kickoff'&&S.clock>0);
  if(!stopped)return;
  S.clock+=DT;
  S.lostTime+=DT;
  refreshLaw7AddedTime();
};

/* --- IFAB Law 5 (2026/27): one running minute off field after injury assessment --- */
function sendOffForAssessment(p,state){
  if(!p||p.gk)return false;
  const assessment=Object.assign({stoppedForInjury:true,goalkeeper:!!p.gk},state||{});
  assessment.sameTeamCollision=!!(assessment.sameTeamCollision||p.law5SameTeamCollision);
  assessment.goalkeeperOutfieldCollision=!!(assessment.goalkeeperOutfieldCollision||p.law5GoalkeeperOutfieldCollision);
  assessment.severeInjury=!!(assessment.severeInjury||p.law5SevereInjury);
  assessment.foulCautionOrSendingOff=!!(assessment.foulCautionOrSendingOff||p.law5FoulSanction);
  assessment.penaltyKicker=!!(assessment.penaltyKicker||p.law5PenaltyKicker);
  p.law5FoulSanction=p.law5PenaltyKicker=p.law5SameTeamCollision=p.law5GoalkeeperOutfieldCollision=p.law5SevereInjury=false;
  if(PITCH11Law.offFieldTreatmentDecision(assessment)!=='leave-one-minute')return false;
  if(p.tempOff)return true;
  p.tempOff=true;p.tempOffStartedAt=null;p.tempOffAwaitingRestart=true;p.tempOffHalf=S.half;
  p.tempOffX=p.x;p.tempOffY=p.y;p.out=true;p.down=false;p.limp=true;
  p.vx=p.vy=p.ix=p.iy=0;p.x=p.px=p.y=p.py=-400;
  msg('PLAYER OFF FIELD','One-minute injury assessment',1.8);
  return true;
}
function returnFromAssessment(p,periodRestart){
  if(!p||!p.tempOff)return false;
  const x=clamp(Number.isFinite(p.tempOffX)?p.tempOffX:CX,PX0+8,PX1-8),savedY=Number.isFinite(p.tempOffY)?p.tempOffY:CY;
  p.out=false;p.tempOff=false;p.inj=false;p.down=false;p.limp=true;p.vx=p.vy=p.ix=p.iy=0;
  if(periodRestart){p.x=p.px=x;p.y=p.py=clamp(savedY,PY0+8,PY1-8);}
  else{p.x=p.px=x;p.y=p.py=Math.abs(savedY-PY0)<=Math.abs(savedY-PY1)?PY0+2:PY1-2;msg('PLAYER READY TO RETURN',tag(p)+' may re-enter',1.6);}
  p.tempOffStartedAt=p.tempOffUntil=p.tempOffX=p.tempOffY=p.tempOffHalf=null;p.tempOffAwaitingRestart=false;
  return true;
}
function restoreAllTempOff(periodRestart){for(const p of P)if(p.tempOff)returnFromAssessment(p,!!periodRestart);}
function restorePeriodTempOff(){for(const p of P)if(p.tempOff&&p.tempOffHalf!==S.half)returnFromAssessment(p,true);}
const _setupKickoffLaw5=setupKickoff;setupKickoff=function(team){restorePeriodTempOff();_setupKickoffLaw5(team);};
const _startShootoutLaw5=startShootout;startShootout=function(){restoreAllTempOff(true);_startShootoutLaw5();};
const _updateLaw5OffField=update;update=function(){
  const restartWasLive=!!S.rs;
  _updateLaw5OffField();
  if(S.mode==='play'&&!S.rs&&restartWasLive){
    for(const p of P)if(p.tempOff&&p.tempOffAwaitingRestart){p.tempOffStartedAt=gmin();p.tempOffAwaitingRestart=false;}
  }
  if(S.mode!=='play')return;
  for(const p of P){
    if(!p.tempOff||p.tempOffAwaitingRestart||!Number.isFinite(p.tempOffStartedAt))continue;
    if(PITCH11Law.offFieldReturnDecision({elapsedMinutes:gmin()-p.tempOffStartedAt})==='return')returnFromAssessment(p,false);
  }
};
/* Law 10: replace a sent-off shoot-out goalkeeper and equalise player numbers. */
const _giveCardShootoutEqualisation=giveCard;
giveCard=function(p,c){
  const shootoutSendOff=!!(S.so&&c>1&&p&&!p.out);
  const wasShootoutGoalkeeper=!!(S.so&&p&&p.gk&&c>1&&!p.out);
  _giveCardShootoutEqualisation(p,c);
  if(!shootoutSendOff)return;
  if(wasShootoutGoalkeeper){
    const replacement=PITCH11Law.shootoutReplacementGoalkeeper(P,p.team);
    if(replacement){
      p.gk=false;replacement.gk=true;replacement.pos='GK';replacement.line=0;
      replacement.st=mkStats('GK');GK[p.team]=replacement;
      replacement.x=replacement.px=p.team===0?PX0+28:PX1-28;
      replacement.y=replacement.py=CY;
      msg('GOALKEEPER REPLACED',tag(replacement)+' takes over in goal',2);
    }
  }
  const excluded=PITCH11Law.shootoutExclusions(P);
  for(const q of excluded){
    q.out=true;q.soExcluded=true;q.x=q.px=q.y=q.py=-400;q.vx=q.vy=q.ix=q.iy=0;
  }
};

/* Law 10: injured players cannot be replaced during kicks; an injured goalkeeper has the specific replacement options. */
const _injuredShootoutLaw10=injured;
injured=function(q){
  if(!S.so||!S.so.live||!q)return _injuredShootoutLaw10(q);
  const t=q.team,so=S.so,keeperHadKicked=!!(so.taken&&so.taken[t]&&so.taken[t].includes(q));
  const removePlayer=(player,injuredPlayer=false)=>{
    player.out=true;player.soExcluded=true;
    if(injuredPlayer)player.soUnavailableInjured=true;
    player.inj=injuredPlayer;player.down=false;
    player.x=player.px=player.y=player.py=-400;
    player.vx=player.vy=player.ix=player.iy=0;
    if(ctrl===player)ctrl=null;
  };
  if(!q.gk){
    removePlayer(q,true);
    const excluded=PITCH11Law.shootoutExclusions(P);
    for(const player of excluded)removePlayer(player,!!player.inj);
    msg('PLAYER CANNOT CONTINUE','No replacement during the shoot-out; opponents reduced to equal numbers',2.4);
    return false;
  }
  const excludedKeeper=PITCH11Law.shootoutExcludedGoalkeeper(P,t);
  const namedSubstitute=S.subs[t]<5?(BENCH[t][0]||null):null;
  const decision=PITCH11Law.shootoutInjuryDecision({
    goalkeeper:true,
    excludedPlayerAvailable:!!excludedKeeper,
    namedSubstituteAvailable:!!namedSubstitute&&S.subs[t]<5
  });
  let replacement=null;
  if(decision==='excluded-player'){
    replacement=excludedKeeper;
    removePlayer(q,true);
    replacement.out=false;replacement.soExcluded=false;replacement.soUnavailableInjured=false;replacement.inj=false;replacement.down=false;
    replacement.tempOff=false;replacement.substitutionPending=false;
  }else if(decision==='named-substitute'){
    const position={x:q.x,y:q.y},benchIndex=BENCH[t].indexOf(namedSubstitute);
    if(applySubstitution(q,namedSubstitute,position)){
      BENCH[t].splice(benchIndex,1);
      S.subs[t]++;
      replacement=q;
    }else{
      replacement=PITCH11Law.shootoutReplacementGoalkeeper(P,t);
      removePlayer(q,true);
    }
  }else{
    replacement=PITCH11Law.shootoutReplacementGoalkeeper(P,t);
    removePlayer(q,true);
  }
  if(replacement){
    q.gk=false;
    replacement.gk=true;replacement.pos='GK';replacement.line=0;
    replacement.st=mkStats('GK');replacement.inj=false;replacement.down=false;
    replacement.x=replacement.px=t===0?PX0+28:PX1-28;
    replacement.y=replacement.py=CY;
    GK[t]=replacement;
    if(keeperHadKicked){
      if(!so.taken)so.taken=[[],[]];
      if(!so.taken[t].includes(replacement))so.taken[t].push(replacement);
    }
    msg('GOALKEEPER REPLACED',tag(replacement)+' takes over in goal',2.2);
  }else{
    GK[t]=q;
  }
  const excluded=PITCH11Law.shootoutExclusions(P);
  for(const player of excluded)removePlayer(player,!!player.inj);
  return false;
};
