import test from "node:test";
import assert from "node:assert/strict";
import { mapLegacyPlayerState, mapLegacyPlayers, resolveKeeperDiveSide, resolveKeeperDiveAngle } from "./player-model-state.mjs";
import { resolvePlayerAnimationState } from "./player-animation-map.mjs";
import { resolveMixamoClipCandidates } from "./mixamo-animation-catalog.mjs";

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
  const penaltyTaker = player({ ak: 1 });
  assert.equal(mapLegacyPlayerState(penaltyTaker, 0, 1, null, null, { kind: "pen", p: penaltyTaker }).action, "penalty-shot");
  assert.equal(mapLegacyPlayerState(player({ ak: 2 }), 0).action, "pass");
  assert.equal(mapLegacyPlayerState(player({ sd: { t: .2 } }), 0).action, "slide-tackle");
  assert.equal(mapLegacyPlayerState(player({ gk: true, dive: 1, diveAng: -1 }), 0).action, "keeper-dive-left");
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

test("resolves keeper dive clips in viewer-facing screen-left/screen-right space", () => {
  const upfield = Math.PI / 2;
  const downfield = -Math.PI / 2;
  assert.equal(resolveKeeperDiveSide(upfield, 0), "right");
  assert.equal(resolveKeeperDiveSide(downfield, 0), "left");
  assert.equal(resolveKeeperDiveSide(upfield, Math.PI), "left");
  assert.equal(resolveKeeperDiveSide(downfield, Math.PI), "right");
});

test("uses the explicitly requested viewer-facing screen side instead of re-deriving it from the angle", () => {
  assert.equal(mapLegacyPlayerState(player({ gk: true, dive: .5, diveAng: Math.PI / 2, face: 0, diveSide: "right" }), 0).action, "keeper-dive-right");
  assert.equal(mapLegacyPlayerState(player({ gk: true, dive: .5, diveAng: Math.PI / 2, face: 0, diveSide: "left" }), 0).action, "keeper-dive-left");
  assert.equal(mapLegacyPlayerState(player({ gk: true, dive: .5, diveAng: Math.PI / 2, face: 0, diveSide: "left", diveHeight: "low" }), 0).action, "keeper-dive-low-left");
  assert.equal(mapLegacyPlayerState(player({ gk: true, dive: .5, diveAng: Math.PI / 2, face: 0, diveSide: "left", diveHeight: "middle" }), 0).action, "keeper-dive-middle-left");
});

test("keeps the legacy AI dive animation selected after its physical dive timer ends", () => {
  const legacyKeeper = player({ gk: true, dive: 0, diveAnimation: true, diveAnimationFinished: false,
    diveAng: Math.PI / 2, face: Math.PI, diveHeight: "middle" });
  const state = mapLegacyPlayerState(legacyKeeper, 0);
  assert.equal(state.action, "keeper-dive-middle-left");
  assert.equal(state.sourcePlayer, legacyKeeper);
  legacyKeeper.diveAnimationFinished = true;
  assert.equal(mapLegacyPlayerState(legacyKeeper, 0).action, "idle");
});

test("maps goalkeeper dive direction to the viewer-facing screen side", () => {
  assert.equal(mapLegacyPlayerState(player({ gk: true, face: 0, dive: .5, diveAng: Math.PI / 2 }), 0).action, "keeper-dive-right");
  assert.equal(mapLegacyPlayerState(player({ gk: true, face: Math.PI, dive: .5, diveAng: Math.PI / 2 }), 0).action, "keeper-dive-left");
  assert.equal(mapLegacyPlayerState(player({ gk: true, face: 0, dive: .5, diveAng: Math.PI / 2, diveHeight: "low" }), 0).action, "keeper-dive-low-right");
  assert.equal(mapLegacyPlayerState(player({ gk: true, face: Math.PI, dive: .5, diveAng: Math.PI / 2, diveHeight: "low" }), 0).action, "keeper-dive-low-left");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-dive-low-left" }), "keeperDiveLowLeft");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-dive-low-right" }), "keeperDiveLowRight");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-dive-middle-left" }), "keeperDiveMiddleLeft");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-dive-middle-right" }), "keeperDiveMiddleRight");
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

test("resolves the replacement FBX clips including exactly two low-shot saves", () => {
  assert.deepEqual(resolveMixamoClipCandidates("keeperDiveLeft"), ["gk_dive-high_shot-left-ball_in_hand.fbx"]);
  assert.deepEqual(resolveMixamoClipCandidates("keeperDiveMiddleLeft"), ["gk_dive-middle_shot-left-ball_in_hand.fbx"]);
  assert.deepEqual(resolveMixamoClipCandidates("keeperDiveRight"), ["gk_dive-high_shot-right-ball_in_hand.fbx"]);
  assert.deepEqual(resolveMixamoClipCandidates("keeperDiveMiddleRight"), ["gk_dive-middle_shot-right-ball_in_hand.fbx"]);
  assert.deepEqual(resolveMixamoClipCandidates("keeperDiveLowLeft"), [
    "gk_dive-low_shot-left-ball_not_in_hand.fbx"
  ]);
  assert.deepEqual(resolveMixamoClipCandidates("keeperDiveLowRight"), [
    "gk_dive-low_shot-right-ball_not_in_hand.fbx"
  ]);
});



test("selects screen-left and screen-right diagonal clips from the front-facing convention", () => {
  const state = (vx, vy, extra = {}) => mapLegacyPlayerState(player({ vx, vy, face: 0, ...extra }), 0);
  assert.equal(state(100, -100).action, "forward-diagonal-left");
  assert.equal(state(100, 100).action, "forward-diagonal-right");
  assert.equal(state(-100, -100).action, "backward-diagonal-left");
  assert.equal(state(-100, 100).action, "backward-diagonal-right");
  assert.equal(state(-100, 0).action, "backward");
  assert.equal(state(0, -100).action, "strafe-left");
  assert.equal(state(0, 100).action, "strafe-right");
});

test("does not replace skill-move burst animation selection", () => {
  const state = mapLegacyPlayerState(player({ vx: 100, vy: -100, face: 0, skill: .4 }), 0);
  assert.equal(state.action, "idle");
  assert.equal(resolvePlayerAnimationState(state, state.speed), "sprint");
});
