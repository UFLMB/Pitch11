import test from "node:test";
import assert from "node:assert/strict";
import { resolvePlayerAnimationState, resolvePlayerClip, isOneShotAnimationState } from "./player-animation-map.mjs";

test("maps simulation action states to goalkeeper and outfield animation states", () => {
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-catch" }, 0), "keeperCatch");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-parry" }, 0), "keeperParry");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-fingertip" }, 0), "keeperFingertip");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-miss" }, 0), "keeperFingertip");
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
  for (const state of ["header", "jump", "keeperDiveLeft", "keeperDiveRight", "pass", "shot", "getUp"]) {
    assert.equal(isOneShotAnimationState(state), true, `${state} should play once`);
  }
  for (const state of ["idle", "walk", "run", "sprint", "keeperSet", "keeperPenaltyReady", "fallenIdle"]) {
    assert.equal(isOneShotAnimationState(state), false, `${state} should remain looped`);
  }
});
