import test from "node:test";
import assert from "node:assert/strict";
import { MIXAMO_ANIMATION_FILES, resolveMixamoClipCandidates, isMixamoClipFile } from "./mixamo-animation-catalog.mjs";

test("catalog contains all 54 source FBX clips exactly once", () => {
  assert.equal(MIXAMO_ANIMATION_FILES.length, 54);
  assert.equal(new Set(MIXAMO_ANIMATION_FILES).size, 54);
  assert.ok(MIXAMO_ANIMATION_FILES.every(file => file.endsWith(".fbx")));
});

test("core locomotion resolves to the direct Mixamo source clips", () => {
  assert.deepEqual(resolveMixamoClipCandidates("idle"), ["offensive idle.fbx"]);
  assert.deepEqual(resolveMixamoClipCandidates("run"), ["jog forward.fbx"]);
  assert.deepEqual(resolveMixamoClipCandidates("backward"), ["jog backward.fbx"]);
  assert.deepEqual(resolveMixamoClipCandidates("strafeLeft"), ["jog strafe left.fbx"]);
  assert.deepEqual(resolveMixamoClipCandidates("strafeRight"), ["jog strafe right.fbx"]);
});

test("football action and goalkeeper states map to actual files in the package", () => {
  for (const state of [
    "receive", "dribble", "pass", "shot", "header", "throwIn", "tackle", "fall", "fallenIdle", "getUp",
    "keeperSet", "keeperMove", "keeperDirect", "keeperCatch", "keeperDiveLeft", "keeperDiveRight",
    "keeperParry", "keeperScoop", "keeperMiss", "keeperPass", "keeperDropKick", "keeperThrow", "keeperPlace"
  ]) {
    const candidates = resolveMixamoClipCandidates(state, 3);
    assert.ok(candidates.length > 0, state);
    assert.ok(candidates.every(isMixamoClipFile), state);
  }
});

test("numbered variants are distributed deterministically between players", () => {
  const first = resolveMixamoClipCandidates("dribble", 0);
  const second = resolveMixamoClipCandidates("dribble", 1);
  assert.notDeepEqual(first, second);
  assert.deepEqual(first, resolveMixamoClipCandidates("dribble", 0));
});
