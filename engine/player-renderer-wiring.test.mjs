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

test("legacy 2D player bodies are disabled while 2D overlays and match HUD remain", () => {
  const index = read("../index.html");
  const runtime = read("../stadium-runtime.js");
  assert.ok(index.includes("for(const p of ORD)if(!p.out)drawModelPlayerOverlay2D(p,a);"));
  assert.ok(index.includes("drawPlayer3(p,a,true);"));
  assert.ok(!index.includes("if(playerModelsReady)drawModelPlayerOverlay2D(p,a);else drawPlayer(p,a);"));
  assert.ok(!index.includes("drawPlayer3(p,a,playerModelsReady);"));
  assert.ok(runtime.includes("get playerModelsReady(){return playerRenderer.ready&&playerRenderer.expectedCount>0&&playerRenderer.count>=playerRenderer.expectedCount;}"));
  assert.ok(index.includes("drawBallShadow3(a)"));
  assert.ok(index.includes("drawHud()"));
  assert.ok(index.includes("drawFig3(figO(REF,a))"));
});


test("stadium GLB loader supports Meshopt-compressed geometry", () => {
  const runtime = read("../stadium-runtime.js");
  assert.ok(runtime.includes("import { MeshoptDecoder } from './vendor/three/examples/jsm/libs/meshopt_decoder.module.js';"));
  assert.ok(runtime.includes("new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)"));
});

test("optional animation failures do not prevent skinned player models from rendering", () => {
  const renderer = read("./match-player-renderer.mjs");
  assert.ok(renderer.includes("Promise.allSettled(clipFiles.map"));
  assert.ok(renderer.includes("this.status = \"ready\";"));
  assert.ok(renderer.includes("this.template = null;"));
  assert.ok(!renderer.includes("this.animations = await Promise.all(clipFiles.map"));
});
