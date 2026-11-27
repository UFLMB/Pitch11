import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runtime = readFileSync(new URL("../stadium-runtime.js", import.meta.url), "utf8");

test("procedural turf waits until all Meshy PBR maps have settled", () => {
  const pbrCompletion = runtime.indexOf("pitchGrassPbrDiagnostics.completedAt=new Date().toISOString()");
  const pbrSchedule = runtime.indexOf("scheduleDetailedPitchTexture();", pbrCompletion);
  const stadiumSchedule = runtime.indexOf("scheduleDetailedPitchTexture();", pbrSchedule + 1);
  assert.notEqual(pbrCompletion, -1, "PBR completion marker exists");
  assert.ok(pbrSchedule > pbrCompletion, "PBR completion schedules the turf decision");
  assert.ok(stadiumSchedule > pbrSchedule, "stadium-ready path also requests the same guarded decision");
  assert.match(runtime, /detailedTurfTextureStarted=false/);
  assert.match(runtime, /pitchGrassPbrDiagnostics\.status==='loading'[\s\S]*?waiting-for-pbr/);
});

test("successful Meshy albedo is preserved instead of being overwritten by procedural grass", () => {
  const start = runtime.indexOf("function scheduleDetailedPitchTexture()");
  const end = runtime.indexOf("\n }\n function setStadiumLoadState", start);
  assert.ok(start >= 0 && end > start, "turf scheduling function exists");
  const scheduler = runtime.slice(start, end);
  assert.match(scheduler, /pitchGrassPbrDiagnostics\.baseColorApplied/);
  assert.match(scheduler, /skipped-meshy-pbr/);
  assert.match(scheduler, /drawProceduralGrassProgressive/);
  assert.match(scheduler, /procedural-hd-local-fallback/);
  assert.ok(scheduler.indexOf("baseColorApplied") < scheduler.indexOf("drawProceduralGrassProgressive"),
    "procedural fallback is only considered after the successful-PBR branch");
});

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const playerRenderer = readFileSync(new URL("./match-player-renderer.mjs", import.meta.url), "utf8");

test("loading screen fullscreen control uses the PITCH 11 icon-only glass treatment", () => {
  assert.match(html, /id="p11-loading-fullscreen"[^>]*aria-pressed="false"/);
  assert.match(html, /p11-fullscreen-icon[^>]*><svg viewBox="0 0 24 24"/);
  assert.match(html, /#p11-loading-fullscreen::before/);
  assert.match(html, /#p11-loading-fullscreen\\.is-active/);
});

test("loading percentage cannot pass 94 until all required runtime systems are ready", () => {
  assert.match(html, /let value=Math\\.min\\(94,Math\\.round\\(measured\\*94\\)\\)/);
  assert.match(html, /if\\(allReady&&elapsed>=DURATION-FINAL_PHASE\\)value=95/);
  assert.match(html, /if\\(allReady&&elapsed>=DURATION\\)value=100/);
  for (const expression of [
    "b.state==='ready'&&b.sceneObjects?.state==='ready'",
    "model.state==='ready'&&players.assetReady===true",
    "animation.state==='ready'&&animation.total>0&&animation.loaded>=animation.total",
    "players.ready===true&&expectedPlayers>=22&&renderedPlayers>=22",
    "b.pitch?.state==='ready'",
    "objectStates.length===3&&objectStates.every(state=>state==='ready')"
  ]) assert.ok(html.includes(expression), `Missing loading gate: ${expression}`);
});

test("stadium runtime publishes measured pitch, scene and optional object readiness", () => {
  assert.match(runtime, /boot\\.pitch=\\{state:'loading',progress:0\\}/);
  assert.match(runtime, /boot\\.pitch=\\{state:'ready',progress:1,source:pitchTextureStatus\\}/);
  assert.match(runtime, /boot\\.sceneObjects=\\{state:'ready',count:scene\\.children\\.length\\}/);
  assert.match(runtime, /boot\\.optionalAssets=optionalAssets/);
});

test("player renderer exposes readiness for all core animation clips", () => {
  assert.match(playerRenderer, /get coreAnimationReadiness\\(\\)/);
  assert.match(playerRenderer, /loaded, failed, progress: loaded \\/ CORE_MIXAMO_CLIPS\\.length, state: this\\.animationLoadState/);
});
