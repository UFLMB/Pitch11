import test from "node:test";
import assert from "node:assert/strict";
import { resolvePlayerAnimationState, resolvePlayerClip, isOneShotAnimationState, stabilizeLocomotionAnimationState } from "./player-animation-map.mjs";

test("maps simulation action states to goalkeeper and outfield animation states", () => {
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-catch" }, 0), "keeperCatch");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-catch-head" }, 0), "keeperCatchHead");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-catch-stomach" }, 0), "keeperCatchStomach");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-catch-jump" }, 0), "keeperCatchJump");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-parry" }, 0), "keeperParry");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-dive-middle-left" }, 0), "keeperDiveMiddleLeft");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-dive-middle-right" }, 0), "keeperDiveMiddleRight");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-miss" }, 0), "keeperMiss");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-penalty-ready" }, 0), "keeperPenaltyReady");
  assert.equal(resolvePlayerAnimationState({ role: "DEF", action: "press-tackle" }, 1), "tackle");
  assert.equal(resolvePlayerAnimationState({ role: "MID", action: "kick" }, 0), "shot");
  assert.equal(resolvePlayerAnimationState({ role: "FWD", action: "idle" }, 0), "idle");
});

test("selects locomotion state from simulation speed", () => {
  assert.equal(resolvePlayerAnimationState({ action: "idle" }, .5), "walk");
  assert.equal(resolvePlayerAnimationState({ action: "idle" }, 3), "run");
  assert.equal(resolvePlayerAnimationState({ action: "idle" }, 6), "sprint");
});

test("resolves clip names independent of separators and case", () => {
  const clips = [{ name: "Mixamo_Run" }, { name: "GK_Dive_Left" }];
  assert.equal(resolvePlayerClip(clips, "run"), clips[0]);
  assert.equal(resolvePlayerClip(clips, "keeperDiveLeft"), clips[1]);
});

test("falls back to the nearest supported locomotion clip", () => {
  const clips = [{ name: "Walking" }, { name: "Idle" }];
  assert.equal(resolvePlayerClip(clips, "sprint"), clips[0]);
  assert.equal(resolvePlayerClip(clips, "keeperSet"), clips[1]);
  assert.equal(resolvePlayerClip([], "shot"), null);
});


test("resolves clips with exporter and armature prefixes", () => {
  const clips = [{ name: "Armature|mixamo.com|Idle" }, { name: "Armature|GK_Dive_Left" }];
  assert.equal(resolvePlayerClip(clips, "idle"), clips[0]);
  assert.equal(resolvePlayerClip(clips, "keeperDiveLeft"), clips[1]);
});

test("resolves Mixamo-specific receive, pass, fall, recovery and goalkeeper movement states", () => {
  assert.equal(resolvePlayerAnimationState({ role: "FWD", action: "receive" }, 0), "receive");
  assert.equal(resolvePlayerAnimationState({ role: "MID", action: "pass" }, 0), "pass");
  assert.equal(resolvePlayerAnimationState({ role: "DEF", action: "fallen-idle" }, 0), "fallenIdle");
  assert.equal(resolvePlayerAnimationState({ role: "DEF", action: "get-up" }, 0), "getUp");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "idle" }, 1), "keeperMove");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "idle" }, 3), "run");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "idle" }, 6), "sprint");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-pass" }, 0), "keeperPass");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "pass" }, 0), "keeperPass");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "kick" }, 0), "keeperDropKick");
});


test("treats header and other action clips as one-shot animations", () => {
  for (const state of ["header", "jump", "keeperDiveLeft", "keeperDiveRight", "keeperDiveMiddleLeft", "keeperDiveMiddleRight", "keeperCatchHead", "keeperCatchStomach", "keeperCatchJump", "pass", "shot", "getUp"]) {
    assert.equal(isOneShotAnimationState(state), true, `${state} should play once`);
  }
  for (const state of ["idle", "walk", "run", "sprint", "keeperSet", "keeperPenaltyReady", "fallenIdle"]) {
    assert.equal(isOneShotAnimationState(state), false, `${state} should remain looped`);
  }
});



test("maps directional locomotion actions to dedicated animation states", () => {
  assert.equal(resolvePlayerAnimationState({ action: "backward" }, 4), "backward");
  assert.equal(resolvePlayerAnimationState({ action: "strafe-left" }, 4), "strafeLeft");
  assert.equal(resolvePlayerAnimationState({ action: "strafe-right" }, 4), "strafeRight");
  assert.equal(resolvePlayerAnimationState({ action: "shot-high" }, 4), "shotHigh");
  assert.equal(resolvePlayerAnimationState({ action: "penalty-shot" }, 4), "penaltyShot");
  assert.equal(resolvePlayerAnimationState({ action: "forward-diagonal-left" }, 4), "forwardDiagonalLeft");
  assert.equal(resolvePlayerAnimationState({ action: "forward-diagonal-right" }, 4), "forwardDiagonalRight");
  assert.equal(resolvePlayerAnimationState({ action: "backward-diagonal-left" }, 4), "backwardDiagonalLeft");
  assert.equal(resolvePlayerAnimationState({ action: "backward-diagonal-right" }, 4), "backwardDiagonalRight");
});


test("filters one-frame directional locomotion noise but accepts a persistent change", () => {
  const first = stabilizeLocomotionAnimationState("forwardDiagonalRight", "forwardDiagonalLeft");
  assert.deepEqual(first, { state: "forwardDiagonalLeft", pendingState: "forwardDiagonalRight", pendingFrames: 1 });
  const second = stabilizeLocomotionAnimationState(first.pendingState, first.state, first.pendingState, first.pendingFrames);
  assert.deepEqual(second, { state: "forwardDiagonalRight", pendingState: "", pendingFrames: 0 });
  const reverted = stabilizeLocomotionAnimationState("forwardDiagonalLeft", first.state, first.pendingState, first.pendingFrames);
  assert.deepEqual(reverted, { state: "forwardDiagonalLeft", pendingState: "", pendingFrames: 0 });
});

test("does not debounce logical run/sprint changes that share one locomotion clip", () => {
  assert.deepEqual(stabilizeLocomotionAnimationState("sprint", "run"), {
    state: "sprint", pendingState: "", pendingFrames: 0
  });
  assert.deepEqual(stabilizeLocomotionAnimationState("run", "walk"), {
    state: "run", pendingState: "", pendingFrames: 0
  });
});
