/**
 * Adapter between the metres-based simulation and the legacy PITCH 11
 * canvas world (1 metre = 10 legacy units; pitch origin = 60,60).
 * This module is intentionally not imported by index.html yet.
 */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const LEGACY_WORLD = Object.freeze({
  originX: 60, originY: 60, unitsPerMetre: 10,
  pitchWidth: 1050, pitchHeight: 680
});

export function cameraRelativeToPitch(x, y, yaw = 0) {
  const ix = clamp(Number(x) || 0, -1, 1);
  const iy = clamp(Number(y) || 0, -1, 1);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  let wx = ix * c - iy * s;
  let wy = ix * s + iy * c;
  const magnitude = Math.hypot(wx, wy);
  if (magnitude > 1) { wx /= magnitude; wy /= magnitude; }
  return { x: wx, y: wy };
}

export function toLegacyRenderFrame(snapshot, world = LEGACY_WORLD) {
  const scale = world.unitsPerMetre;
  const ox = world.originX, oy = world.originY;
  return {
    tick: snapshot.tick,
    score: [...snapshot.score],
    phase: snapshot.phase,
    players: snapshot.players.map(p => ({
      id: p.id, team: p.team, role: p.role,
      x: ox + p.x * scale, y: oy + p.y * scale,
      vx: p.vx * scale, vy: p.vy * scale,
      facing: p.facing, stamina: p.stamina,
      selected: p.selected, action: p.action, hasBall: p.hasBall
    })),
    ball: {
      x: ox + snapshot.ball.x * scale,
      y: oy + snapshot.ball.y * scale,
      z: snapshot.ball.z * scale,
      vx: snapshot.ball.vx * scale,
      vy: snapshot.ball.vy * scale,
      vz: snapshot.ball.vz * scale,
      owner: snapshot.ball.owner
    },
    events: snapshot.events.slice()
  };
}

export class Pitch11SimulationAdapter {
  constructor(simulation, options = {}) {
    if (!simulation || typeof simulation.update !== "function" || typeof simulation.command !== "function") {
      throw new TypeError("A FootballSimulation-compatible instance is required.");
    }
    this.simulation = simulation;
    this.world = { ...LEGACY_WORLD, ...options.world };
    this.cameraYaw = Number(options.cameraYaw) || 0;
  }
  setCameraYaw(yaw) { this.cameraYaw = Number(yaw) || 0; }
  move(x, y, sprint = false) {
    const direction = cameraRelativeToPitch(x, y, this.cameraYaw);
    this.simulation.command({ type: "move", x: direction.x, y: direction.y, sprint });
  }
  stop() { this.simulation.command({ type: "releaseMove" }); }
  pass(targetId) { this.simulation.command({ type: "pass", targetId }); }
  shoot(power = 1) { this.simulation.command({ type: "shoot", power }); }
  tackle() { this.simulation.command({ type: "tackle" }); }
  switchPlayer() { this.simulation.command({ type: "switch" }); }
  takeRestart() { this.simulation.command({ type: "restart" }); }
  update(deltaSeconds) {
    const snapshot = this.simulation.update(deltaSeconds);
    return { snapshot, renderFrame: toLegacyRenderFrame(snapshot, this.world) };
  }
}
