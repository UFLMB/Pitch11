import test from "node:test";
import assert from "node:assert/strict";
import {
  PLAYABLE_PITCH, isOutsidePlayablePitch, createSecurityPositions,
  crowdReactionProfile, crowdReactionEnvelope
} from "./stadium-atmosphere.mjs";

test("the playable pitch rectangle and its interior are protected", () => {
  assert.equal(isOutsidePlayablePitch(0, 0), false);
  assert.equal(isOutsidePlayablePitch(PLAYABLE_PITCH.minX, 0), false);
  assert.equal(isOutsidePlayablePitch(0, PLAYABLE_PITCH.maxZ), false);
  assert.equal(isOutsidePlayablePitch(0, 35, 1), false);
  assert.equal(isOutsidePlayablePitch(0, 36, 1), true);
});

test("every security position stays outside the pitch with a one metre safety margin", () => {
  const positions = createSecurityPositions();
  assert.equal(positions.length, 20);
  for (const point of positions) assert.equal(isOutsidePlayablePitch(point.x, point.z, 1), true);
});

test("match events map to bounded crowd reactions", () => {
  assert.deepEqual(crowdReactionProfile("goal"), { duration: 3.8, intensity: 1 });
  assert.equal(crowdReactionProfile("unknown-event"), null);
  assert.equal(crowdReactionEnvelope(-.1, 2, 1), 0);
  assert.equal(crowdReactionEnvelope(2, 2, 1), 0);
  assert.ok(crowdReactionEnvelope(.2, 2, .7) > 0);
  assert.ok(crowdReactionEnvelope(.2, 2, .7) <= .7);
});
