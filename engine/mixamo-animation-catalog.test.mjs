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
    "keeperSet", "keeperPenaltyReady", "keeperMove", "keeperDirect", "keeperCatch", "keeperDiveLeft", "keeperDiveRight", "keeperFingertip",
    "keeperDiveLowLeft", "keeperDiveLowRight", "keeperParry", "keeperScoop", "keeperMiss", "keeperPass", "keeperDropKick", "keeperThrow", "keeperPlace"
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


test("keeps left and right keeper dive clip candidates stable across player IDs", () => {
  const left0 = resolveMixamoClipCandidates("keeperDiveLeft", 0);
  const left1 = resolveMixamoClipCandidates("keeperDiveLeft", 1);
  const right0 = resolveMixamoClipCandidates("keeperDiveRight", 0);
  const right1 = resolveMixamoClipCandidates("keeperDiveRight", 1);
  assert.deepEqual(left1, left0);
  assert.deepEqual(right1, right0);
  assert.equal(left0[0], "goalkeeper diving save (2).fbx");
  assert.equal(right0[0], "goalkeeper diving save.fbx");
  assert.notEqual(left0[0], right0[0]);
});

test("maps the user-confirmed goalkeeper fingertip and penalty-ready clips", () => {
  assert.deepEqual(resolveMixamoClipCandidates("keeperFingertip", 0, "left"), ["goalkeeper diving save (2).fbx"]);
  assert.deepEqual(resolveMixamoClipCandidates("keeperFingertip", 0, "right"), ["goalkeeper diving save.fbx"]);
  assert.deepEqual(resolveMixamoClipCandidates("keeperMiss", 0, "left"), ["goalkeeper diving save (2).fbx"]);
  assert.deepEqual(resolveMixamoClipCandidates("keeperMiss", 0, "right"), ["goalkeeper diving save.fbx"]);
  assert.deepEqual(resolveMixamoClipCandidates("keeperPenaltyReady"), ["transition.fbx"]);
});

test("maps low left and right saves to their dedicated body-block clips", () => {
  assert.deepEqual(resolveMixamoClipCandidates("keeperDiveLowLeft"), ["goalkeeper body block (2).fbx"]);
  assert.deepEqual(resolveMixamoClipCandidates("keeperDiveLowRight"), ["goalkeeper body block (3).fbx"]);
});
