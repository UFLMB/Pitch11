/**
 * Maps the legacy match ball snapshot into the production Three.js world.
 * Legacy pitch coordinates use 10 units per metre and the same origin as
 * player-model-state.mjs: (585, 400) is the pitch centre.
 */
export const MATCH_BALL_RADIUS_METRES = 0.11;

export function mapLegacyBallState(ball, alpha = 1) {
  if (!ball || typeof ball !== "object") return null;
  const blend = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  const px = Number.isFinite(ball.px) ? ball.px : ball.x;
  const py = Number.isFinite(ball.py) ? ball.py : ball.y;
  const pz = Number.isFinite(ball.pz) ? ball.pz : ball.z;
  const x = Number.isFinite(ball.x) ? ball.x : px;
  const y = Number.isFinite(ball.y) ? ball.y : py;
  const height = Number.isFinite(ball.z) ? ball.z : pz;

  return {
    x: (px + (x - px) * blend - 585) * 0.1,
    z: (py + (y - py) * blend - 400) * 0.1,
    height: Math.max(0, (pz + (height - pz) * blend) * 0.1),
    rotation: Number.isFinite(ball.rot) ? ball.rot : 0,
    visible: ball.visible !== false
  };
}
