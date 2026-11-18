import test from "node:test";
import assert from "node:assert/strict";
import { mapLegacyBallState, MATCH_BALL_RADIUS_METRES } from "./match-ball-state.mjs";

test("maps the pitch centre to the Three.js world origin", () => {
  const state = mapLegacyBallState({ px: 585, py: 400, pz: 0, x: 585, y: 400, z: 0 });
  assert.deepEqual(state, { x: 0, z: 0, height: 0, rotation: 0, visible: true });
});

test("interpolates ball position and height in metres", () => {
  const state = mapLegacyBallState({
    px: 485, py: 300, pz: 0,
    x: 585, y: 500, z: 20,
    rot: 1.25
  }, 0.5);
  assert.equal(state.x, -5);
  assert.equal(state.z, 0);
  assert.equal(state.height, 1);
  assert.equal(state.rotation, 1.25);
});

test("clamps interpolation and never returns a negative height", () => {
  const state = mapLegacyBallState({
    px: 585, py: 400, pz: -5,
    x: 585, y: 400, z: -5
  }, 4);
  assert.equal(state.height, 0);
});

test("uses current coordinates when previous coordinates are absent", () => {
  const state = mapLegacyBallState({ x: 685, y: 500, z: 4 });
  assert.equal(state.x, 10);
  assert.equal(state.z, 10);
  assert.equal(state.height, 0.4);
});

test("uses the physical regulation ball radius", () => {
  assert.equal(MATCH_BALL_RADIUS_METRES, 0.11);
});
