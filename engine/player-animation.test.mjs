import test from "node:test";
import assert from "node:assert/strict";
import { computeLocomotionPose } from "./player-animation.mjs";

test("idle players keep their limbs and body still", () => {
  assert.deepEqual(computeLocomotionPose(0, 12, 3), {
    gait: 0, stride: 0, leftKnee: 0, rightKnee: 0, bob: 0
  });
});

test("walking and sprinting produce bounded opposing limb cycles", () => {
  const walk = computeLocomotionPose(2.5, 1.2, 4);
  const sprint = computeLocomotionPose(9, 1.2, 4);
  assert.ok(walk.gait > 0 && walk.gait < 1);
  assert.equal(sprint.gait, 1);
  assert.ok(Math.abs(walk.stride) <= .62);
  assert.ok(walk.leftKnee >= 0 && walk.leftKnee <= .48);
  assert.ok(walk.rightKnee >= 0 && walk.rightKnee <= .48);
  assert.ok(walk.bob >= 0 && walk.bob <= .025);
});

test("negative speed and non-finite inputs fail safe to idle", () => {
  assert.deepEqual(computeLocomotionPose(-5, Number.NaN, 0), {
    gait: 0, stride: 0, leftKnee: 0, rightKnee: 0, bob: 0
  });
});
