/**
 * PITCH 11 broadcast camera — positioned in the open camera gantry gap
 * between the near touchline and the first stand/roof structure.
 *
 * World coordinates: pitch X=-52.5..52.5, Z=-34..34. The near stand
 * starts at Z=47 and its roof starts at Z=44. Keeping the camera at Z=42
 * places it pitch-side of both structures, not above or behind the roof.
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const damp = (current, target, sharpness, dt) =>
  current + (target - current) * (1 - Math.exp(-sharpness * Math.max(0, dt)));

const PITCH_HALF_LENGTH = 52.5;
const toWorldX = metres => metres - PITCH_HALF_LENGTH;

export function createBroadcastCamera(camera, { mobile = false } = {}) {
  const state = {
    x: 0,
    height: mobile ? 26 : 25,
    sideZ: 42,
    targetX: 0,
    targetZ: -34,
    mobile
  };

  // Wider broadcast lens is required to retain both touchlines from this
  // lower, pitch-side gantry position, especially on landscape phones.
  camera.fov = mobile ? 56 : 54;
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

  // The camera remains on one fixed gantry. Only its along-pitch position
  // follows play; it never crosses the roof line or swings behind a goal.
  const desiredHeight = state.mobile ? 26 : 25;
  const desiredSideZ = 42;
  const desiredTargetZ = -34;

  state.targetX = damp(state.targetX, desiredX, 2.6, dt);
  state.x = damp(state.x, state.targetX, 3.0, dt);
  state.height = damp(state.height, desiredHeight, 2.0, dt);
  state.sideZ = damp(state.sideZ, desiredSideZ, 2.0, dt);
  state.targetZ = damp(state.targetZ, desiredTargetZ, 2.0, dt);

  camera.position.set(state.x, state.height, state.sideZ);
  camera.lookAt(state.targetX, 0.6, state.targetZ);
}
