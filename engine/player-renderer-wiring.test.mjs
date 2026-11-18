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
  assert.ok(runtime.includes("playerRenderer.setGroundHeight(pitchSurfaceY + 0.025)"));
  assert.ok(runtime.includes("get playerModelsReady(){"));
  assert.ok(index.includes("players:P,selectedPlayer:ctrl,alpha:a,delta:window.P11Stadium.mobile?1/30:DT"));
  assert.ok(renderer.includes("../assets/players/player.glb"));
  assert.ok(renderer.includes("../input/player-model-candidate/character.fbx"));
  assert.ok(renderer.includes("new FBXLoader()"));
  assert.ok(renderer.includes("validateDirectMixamoClip"));
  assert.ok(renderer.includes("resolveMixamoClipCandidates"));
  assert.ok(renderer.includes("CORE_MIXAMO_CLIPS"));
  assert.ok(renderer.includes("cloneSkeleton"));
  assert.ok(renderer.includes("setGroundHeight(value)"));
  assert.ok(renderer.includes("group.position.set(state.x, this.groundHeight, state.z)"));
  assert.ok(renderer.includes("node.frustumCulled = false"));
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
  assert.match(index, /if\(p!==ctrl&&indCol\(p\)\)\{ctx\.strokeStyle=indCol\(p\);ctx\.lineWidth=\.9;/);
  assert.match(index, /if\(p===ctrl\)\{\s*ctx\.strokeStyle=indCol\(p\)\|\|\x27#ffe600\x27;ctx\.lineWidth=\.9;/);
  assert.match(index, /drawPlayer3=function\(p,a,markersOnly=false\)\{\s*_dp39\(p,a,markersOnly\);/);
  assert.ok(index.includes("drawPlayer3=function(p,a,markersOnly=false){if(!REF.d3&&on2()&&REF.y<=p.y){REF.d3=1;drawFig3(figO(REF,a));}_d3R(p,a,markersOnly);}"));
  assert.ok(index.includes("function drawPlayer(p,a){return;}"));
  assert.ok(index.includes("function drawPlayerOld(p,a){return;}"));
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
