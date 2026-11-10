/**
 * Matchday atmosphere placement and reaction rules.
 * The playable pitch is an inviolable rectangle in render-world coordinates.
 */
export const PLAYABLE_PITCH = Object.freeze({ minX: -52.5, maxX: 52.5, minZ: -34, maxZ: 34 });

export function isOutsidePlayablePitch(x, z, clearance = 0) {
  const values = [x, z, clearance].map(Number);
  if (!values.every(Number.isFinite) || clearance < 0) return false;
  return x < PLAYABLE_PITCH.minX - clearance ||
    x > PLAYABLE_PITCH.maxX + clearance ||
    z < PLAYABLE_PITCH.minZ - clearance ||
    z > PLAYABLE_PITCH.maxZ + clearance;
}

export function createSecurityPositions() {
  const positions = [];
  for (const z of [-41.5, 41.5]) {
    for (const x of [-40, -24, -8, 8, 24, 40]) positions.push({ x, z, zone: "sideline-perimeter" });
  }
  for (const x of [-58, 58]) {
    for (const z of [-18, -6, 6, 18]) positions.push({ x, z, zone: "goal-end-perimeter" });
  }
  if (positions.some(({ x, z }) => !isOutsidePlayablePitch(x, z, 1))) {
    throw new Error("Stadium security must remain outside the playable pitch and its safety margin.");
  }
  return positions;
}

const REACTIONS = Object.freeze({
  goal: Object.freeze({ duration: 3.8, intensity: 1 }),
  keeperSave: Object.freeze({ duration: 2.2, intensity: .72 }),
  tackleWon: Object.freeze({ duration: 1.45, intensity: .38 }),
  tackleMissed: Object.freeze({ duration: 1.1, intensity: .2 }),
  yellowCard: Object.freeze({ duration: 1.7, intensity: .28 }),
  redCard: Object.freeze({ duration: 2.5, intensity: .42 }),
  foul: Object.freeze({ duration: 1.2, intensity: .2 }),
  offside: Object.freeze({ duration: 1.15, intensity: .18 }),
  restartAwarded: Object.freeze({ duration: .8, intensity: .1 })
});

export function crowdReactionProfile(eventType) {
  return REACTIONS[eventType] ?? null;
}

export function crowdReactionEnvelope(elapsed, duration, intensity = 1) {
  if (![elapsed, duration, intensity].every(Number.isFinite) || duration <= 0 || elapsed < 0 || elapsed >= duration) return 0;
  const progress = elapsed / duration;
  const fade = Math.pow(1 - progress, 1.65);
  const attack = Math.min(1, progress * 8 + .08);
  return Math.max(0, Math.min(1, intensity * fade * attack));
}
