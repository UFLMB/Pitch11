/**
 * PITCH 11 broadcast camera — Three.js world-space coordinates.
 *
 * The simulation uses X=0..105 and Y=0..68 metres. The rendered pitch is
 * centred at the origin: worldX = simulationX - 52.5, worldZ = simulationY - 34.
 * Three.js world Y is vertical. This conversion is intentionally kept here so
 * simulation coordinates can never be mistaken for camera world coordinates.
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const damp = (current, target, sharpness, dt) =>
  current + (target - current) * (1 - Math.exp(-sharpness * Math.max(0, dt)));

const PITCH_HALF_LENGTH = 52.5;
const PITCH_HALF_WIDTH = 34;
const toWorldX = metres => metres - PITCH_HALF_LENGTH;
const toWorldZ = metres => metres - PITCH_HALF_WIDTH;

export function createBroadcastCamera(camera, { mobile = false } = {}) {
  const initial = {
    x: 0,
    height: mobile ? 28 : 27,
    sideZ: mobile ? 70 : 68,
    targetX: 0,
    targetZ: 0,
    mobile
  };
  camera.fov = mobile ? 46 : 44;
  camera.near = 0.1;
  camera.far = 300;
  camera.position.set(initial.x, initial.height, initial.sideZ);
  camera.lookAt(initial.targetX, 0.6, initial.targetZ);
  camera.updateProjectionMatrix();
  return initial;
}

export function updateBroadcastCamera(camera, state, snapshot, deltaSeconds) {
  if (!snapshot?.ball || !state) return;
  const dt = clamp(Number(deltaSeconds) || 0, 0, 0.08);
  const ball = snapshot.ball;
  const owner = ball.owner >= 0
    ? snapshot.players.find(player => player.id === ball.owner)
    : null;
  const attackDirection = (owner?.team ?? ball.lastTouchTeam) === 1 ? -1 : 1;

  // Follow the ball along the pitch length, with a restrained velocity lead.
  const velocityLead = clamp((Number(ball.vx) || 0) * 0.24, -6, 6);
  const simTargetX = clamp(ball.x + velocityLead + attackDirection * 2, 5, 100);
  const desiredX = clamp(toWorldX(simTargetX), -46, 46);

  // Track the ball's lateral lane only slightly; the camera stays on its
  // broadcast gantry instead of orbiting around or crossing the pitch.
  const laneOffset = clamp(toWorldZ(ball.y) * 0.10, -3.4, 3.4);
  const goalDistance = Math.min(ball.x, 105 - ball.x);
  const attackingThird = 1 - clamp((goalDistance - 8) / 27, 0, 1);
  const zoom = attackingThird * 0.68;

  const desiredHeight = (state.mobile ? 28 : 27) - zoom * 2.8;
  const desiredSideZ = (state.mobile ? 70 : 68) - zoom * 7 + laneOffset * 0.12;
  const desiredTargetZ = laneOffset * 0.22;

  state.targetX = damp(state.targetX, desiredX, 2.8, dt);
  state.targetZ = damp(state.targetZ, desiredTargetZ, 1.7, dt);
  state.x = damp(state.x, state.targetX, 3.2, dt);
  state.height = damp(state.height, desiredHeight, 1.8, dt);
  state.sideZ = damp(state.sideZ, desiredSideZ, 1.8, dt);

  camera.position.set(state.x, state.height, state.sideZ);
  camera.lookAt(state.targetX, 0.6, state.targetZ);
}
