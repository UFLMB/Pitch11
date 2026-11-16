import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("production stadium renderer owns the skinned player runtime", () => {
  const runtime = read("../stadium-runtime.js");
  const index = read("../index.html");
  const renderer = read("./match-player-renderer.mjs");
  assert.match(runtime, /MatchPlayerRenderer/);
  assert.match(runtime, /playerRenderer\.update\(options\.players/);
  assert.match(runtime, /get playerModelsReady\(\)/);
  assert.match(index, /players:P,selectedPlayer:ctrl,alpha:a,delta:DT/);
  assert.match(renderer, /assets\/players\/player\.glb/);
  assert.match(renderer, /cloneSkeleton/);
  assert.match(renderer, /isSkinnedMesh/);
});

test("2D player drawing remains as a safe fallback until a valid skinned model loads", () => {
  const index = read("../index.html");
  assert.match(index, /playerModelsReady/);
  assert.match(index, /if\(!playerModelsReady\)drawPlayer\(p,a\)/);
  assert.match(index, /drawPlayer3\(p,a,playerModelsReady\)/);
});
