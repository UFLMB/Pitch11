// Goalkeeper AI v2: deterministic, trajectory-driven reachability model.
// Coordinates: x = lateral metres, y = height metres, z = distance in front
// of the goal line (z=0). Ball velocity is metres/second; gravity is m/s².
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const finite = (value, name) => {
  if (!Number.isFinite(value)) throw new TypeError(name + " must be a finite number");
  return value;
};
export const GOALKEEPER_DEFAULTS = Object.freeze({
  goalWidth: 7.32, goalHeight: 2.44, gravity: 9.81,
  reactionTime: 0.22, perceptionPenalty: 0,
  lateralAcceleration: 7.5, lateralTopSpeed: 5.8,
  divePreparation: 0.12, diveSpeed: 4.2,
  bodyLateralReach: 0.42, armReach: 0.78, keeperHeight: 1.9,
  jumpImpulse: 3.15, catchSpeedLimit: 8.5, cleanCatchHeight: 1.55
});
function validate(input, defaults) {
  const values = { ...defaults, ...input };
  for (const [key, value] of Object.entries(values)) finite(value, key);
  for (const key of ["goalWidth","goalHeight","gravity","lateralAcceleration","lateralTopSpeed","diveSpeed","keeperHeight"]) {
    if (values[key] <= 0) throw new RangeError(key + " must be greater than zero");
  }
  for (const key of ["reactionTime","perceptionPenalty","divePreparation","bodyLateralReach","armReach","jumpImpulse","catchSpeedLimit","cleanCatchHeight"]) {
    if (values[key] < 0) throw new RangeError(key + " cannot be negative");
  }
  return values;
}
export function predictGoalPlaneCrossing(ball, { gravity = GOALKEEPER_DEFAULTS.gravity } = {}) {
  const b = {
    x: finite(ball?.x, "ball.x"), y: finite(ball?.y, "ball.y"), z: finite(ball?.z, "ball.z"),
    vx: finite(ball?.vx, "ball.vx"), vy: finite(ball?.vy, "ball.vy"), vz: finite(ball?.vz, "ball.vz")
  };
  finite(gravity, "gravity");
  if (b.z < 0 || b.vz >= -0.01) return null;
  const time = -b.z / b.vz;
  if (!(time > 0) || !Number.isFinite(time)) return null;
  const x = b.x + b.vx * time;
  const y = b.y + b.vy * time - 0.5 * gravity * time * time;
  return Object.freeze({ time, x, y, speed: Math.hypot(b.vx,b.vy,b.vz), vx:b.vx, vy:b.vy, vz:b.vz });
}
function displacementTowardTarget({time,direction,initialVelocity,acceleration,topSpeed}) {
  const v0 = Math.max(0, initialVelocity * direction);
  const tToTop = Math.max(0, (topSpeed-v0)/acceleration);
  if (time <= tToTop) return v0*time + 0.5*acceleration*time*time;
  return v0*tToTop + 0.5*acceleration*tToTop*tToTop + topSpeed*(time-tToTop);
}
/** Physical reachability/technique decision from the live ball state; never a guaranteed save. */
export function evaluateGoalkeeperThreat({ball,keeper={},attributes={},environment={}}={}) {
  if (!ball || !keeper || !attributes || !environment) throw new TypeError("ball, keeper, attributes and environment are required");
  const p = validate({
    ...GOALKEEPER_DEFAULTS, ...environment,
    keeperHeight: attributes.keeperHeight ?? environment.keeperHeight ?? GOALKEEPER_DEFAULTS.keeperHeight
  }, GOALKEEPER_DEFAULTS);
  const crossing = predictGoalPlaneCrossing(ball,{gravity:p.gravity});
  if (!crossing) return Object.freeze({threat:false,reason:"no-goal-plane-crossing",reachable:false,outcome:"no-save"});
  const keeperX = finite(keeper.x ?? 0,"keeper.x");
  const keeperVelocityX = finite(keeper.vx ?? 0,"keeper.vx");
  const reflex = clamp(finite(attributes.reflexes ?? 50,"attributes.reflexes"),1,99);
  const positioning = clamp(finite(attributes.positioning ?? 50,"attributes.positioning"),1,99);
  const diving = clamp(finite(attributes.diving ?? 50,"attributes.diving"),1,99);
  const handling = clamp(finite(attributes.handling ?? 50,"attributes.handling"),1,99);
  const reach = clamp(finite(attributes.reach ?? 50,"attributes.reach"),1,99);
  const insideMouth = Math.abs(crossing.x)<=p.goalWidth/2 && crossing.y>=0 && crossing.y<=p.goalHeight;
  if (!insideMouth) return Object.freeze({threat:false,reason:"outside-goal-mouth",reachable:false,outcome:"no-save",crossing});
  const reactionTime = p.reactionTime*(1.35-reflex/100)+p.perceptionPenalty;
  const positioningOffset = (1-positioning/100)*0.34;
  const targetX = crossing.x;
  const adjustedKeeperX = keeperX + clamp(targetX-keeperX,-positioningOffset,positioningOffset);
  const deltaX = targetX-adjustedKeeperX;
  const direction = Math.sign(deltaX);
  const available = crossing.time-reactionTime;
  const canPrepareDive = available>p.divePreparation;
  const movementTime = Math.max(0,available-(canPrepareDive?p.divePreparation:0));
  const topSpeed = p.lateralTopSpeed*(0.78+diving/220);
  const acceleration = p.lateralAcceleration*(0.8+diving/250);
  const initialTowardSpeed = direction===0?0:keeperVelocityX*direction;
  const runDistance = displacementTowardTarget({time:movementTime,direction,initialVelocity:initialTowardSpeed,acceleration,topSpeed});
  const diveExtension = canPrepareDive ? p.diveSpeed*(0.78+diving/230)*Math.min(0.34,movementTime*0.22) : 0;
  const lateralEnvelope = p.bodyLateralReach+runDistance+diveExtension+p.armReach*(0.72+reach/360);
  const lateralReachable = Math.abs(deltaX)<=lateralEnvelope;
  const jumpTime = Math.max(0,Math.min(available,0.42));
  const jumpHeight = canPrepareDive ? p.jumpImpulse*jumpTime-0.5*p.gravity*jumpTime*jumpTime : 0;
  const standingReach = p.keeperHeight*0.66+p.armReach*(0.72+reach/360);
  const verticalEnvelope = canPrepareDive ? Math.max(standingReach,p.keeperHeight*0.48+p.armReach+Math.max(0,jumpHeight)) : standingReach;
  const verticalReachable = crossing.y<=verticalEnvelope;
  const enoughReaction = available>0;
  const reachable = enoughReaction && lateralReachable && verticalReachable;
  const heightBand = crossing.y<=0.72?"low":crossing.y>=1.72?"high":"mid";
  const edgeLoad = Math.abs(deltaX)/Math.max(0.01,lateralEnvelope);
  const centralBodyCorridor = Math.abs(deltaX)<=0.42 && crossing.y<=p.cleanCatchHeight;
  const catchableSpeed = crossing.speed<=p.catchSpeedLimit*(0.82+handling/280);
  let technique = "miss";
  if (reachable) {
    if (centralBodyCorridor && catchableSpeed && heightBand!=="high") technique="catch";
    else if (edgeLoad>0.82 || (heightBand==="high" && crossing.speed>20)) technique="fingertip";
    else technique="parry";
  }
  const side = Math.abs(deltaX)<0.18?"center":deltaX<0?"left":"right";
  const animationState = technique==="catch"?"keeperCatch"
    : technique==="fingertip"?"keeperFingertip"
    : technique==="parry"?(heightBand==="low" ? `keeperDiveLow${side==="left"?"Left":"Right"}` : `keeperDive${side==="left"?"Left":"Right"}`)
    : "keeperMiss";
  return Object.freeze({
    threat:true,
    reason:reachable?"within-physical-envelope":!enoughReaction?"reaction-window-expired":!lateralReachable?"lateral-reach-exceeded":"vertical-reach-exceeded",
    reachable,outcome:technique==="miss"?"goal-likely":technique,technique,animationState,side,heightBand,
    reactionTime,availableReactionTime:available,lateralDistance:Math.abs(deltaX),lateralEnvelope,verticalReach:verticalEnvelope,crossing
  });
}
