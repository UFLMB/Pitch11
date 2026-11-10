import test from "node:test";
import assert from "node:assert/strict";
import { resolvePlayerAnimationState, resolvePlayerClip } from "./player-animation-map.mjs";

test("maps simulation action states to goalkeeper and outfield animation states", () => {
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-catch" }, 0), "keeperCatch");
  assert.equal(resolvePlayerAnimationState({ role: "GK", action: "keeper-parry" }, 0), "keeperParry");
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
