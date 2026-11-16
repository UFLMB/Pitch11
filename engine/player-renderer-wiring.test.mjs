import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("production stadium renderer owns the skinned player runtime", () => {
  const runtime = read("../stadium-runtime.js");
  const index = read("../index.html");
  const renderer = read("./match-player-renderer.mjs");
  assert.ok(runtime.includes("MatchPlayerRenderer"));
  assert.ok(runtime.includes("playerRenderer.update(options.players"));
  assert.ok(runtime.includes("get playerModelsReady(){"));
  assert.ok(index.includes("players:P,selectedPlayer:ctrl,alpha:a,delta:window.P11Stadium.mobile?1/30:DT"));
  assert.ok(renderer.includes("../assets/players/player.glb"));
  assert.ok(renderer.includes("cloneSkeleton"));
  assert.ok(renderer.includes("isSkinnedMesh"));
  assert.ok(renderer.includes("setMeshoptDecoder(MeshoptDecoder)"));
  assert.ok(renderer.includes("loading-animations"));
  assert.ok(renderer.includes("idle.glb"));
  assert.ok(renderer.includes("walk.glb"));
  assert.ok(renderer.includes("run.glb"));
});

test("2D player drawing remains as a safe fallback until a valid skinned model loads", () => {
  const index = read("../index.html");
  assert.ok(index.includes("playerModelsReady"));
  assert.ok(index.includes("else drawPlayer(p,a)"));
  assert.ok(index.includes("drawPlayer3(p,a,playerModelsReady)"));
});
