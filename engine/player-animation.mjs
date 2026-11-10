const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function computeLocomotionPose(speed, time, playerId = 0) {
  const velocity = Math.max(0, Number(speed) || 0);
  const gait = clamp(velocity / 6.8, 0, 1);
  const phase = (Number(time) || 0) * (5.2 + velocity * 1.15) + (Number(playerId) || 0) * .73;
  const swing = Math.sin(phase);
  const stride = swing * .62 * gait;
  const leftKnee = Math.max(0, swing) * .48 * gait;
  const rightKnee = Math.max(0, -swing) * .48 * gait;
  return {
    gait,
    stride,
    leftKnee,
    rightKnee,
    bob: gait > .05 ? Math.abs(Math.sin(phase * 2)) * .025 * gait : 0
  };
}
