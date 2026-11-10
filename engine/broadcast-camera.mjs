/**
 * PITCH 11 broadcast camera — placed in the open camera lane just pitch-side
 * of the first seating row and underneath the near-side roof canopy.
 *
 * Stadium geometry: near stand begins at Z=47; roof spans Z=44..74 and
 * Y=21.7..23.9. Camera at (Y=10, Z=45) is in front of the stand and below
 * the canopy, looking inward across the pitch rather than through the roof.
 * Rendered pitch coordinates: X=-52.5..52.5, Z=-34..34.
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const damp = (current, target, sharpness, dt) =>
  current + (target - current) * (1 - Math.exp(-sharpness * Math.max(0, dt)));

const PITCH_HALF_LENGTH = 52.5;
const toWorldX = metres => metres - PITCH_HALF_LENGTH;

export function createBroadcastCamera(camera, { mobile = false } = {}) {
  const state = {
    x: 0,
    height: 10,
    sideZ: 45,
    targetX: 0,
    targetZ: 0,
    mobile
  };

  // Broad Tele Broadcast framing is necessary from the lower camera lane.
  camera.fov = mobile ? 66 : 62;
  camera.near = 0.1;
  camera.far = 320;
  camera.position.set(state.x, state.height, state.sideZ);
  camera.lookAt(state.targetX, 0.6, state.targetZ);
  camera.updateProjectionMatrix();
  return state;
}

export function updateBroadcastCamera(camera, state, snapshot, deltaSeconds) {
  if (!snapshot?.ball || !state) return;
  const dt = clamp(Number(deltaSeconds) || 0, 0, 0.08);
  const ball = snapshot.ball;
  const owner = ball.owner >= 0
    ? snapshot.players.find(player => player.id === ball.owner)
    : null;
  const attackDirection = (owner?.team ?? ball.lastTouchTeam) === 1 ? -1 : 1;

  const velocityLead = clamp((Number(ball.vx) || 0) * 0.20, -5, 5);
  const simTargetX = clamp(ball.x + velocityLead + attackDirection * 1.5, 6, 99);
  const desiredX = clamp(toWorldX(simTargetX), -45, 45);

  // Fixed gantry and pitch-centre aim prevent the camera entering the roof,
  // stands, or goal-end structures while play moves along the field.
  state.targetX = damp(state.targetX, desiredX, 2.6, dt);
  state.x = damp(state.x, state.targetX, 3.0, dt);
  state.height = damp(state.height, 10, 2.0, dt);
  state.sideZ = damp(state.sideZ, 45, 2.0, dt);
  state.targetZ = damp(state.targetZ, 0, 2.0, dt);

  camera.position.set(state.x, state.height, state.sideZ);
  camera.lookAt(state.targetX, 0.6, state.targetZ);
}
