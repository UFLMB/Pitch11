import test from "node:test";
import assert from "node:assert/strict";
import {
  createGoalkeeperAnimationController,
  getGoalkeeperReturnStep,
  isGoalkeeperSaveClipComplete,
  selectGoalkeeperReturnClip,
  transitionGoalkeeperPhase
} from "./goalkeeper-animation-controller.mjs";

test("tracks valid goalkeeper animation phases and rejects impossible transitions", () => {
  const controller = createGoalkeeperAnimationController("diving");
  assert.equal(transitionGoalkeeperPhase(controller, "return", "save-clip-finished").accepted, true);
  assert.equal(controller.phase, "return");
  assert.equal(controller.transitionCount, 1);
  assert.equal(transitionGoalkeeperPhase(controller, "diving", "unexpected-restart").accepted, false);
  assert.equal(controller.phase, "return");
});

test("allows explicit reset transitions from any phase", () => {
  const controller = createGoalkeeperAnimationController("return");
  assert.equal(transitionGoalkeeperPhase(controller, "idle", "manual-reset", { force: true }).accepted, true);
  assert.equal(controller.phase, "idle");
});

test("waits for the selected complete one-shot save clip, not a timer", () => {
  const clip = { expectedState: "keeperDiveLowLeft", activeState: "keeperDiveLowLeft", actionTime: 1.1, clipDuration: 1.2 };
  assert.equal(isGoalkeeperSaveClipComplete(clip), false);
  assert.equal(isGoalkeeperSaveClipComplete({ ...clip, actionTime: 1.17 }), true);
  assert.equal(isGoalkeeperSaveClipComplete({ ...clip, activeState: "keeperDiveRight", actionTime: 1.2 }), false);
});

test("chooses the sidestep with the best alignment to the actual home position", () => {
  const selected = selectGoalkeeperReturnClip([
    { file: "sideways.fbx", displacement: { x: 1, z: 0 } },
    { file: "toward-home.fbx", displacement: { x: 2, z: 1 } },
    { file: "away.fbx", displacement: { x: -1, z: 0 } }
  ], { x: 4, z: 2 });
  assert.equal(selected.file, "toward-home.fbx");
  assert.ok(selected.alignment > .999);
});

test("returns no sidestep when the keeper is already home or all clips move away", () => {
  assert.equal(selectGoalkeeperReturnClip([{ file: "away.fbx", displacement: { x: -1, z: 0 } }], { x: 0, z: 0 }), null);
  assert.equal(selectGoalkeeperReturnClip([{ file: "away.fbx", displacement: { x: -1, z: 0 } }], { x: 1, z: 0 }), null);
});

test("selects root motion, settle, fallback, wait and complete recovery steps", () => {
  assert.equal(getGoalkeeperReturnStep({ distance: 2, rootMotionAvailable: true, rootMotionMagnitude: .1 }), "root-motion");
  assert.equal(getGoalkeeperReturnStep({ distance: 2, rootMotionAvailable: true, rootMotionMagnitude: 0 }), "wait");
  assert.equal(getGoalkeeperReturnStep({ distance: .1, rootMotionAvailable: true, rootMotionMagnitude: .1 }), "settle");
  assert.equal(getGoalkeeperReturnStep({ distance: 2, rootMotionAvailable: false, rootMotionMagnitude: 0 }), "fallback");
  assert.equal(getGoalkeeperReturnStep({ distance: .01, rootMotionAvailable: true, rootMotionMagnitude: .1 }), "complete");
});
