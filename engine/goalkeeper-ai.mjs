// Deterministic goalkeeper decision model in real pitch metres.
// The goal mouth is 7.32 m × 2.44 m. Reach is a time-dependent envelope,
// not a fixed radius: reaction, dive preparation and lateral travel all matter.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function evaluateGoalkeeperShot({
  targetX,targetY,keeperX=0,flightTime=.58,
  goalWidth=7.32,goalHeight=2.44,keeperHeight=1.9,
  reactionBase=.18,lateralSpeed=4.8,armReach=1.42
}={}){
  const values={targetX,targetY,keeperX,flightTime,goalWidth,goalHeight,keeperHeight,reactionBase,lateralSpeed,armReach};
  for(const [name,value] of Object.entries(values)){
    if(!Number.isFinite(value))throw new TypeError(name+" must be a finite number");
  }
  if(flightTime<=0||goalWidth<=0||goalHeight<=0||keeperHeight<=0||lateralSpeed<=0||armReach<0||reactionBase<0){
    throw new RangeError("shot timing, goal dimensions and keeper dimensions must be positive");
  }
  const halfWidth=goalWidth/2;
  const inGoalMouth=Math.abs(targetX)<=halfWidth&&targetY>=0&&targetY<=goalHeight;
  const dx=targetX-keeperX;
  const lateral=Math.abs(dx);
  const side=lateral<.62?"center":dx<0?"left":"right";
  const heightLoad=clamp((targetY-1.05)/1.25,0,1);
  const reactionTime=reactionBase+lateral*.018+heightLoad*.045;
  const divePreparation=.075+heightLoad*.055;
  const available=Math.max(0,flightTime-reactionTime-divePreparation);
  const lateralTravel=Math.max(0,lateral-armReach);
  const requiredTravelTime=lateralTravel/lateralSpeed;
  const lateralReach=armReach+lateralSpeed*available;
  const verticalReach=keeperHeight*.82+(.52+available*.9)*(side==="center"?.72:1);
  const reachable=inGoalMouth&&available>=0&&requiredTravelTime<=available&&targetY<=verticalReach;
  // Classify from the ball's actual goal-line contact height, not shot type.
  const heightBand=targetY<=.9?"low":targetY<=1.65?"middle":"high";
  const action=side==="center"?(targetY<=1.45?"catch":"parry"):
    heightBand==="low"?"lowDive":heightBand==="middle"?"middleDive":"dive";
  const animationState=side==="center"?(action==="catch"?"keeperCatch":"keeperParry"):
    heightBand==="low"?(side==="left"?"keeperDiveLowLeft":"keeperDiveLowRight"):
    heightBand==="middle"?(side==="left"?"keeperDiveMiddleLeft":"keeperDiveMiddleRight"):
    (side==="left"?"keeperDiveLeft":"keeperDiveRight");
  const confidence=reachable?clamp(1-(requiredTravelTime/Math.max(.001,available))*.35-(targetY/Math.max(.1,verticalReach))*.2,0,1):0;
  return Object.freeze({
    side,action,heightBand,animationState,reactionTime,divePreparation,available,requiredTravelTime,
    lateralReach,verticalReach,reachable,inGoalMouth,confidence,
    goalWidth,goalHeight,keeperHeight
  });
}
