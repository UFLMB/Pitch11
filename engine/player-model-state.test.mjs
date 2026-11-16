import test from "node:test";
import assert from "node:assert/strict";
import { mapLegacyPlayerState, mapLegacyPlayers } from "./player-model-state.mjs";

const player = (overrides = {}) => ({
  team: 0, role: 4, pos: "DEF", gk: false, px: 60, py: 60, x: 160, y: 260,
  vx: 30, vy: 40, face: 0, num: 5, stam: .8, ...overrides
});

test("maps legacy pitch coordinates to the Three.js stadium coordinate system", () => {
  const state = mapLegacyPlayerState(player(), 3, .5);
  assert.equal(state.x, -52.5);
  assert.equal(state.z, -33);
  assert.equal(state.speed, 5);
  assert.equal(state.id, 3);
});

test("maps legacy actions to the shared GLB animation states", () => {
  assert.equal(mapLegacyPlayerState(player({ ak: 1 }), 0).action, "shot");
  assert.equal(mapLegacyPlayerState(player({ ak: 2 }), 0).action, "pass");
  assert.equal(mapLegacyPlayerState(player({ sd: { t: .2 } }), 0).action, "slide-tackle");
  assert.equal(mapLegacyPlayerState(player({ gk: true, dive: 1, diveAng: -1 }), 0).action, "keeper-dive-left");
  assert.equal(mapLegacyPlayerState(player({ down: true }), 0).action, "fall");
  assert.equal(mapLegacyPlayerState(player({ jump: .2 }), 0).action, "header");
});

test("preserves selection, team, goalkeeper role and player appearance variants", () => {
  const selected = player({ team: 1, gk: true, pos: "GK" });
  const state = mapLegacyPlayerState(selected, 11, 1, selected);
  assert.equal(state.selected, true);
  assert.equal(state.team, 1);
  assert.equal(state.role, "GK");
  assert.ok(state.skinTone > 0);
  assert.ok(state.hairTone > 0);
});

test("omits players who are off the pitch and maps the full active squad", () => {
  const states = mapLegacyPlayers([player(), player({ out: true }), player({ team: 1, role: 0, gk: true })]);
  assert.equal(states.length, 2);
  assert.equal(states[1].role, "GK");
});
