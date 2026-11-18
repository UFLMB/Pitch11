import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMixamoTrackTargets } from "./mixamo-track-binding.mjs";

const track = name => ({ name, values: [1, 2, 3], clone() { return { ...this, values: [...this.values] }; } });

test("normalizes Mixamo namespace spelling to the exact existing skeleton bone names", () => {
  const source = [track("mixamorig:Hips.quaternion"), track("mixamorig:LeftArm.rotation")];
  const result = normalizeMixamoTrackTargets(["mixamorigHips", "mixamorigLeftArm"], source);
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(result.ambiguous, []);
  assert.equal(result.trackCount, 2);
  assert.equal(result.uniqueTargets, 2);
  assert.deepEqual(result.tracks.map(item => item.name), ["mixamorigHips.quaternion", "mixamorigLeftArm.rotation"]);
  assert.notEqual(result.tracks[0], source[0]);
});

test("supports case, separators and numbered Mixamo prefixes without changing bone transforms", () => {
  const result = normalizeMixamoTrackTargets(
    ["mixamorig1Hips", "mixamorig1Spine"],
    [track("MixamoRig_1:Hips.position"), track("mixamorig1:Spine.quaternion")]
  );
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(result.tracks.map(item => item.name), ["mixamorig1Hips.position", "mixamorig1Spine.quaternion"]);
});

test("rejects missing or ambiguous bone targets instead of silently retargeting", () => {
  const result = normalizeMixamoTrackTargets(
    ["mixamorigHips", "mixamorigLeftArm", "mixamorig:LeftArm"],
    [track("mixamorig:Unknown.quaternion"), track("mixamorig:LeftArm.quaternion")]
  );
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.ambiguous.length, 1);
  assert.equal(result.uniqueTargets, 0);
});

test("keeps the source animation track count and fails safely on empty clips", () => {
  const result = normalizeMixamoTrackTargets(["mixamorigHips"], []);
  assert.equal(result.trackCount, 0);
  assert.equal(result.uniqueTargets, 0);
  assert.deepEqual(result.unresolved, []);
});
