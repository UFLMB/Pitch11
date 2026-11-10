/**
 * PITCH 11 broadcast camera.
 * Side-line Tele Broadcast framing with damped ball tracking and contextual zoom.
 * Coordinates follow the simulation: X = pitch length, Y = pitch width.
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const damp = (current, target, sharpness, dt) =>
  current + (target - current) * (1 - Math.exp(-sharpness * Math.max(0, dt)));

export function createBroadcastCamera(camera, { mobile = false } = {}) {
  camera.fov = mobile ? 43 : 41;
  camera.near = 0.1;
  camera.far = 500;
  camera.position.set(52.5, mobile ? 43 : 40, mobile ? 104 : 98);
  camera.lookAt(52.5, 0.6, 0);
  camera.updateProjectionMatrix();
  return {
    x: 52.5,
    y: mobile ? 43 : 40,
    z: mobile ? 104 : 98,
    targetX: 52.5,
    targetY: 0.6,
    targetZ: 0,
    mobile,
    initialized: true
  };
}

export function updateBroadcastCamera(camera, state, snapshot, deltaSeconds) {
  if (!snapshot?.ball || !state) return;
  const dt = clamp(Number(deltaSeconds) || 0, 0, 0.08);
  const ball = snapshot.ball;
  const owner = ball.owner >= 0
    ? snapshot.players.find(player => player.id === ball.owner)
    : null;
  const attackDirection = (owner?.team ?? ball.lastTouchTeam) === 1 ? -1 : 1;

  // A small velocity lead keeps fast passes and clearances inside the frame.
  const lead = clamp((Number(ball.vx) || 0) * 0.28, -7, 7);
  const desiredX = clamp(ball.x + lead + attackDirection * 2.5, 7, 98);
  const lateralOffset = clamp((ball.y - 34) * 0.16, -5.2, 5.2);

  // Tighten the shot slightly in either attacking third without abrupt zoom jumps.
  const goalDistance = Math.min(ball.x, 105 - ball.x);
  const attackingThird = 1 - clamp((goalDistance - 9) / 25, 0, 1);
  const zoom = attackingThird * 0.78;
  const baseZ = state.mobile ? 104 : 98;
  const baseY = state.mobile ? 43 : 40;
  const desiredZ = baseZ - zoom * 10;
  const desiredY = baseY - zoom * 4.2;

  state.targetX = damp(state.targetX, desiredX, 2.7, dt);
  state.targetY = damp(state.targetY, 0.6, 2.2, dt);
  state.targetZ = damp(state.targetZ, lateralOffset, 1.8, dt);
  state.x = damp(state.x, state.targetX, 3.4, dt);
  state.y = damp(state.y, desiredY, 1.65, dt);
  state.z = damp(state.z, desiredZ, 1.65, dt);

  camera.position.set(state.x, state.y, state.z);
  camera.lookAt(state.targetX, state.targetY, state.targetZ);
}
