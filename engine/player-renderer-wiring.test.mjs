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
  assert.ok(renderer.includes("this.inputPlayerCount = states.length"));
  assert.ok(renderer.includes("this.visiblePlayerCount = states.reduce"));
  assert.ok(renderer.includes("get expectedCount()"));
  assert.ok(renderer.includes("get visibleCount()"));
  assert.ok(runtime.includes("expectedPlayers:playerRenderer.expectedCount"));
  assert.ok(runtime.includes("visiblePlayers:playerRenderer.visibleCount"));
  assert.ok(runtime.includes("renderedPlayers:playerRenderer.count"));
});

test("legacy player bodies are suppressed in every 2D and 3D render path", () => {
  const index = read("../index.html");
  assert.ok(index.includes("for(const p of ORD)if(!p.out)drawModelPlayerOverlay2D(p,a);"));
  assert.ok(index.includes("drawPlayer3(p,a,true);"));
  assert.equal(index.split("drawPlayer3(p,a);").length - 1, 0);
  assert.equal(index.split("drawPlayer(p,a);").length - 1, 0);
  assert.ok(index.includes("drawBallShadow3(a)"));
  assert.ok(index.includes("drawHud()"));
  assert.ok(index.includes("drawFig3(figO(REF,a))"));
});
