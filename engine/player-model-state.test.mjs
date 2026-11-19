import test from "node:test";
import assert from "node:assert/strict";
import { mapLegacyPlayerState, mapLegacyPlayers, resolveKeeperDiveSide, resolveKeeperDiveAngle } from "./player-model-state.mjs";
import { resolvePlayerAnimationState } from "./player-animation-map.mjs";

const player = (overrides = {}) => ({
  team: 0, role: 4, pos: "DEF", gk: false, px: 60, py: 60, x: 160, y: 260,
  vx: 30, vy: 40, face: 0, num: 5, stam: .8, ...overrides
});

test("maps legacy pitch coordinates to the Three.js stadium coordinate system", () => {
  const state = mapLegacyPlayerState(player(), 3, .5);
  assert.equal(state.x, -47.5);
  assert.equal(state.z, -24);
  assert.equal(state.speed, 5);
  assert.equal(state.id, 3);
});

test("maps legacy actions to the shared GLB animation states", () => {
  assert.equal(mapLegacyPlayerState(player({ ak: 1 }), 0).action, "shot");
  assert.equal(mapLegacyPlayerState(player({ ak: 2 }), 0).action, "pass");
  assert.equal(mapLegacyPlayerState(player({ sd: { t: .2 } }), 0).action, "slide-tackle");
  assert.equal(mapLegacyPlayerState(player({ gk: true, dive: 1, diveAng: -1 }), 0).action, "keeper-dive-right");
  assert.equal(mapLegacyPlayerState(player({ gk: true, animationOverride: "keeper-catch" }), 0).action, "keeper-catch");
  assert.equal(mapLegacyPlayerState(player({ gk: true, animationOverride: "keeper-parry" }), 0).action, "keeper-parry");
  const recoveringKeeper = mapLegacyPlayerState(player({ gk: true, dive: 0, diveRecover: .4 }), 0);
  assert.equal(recoveringKeeper.action, "get-up");
  assert.equal(resolvePlayerAnimationState(recoveringKeeper, recoveringKeeper.speed), "getUp");
  const recoveredKeeper = mapLegacyPlayerState(player({ gk: true, dive: 0, diveRecover: 0, vx: 0, vy: 0 }), 0);
  assert.equal(resolvePlayerAnimationState(recoveredKeeper, recoveredKeeper.speed), "keeperSet");
  assert.equal(mapLegacyPlayerState(player({ down: true }), 0).action, "fallen-idle");
  assert.equal(mapLegacyPlayerState(player({ jump: .2 }), 0).action, "header");
});

test("resolves keeper dive clips in local left/right space for both goal directions", () => {
  const upfield = Math.PI / 2;
  const downfield = -Math.PI / 2;
  assert.equal(resolveKeeperDiveSide(upfield, 0), "left");
  assert.equal(resolveKeeperDiveSide(downfield, 0), "right");
  assert.equal(resolveKeeperDiveSide(upfield, Math.PI), "right");
  assert.equal(resolveKeeperDiveSide(downfield, Math.PI), "left");
});

test("maps goalkeeper dive direction relative to the keeper's facing", () => {
  assert.equal(mapLegacyPlayerState(player({ gk: true, face: 0, dive: .5, diveAng: Math.PI / 2 }), 0).action, "keeper-dive-left");
  assert.equal(mapLegacyPlayerState(player({ gk: true, face: Math.PI, dive: .5, diveAng: Math.PI / 2 }), 0).action, "keeper-dive-right");
  assert.equal(mapLegacyPlayerState(player({ gk: true, face: 0, dive: .5, diveAng: Math.PI / 2, diveHeight: "low" }), 0).action, "keeper-dive-low-left");
  assert.equal(mapLegacyPlayerState(player({ gk: true, face: Math.PI, dive: .5, diveAng: Math.PI / 2, diveHeight: "low" }), 0).action, "keeper-dive-low-right");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-dive-low-left" }), "keeperDiveLowLeft");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-dive-low-right" }), "keeperDiveLowRight");
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
  assert.equal(states.length, 3);
  assert.equal(states[1].visible, false);
  assert.equal(states[2].role, "GK");
});

test("maps stationary possession and throw-in restarts to dedicated Mixamo action states", () => {
  const carrier = player({ vx: 0, vy: 0 });
  assert.equal(mapLegacyPlayerState(carrier, 0, 1, null, carrier).action, "dribble");
  const keeper = player({ gk: true, vx: 0, vy: 0 });
  assert.equal(mapLegacyPlayerState(keeper, 1, 1, null, keeper).action, "keeper-catch");
  const thrower = player();
  assert.equal(mapLegacyPlayerState(thrower, 0, 1, null, null, { kind: "throw", p: thrower }).action, "throw-in");
});


test("converts keeper-local dive sides into world angles for either facing direction", () => {
  for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const leftAngle = resolveKeeperDiveAngle("left", facing);
    const rightAngle = resolveKeeperDiveAngle("right", facing);
    assert.equal(resolveKeeperDiveSide(leftAngle, facing), "left");
    assert.equal(resolveKeeperDiveSide(rightAngle, facing), "right");
  }
});
