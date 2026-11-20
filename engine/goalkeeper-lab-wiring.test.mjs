import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lab = readFileSync(resolve(root, "goalkeeper-lab.html"), "utf8");
const catalog = readFileSync(resolve(root, "engine/mixamo-animation-catalog.mjs"), "utf8");

test("shot-triggered saves load the exact AI-selected directional FBX", () => {
  assert.match(lab, /keeper\.manualClipFile=keeper\.diveClipFile/);
  assert.match(lab, /keeper\.manualClipToken=\(keeper\.manualClipToken\|\|0\)\+1/);
});

test("goalkeeper returns with a sidestep animation while one controller owns position", () => {
  assert.match(lab, /keeper\.animationOverride="keeper-move"/);
  assert.match(catalog, /keeperMove:\["goalkeeper sidestep\.fbx","goalkeeper sidestep \(2\)\.fbx"\]/);
  assert.match(lab, /THREE\.MathUtils\.damp\(keeper\.x,585,5\.5,dt\)/);
  assert.match(lab, /keeper\.animationOverride=""/);
});
