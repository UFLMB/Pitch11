const PHASE_TRANSITIONS = Object.freeze({
  loading: new Set(["idle", "asset-error"]),
  idle: new Set(["shot", "action", "diving", "return", "idle", "asset-error"]),
  shot: new Set(["diving", "action", "miss", "idle", "shot"]),
  action: new Set(["idle", "shot", "diving", "return", "action"]),
  diving: new Set(["return", "miss", "idle", "diving"]),
  miss: new Set(["recover", "idle"]),
  recover: new Set(["return", "idle"]),
  return: new Set(["idle", "return", "action"]),
  "asset-error": new Set(["loading", "idle", "asset-error"])
});

export function createGoalkeeperAnimationController(initialPhase = "loading") {
  return { phase: initialPhase, elapsed: 0, transitionCount: 0, lastTransition: "initial" };
}

export function transitionGoalkeeperPhase(controller, nextPhase, reason = "state-update", { force = false } = {}) {
  if (!controller || !PHASE_TRANSITIONS[nextPhase]) {
    return { accepted: false, phase: controller?.phase || "loading" };
  }
  const current = controller.phase;
  if (current !== nextPhase && !force && !PHASE_TRANSITIONS[current]?.has(nextPhase)) {
    return { accepted: false, phase: current };
  }
  if (current !== nextPhase) {
    controller.phase = nextPhase;
    controller.elapsed = 0;
    controller.transitionCount += 1;
    controller.lastTransition = String(reason || "state-update");
  }
  return { accepted: true, phase: controller.phase };
}

export function isGoalkeeperSaveClipComplete({
  expectedState,
  activeState,
  actionTime,
  clipDuration,
  endTolerance = 0.04
} = {}) {
  if (!expectedState || activeState !== expectedState) return false;
  const time = Number(actionTime);
  const duration = Number(clipDuration);
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return false;
  return time >= duration - Math.max(0, Number(endTolerance) || 0);
}

export function selectGoalkeeperReturnClip(candidates, target) {
  const tx = Number(target?.x) || 0;
  const tz = Number(target?.z) || 0;
  const targetLength = Math.hypot(tx, tz);
  if (targetLength < 1e-5) return null;
  let best = null;
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const x = Number(candidate?.displacement?.x) || 0;
    const z = Number(candidate?.displacement?.z) || 0;
    const length = Math.hypot(x, z);
    if (length < 1e-4) continue;
    const alignment = (x * tx + z * tz) / (length * targetLength);
    if (alignment <= 0) continue;
    if (!best || alignment > best.alignment) {
      best = { file: candidate.file, alignment, displacement: { x, z } };
    }
  }
  return best;
}

export function getGoalkeeperReturnStep({ distance, rootMotionAvailable, rootMotionMagnitude, settleDistance = 0.16, completeDistance = 0.018 } = {}) {
  const remaining = Math.max(0, Number(distance) || 0);
  if (remaining <= Math.max(0, completeDistance)) return "complete";
  if (remaining <= Math.max(completeDistance, settleDistance)) return "settle";
  if (!rootMotionAvailable) return "fallback";
  if ((Number(rootMotionMagnitude) || 0) <= 1e-9) return "wait";
  return "root-motion";
}

export function shouldPreserveGoalkeeperAnimationAfterShot(phase) {
  return phase === "diving" || phase === "action";
}
