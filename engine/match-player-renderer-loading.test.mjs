import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const playerSource = await readFile(new URL("./match-player-renderer.mjs", import.meta.url), "utf8");
const runtimeSource = await readFile(new URL("../stadium-runtime.js", import.meta.url), "utf8");

test("validated player model becomes renderable before animation FBXs finish", () => {
  const readyAt = playerSource.indexOf('this.status = "ready";');
  const animationBatchAt = playerSource.indexOf("this.animationLoadPromise = Promise.allSettled");
  assert.notEqual(readyAt, -1, "player renderer must expose a ready state");
  assert.notEqual(animationBatchAt, -1, "core animations must load asynchronously");
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
