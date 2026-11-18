// Deterministic goalkeeper decision model for the interactive Goalkeeper Lab.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function evaluateGoalkeeperShot({targetX,targetY,keeperX=0,flightTime=.58,keeperReach=3.15}={}){
  for(const [name,value] of Object.entries({targetX,targetY,keeperX,flightTime,keeperReach})){
    if(!Number.isFinite(value))throw new TypeError(name+" must be a finite number");
  }
  if(flightTime<=0||keeperReach<=0)throw new RangeError("flightTime and keeperReach must be positive");
  const dx=targetX-keeperX;
  const lateral=Math.abs(dx);
  const side=lateral<.75?"center":dx<0?"left":"right";
  const reactionTime=.15+lateral*.028+Math.max(0,targetY-1.2)*.035;
  const effectiveReach=keeperReach-Math.max(0,targetY-1.2)*.6;
  const reachable=reactionTime<flightTime&&lateral<=effectiveReach&&targetY<=2.3;
  const action=side==="center"?(targetY<=1.25?"catch":"parry"):"dive";
  const confidence=clamp(1-reactionTime/flightTime*.35-lateral/Math.max(.1,effectiveReach)*.35,0,1);
  return Object.freeze({side,action,reactionTime,reach:effectiveReach,reachable,confidence});
}
