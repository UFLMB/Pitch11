import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const playerSource = await readFile(new URL("./match-player-renderer.mjs", import.meta.url), "utf8");
const runtimeSource = await readFile(new URL("../stadium-runtime.js", import.meta.url), "utf8");

test("validated player model becomes renderable before animation FBXs finish", () => {
  const readyAt = playerSource.indexOf('this.status = "ready";');
  const animationBatchAt = playerSource.indexOf("this.animationLoadPromise = (async () =>");
  assert.notEqual(readyAt, -1, "player renderer must expose a ready state");
  assert.notEqual(animationBatchAt, -1, "the complete animation catalog must preload asynchronously");
  assert.ok(readyAt < animationBatchAt, "player visibility must not wait for the animation batch");
  assert.match(playerSource, /this\.animationLoadState = "loading"/);
});

test("production stadium retries mobile WebGL2 with low-power context attributes", () => {
  assert.match(runtimeSource, /getContext\('webgl2'/);
  assert.match(runtimeSource, /powerPreference:'low-power'/);
  assert.match(runtimeSource, /powerPreference:'default'/);
  assert.match(runtimeSource, /p11stadiumbooterror/);
});

test("production player model load has a bounded mobile timeout and boot diagnostics", () => {
  assert.match(runtimeSource, /modelLoadTimeoutMs:mobile\?90000:120000/);
  assert.match(runtimeSource, /boot\.playerModel=/);
});


test("same Mixamo clip is not restarted when only the logical locomotion state changes", () => {
  assert.match(playerSource, /entry\.activeClip !== clip/);
  assert.doesNotMatch(playerSource, /entry\.state !== animationState/);
  assert.match(playerSource, /entry\.activeClip = clip/);
});

test("animation mixer cadence matches the stadium render cadence", () => {
  assert.match(playerSource, /this\.animationHz = this\.mobile \? 30 : 60/);
  assert.match(runtimeSource, /now-lastRender>\=\(mobile\?33:16\)/);
});


test("all 54 catalogued player and goalkeeper animations are included in startup preload", async () => {
  const { MIXAMO_ANIMATION_FILES } = await import("./mixamo-animation-catalog.mjs");
  assert.equal(MIXAMO_ANIMATION_FILES.length, 54);
  assert.match(playerSource, /MIXAMO_ANIMATION_FILES\.slice\(offset, offset \+ batchSize\)/);
  assert.match(playerSource, /const batchSize = 4/);
  assert.match(playerSource, /animationProgress\.completed\+\+/);
  assert.match(playerSource, /this\.animationLoadState = failures\.length \? "partial" : "ready"/);
});

test("generated kit texture reads are tracked until they finish or safely fall back", () => {
  assert.match(playerSource, /this\.kitLoadProgress = \{ completed: 0, total: 0 \}/);
  assert.match(playerSource, /this\.kitLoadProgress\.total\+\+/);
  assert.match(playerSource, /\.finally\(finishKitLoad\)/);
  assert.match(playerSource, /type: "kit"/);
  assert.match(runtimeSource, /kitProgress:\{\.\.\.playerRenderer\.kitLoadProgress\}/);
});
