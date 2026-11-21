import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const playerSource = await readFile(new URL("./match-player-renderer.mjs", import.meta.url), "utf8");

test("captures model and Mixamo skeleton-root bind translations per player", () => {
  assert.match(playerSource, /const locomotionRootBones = \["root", "hips"\]/);
  assert.match(playerSource, /const modelBasePosition = model\.position\.clone\(\)/);
  assert.match(playerSource, /modelBasePosition, bones, locomotionRootBones/);
});

test("restores root translations after cyclic locomotion mixer updates", () => {
  const mixerUpdate = playerSource.indexOf("mixer.update(animationDelta)");
  const restoreModel = playerSource.indexOf("entry.model.position.copy(entry.modelBasePosition)", mixerUpdate);
  const restoreBones = playerSource.indexOf("rootBone.node.position.copy(rootBone.position)", mixerUpdate);
  const nextRootMotion = playerSource.indexOf("const action = entry.activeAction", mixerUpdate);
  assert.ok(mixerUpdate >= 0, "mixer update must exist");
  assert.ok(restoreModel > mixerUpdate && restoreModel < nextRootMotion);
  assert.ok(restoreBones > mixerUpdate && restoreBones < nextRootMotion);
  assert.match(playerSource, /\["idle", "walk", "run", "sprint", "backward", "strafeLeft", "strafeRight"/);
  assert.match(playerSource, /"forwardDiagonalLeft", "forwardDiagonalRight", "backwardDiagonalLeft", "backwardDiagonalRight"/);
});

test("keeps world position owned by the simulation and preserves animation rotations", () => {
  assert.match(playerSource, /group\.position\.set\(state\.x, this\.groundHeight, state\.z\)/);
  assert.match(playerSource, /rootBone\.node\.position\.copy\(rootBone\.position\)/);
  assert.doesNotMatch(playerSource, /rootBone\.node\.quaternion\.copy/);
});
