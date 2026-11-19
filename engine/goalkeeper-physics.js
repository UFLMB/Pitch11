(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.P11GoalkeeperPhysics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const finite = (v, name) => {
    if (!Number.isFinite(v)) throw new TypeError(name + " must be finite");
    return v;
  };

  // Pitch/ball values are SI units. Horizontal drag follows the match's
  // exponential model; vertical motion uses gravity and no artificial aim.
  function predictBallAtGoalPlane({ x, y, z, vx, vy, vz, goalX, drag = 0.08, gravity = 9.81 } = {}) {
    for (const [k, v] of Object.entries({ x, y, z, vx, vy, vz, goalX, drag, gravity })) finite(v, k);
    if (Math.abs(vx) < 1e-5 || drag < 0 || gravity <= 0) return null;
    const dx = goalX - x;
    const ratio = dx * drag / vx;
    if (dx / vx <= 0 || ratio >= 1) return null;
    const time = drag > 1e-8 ? -Math.log(1 - ratio) / drag : dx / vx;
    if (!(time > 0) || !Number.isFinite(time)) return null;
    const decay = Math.exp(-drag * time);
    const lateral = y + vy * (1 - decay) / Math.max(drag, 1e-8);
    const height = z + vz * time - 0.5 * gravity * time * time;
    const lateralVelocity = vy * decay;
    const verticalVelocity = vz - gravity * time;
    return Object.freeze({ time, lateral, height, lateralVelocity, verticalVelocity, depth: goalX });
  }

  function evaluateKeeperInterception({
    targetLateral, targetHeight, timeToGoal, keeperLateral = 0, keeperDepth = 0,
    goalDepth = 0, goalHalfWidth = 3.66, goalHeight = 2.44, keeperHeight = 1.9,
    incomingSpeed = 18, stats = {}
  } = {}) {
    for (const [k, v] of Object.entries({ targetLateral, targetHeight, timeToGoal, keeperLateral, keeperDepth, goalDepth, goalHalfWidth, goalHeight, keeperHeight, incomingSpeed })) finite(v, k);
    if (timeToGoal <= 0 || goalHalfWidth <= 0 || goalHeight <= 0 || keeperHeight <= 0 || incomingSpeed < 0) {
      throw new RangeError("invalid goalkeeper interception dimensions or timing");
    }
    const reflex = clamp(Number.isFinite(stats.reflex) ? stats.reflex : (Number.isFinite(stats.def) ? stats.def : 0.55), 0, 1);
    const agility = clamp(Number.isFinite(stats.agility) ? stats.agility : (Number.isFinite(stats.pace) ? stats.pace : 0.55), 0, 1);
    const handling = clamp(Number.isFinite(stats.handling) ? stats.handling : (Number.isFinite(stats.def) ? stats.def : 0.55), 0, 1);
    const reach = clamp(Number.isFinite(stats.reach) ? stats.reach : 0.55, 0, 1);

    // Elite keepers still have a non-zero perception/decision latency.
    const reactionTime = 0.155 + (1 - reflex) * 0.205;
    const availableTime = Math.max(0, timeToGoal - reactionTime);
    const acceleration = 7.0 + agility * 3.0;
    const maxSpeed = 4.0 + agility * 1.8;
    const acceleratedTime = Math.min(availableTime, maxSpeed / acceleration);
    const movementDistance = 0.5 * acceleration * acceleratedTime * acceleratedTime +
      maxSpeed * Math.max(0, availableTime - acceleratedTime);
    const diveExtension = 0.92 + reach * 0.58;
    const lateralDistance = targetLateral - keeperLateral;
    const depthDistance = goalDepth - keeperDepth;
    const requiredDistance = Math.hypot(lateralDistance, depthDistance);
    const horizontalReach = movementDistance + diveExtension;
    const verticalReach = keeperHeight + 0.22 + Math.min(0.78, availableTime * (0.82 + agility * 0.28));
    const insideMouth = Math.abs(targetLateral) <= goalHalfWidth && targetHeight >= 0 && targetHeight <= goalHeight;
    const reachable = insideMouth && availableTime > 0 && requiredDistance <= horizontalReach && targetHeight <= verticalReach;
    const reachMargin = horizontalReach - requiredDistance;
    const side = Math.abs(lateralDistance) < 0.42 ? "center" : lateralDistance < 0 ? "left" : "right";
    const heightBand = targetHeight <= 0.78 ? "low" : "high";
    let saveType = "miss";
    if (reachable) {
      if (heightBand === "low" && incomingSpeed < 13.5 && handling >= 0.62 && reachMargin > 0.38) saveType = "catch";
      else if (reachMargin < 0.2 || (heightBand === "high" && targetHeight > verticalReach - 0.16)) saveType = "fingertip";
      else saveType = "parry";
    }
    const animationState = saveType === "miss" ? "keeperMiss" :
      saveType === "catch" ? "keeperCatch" :
      saveType === "fingertip" ? "keeperFingertip" :
      side === "center" ? "keeperParry" :
      heightBand === "low" ? (side === "left" ? "keeperDiveLowLeft" : "keeperDiveLowRight") :
      (side === "left" ? "keeperDiveLeft" : "keeperDiveRight");
    return Object.freeze({
      reachable, insideMouth, side, heightBand, saveType, action: saveType, animationState,
      reactionTime, availableTime, movementDistance, diveExtension,
      horizontalReach, verticalReach, requiredDistance, reachMargin,
      timeToGoal, targetLateral, targetHeight
    });
  }

  function evaluateOneOnOne({ keeperDistance, keeperAgility = 0.55, attackerBallControl = 0.55, ballProtected = false, cooldown = 0 } = {}) {
    for (const [k, v] of Object.entries({ keeperDistance, keeperAgility, attackerBallControl, cooldown })) finite(v, k);
    if (keeperDistance < 0 || cooldown < 0) throw new RangeError("invalid one-on-one state");
    const agility = clamp(keeperAgility, 0, 1);
    const control = clamp(attackerBallControl, 0, 1);
    const keeperSpeed = 4.0 + agility * 1.8;
    const keeperReaction = 0.12 + (1 - agility) * 0.12;
    const attackerControlWindow = ballProtected ? 0 : 0.2 + control * 0.16;
    const keeperTimeToContact = keeperDistance / keeperSpeed + keeperReaction;
    const canSmother = cooldown <= 0 && !ballProtected && keeperDistance <= 2.15 &&
      keeperTimeToContact <= attackerControlWindow;
    return Object.freeze({
      action: canSmother ? "smother" : "contain",
      keeperTimeToContact, attackerControlWindow, keeperSpeed,
      canSmother
    });
  }

  return Object.freeze({ predictBallAtGoalPlane, evaluateKeeperInterception, evaluateOneOnOne });
});
