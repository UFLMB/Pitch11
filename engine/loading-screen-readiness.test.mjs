import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [index, stadium, renderer] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../stadium-runtime.js", import.meta.url), "utf8"),
  readFile(new URL("./match-player-renderer.mjs", import.meta.url), "utf8")
]);

test("loading screen keeps progress at or below 94 until every required runtime asset is ready", () => {
  assert.match(index, /const allReady=stadiumReady&&modelReady&&animationsReady&&playerObjectsReady&&pitchReady&&objectsReady;/);
  assert.match(index, /let value=Math\.min\(94,Math\.round\(measured\*94\)\);/);
  assert.match(index, /if\(allReady&&elapsed>=DURATION-FINAL_PHASE\)value=95\+/);
  assert.match(index, /if\(allReady&&elapsed>=DURATION\)value=100;/);
});

test("readiness gate includes stadium, pitch, all three imported scene assets, player rig, animations and 22 player instances", () => {
  assert.match(index, /const stadiumReady=b\.state==='ready'&&b\.sceneObjects\?\.state==='ready';/);
  assert.match(index, /const pitchReady=b\.pitch\?\.state==='ready'/);
  assert.match(index, /const objectsReady=objectStates\.length===3&&objectStates\.every\(state=>state==='ready'\);/);
  assert.match(index, /const modelReady=model\.state==='ready'&&players\.assetReady===true;/);
  assert.match(index, /const playerObjectsReady=players\.ready===true&&expectedPlayers>=22&&renderedPlayers>=22;/);
  assert.match(index, /const animationsReady=animation\.state==='ready'&&animation\.total>0&&animation\.loaded>=animation\.total;/);
  assert.match(stadium, /boot\.sceneObjects=\{state:'ready',count:scene\.children\.length\};/);
  assert.match(stadium, /boot\.pitch=\{state:'ready',progress:1,source:pitchTextureStatus\};/);
});

test("player renderer exposes completion state for every required core animation", () => {
  assert.match(renderer, /get coreAnimationReadiness\(\)/);
  assert.match(renderer, /total: CORE_MIXAMO_CLIPS\.length, loaded, failed, progress: loaded \/ CORE_MIXAMO_CLIPS\.length, state: this\.animationLoadState/);
  assert.match(stadium, /animationReadiness:playerRenderer\.coreAnimationReadiness/);
});

test("loading screen exposes a branded icon-only fullscreen control", () => {
  assert.match(index, /id="p11-loading-fullscreen"[^>]*aria-pressed="false"/);
  assert.match(index, /<svg viewBox="0 0 24 24">/);
  assert.match(index, /#p11-loading-fullscreen\{[^}]*border-radius:16px/);
  assert.match(index, /#p11-loading-fullscreen\.is-active/);
  assert.doesNotMatch(index, /p11-fullscreen-icon[^<]*>⛶/);
});

test("failed required assets cannot unlock the automatic ready state", () => {
  assert.match(index, /b\.pitch\?\.state==='error'/);
  assert.match(index, /const optionalFailed=objectStates\.some\(state=>state==='error'\);/);
  assert.match(index, /const animationFailed=animation\.failed>0\|\|\['partial','error'\]\.includes\(animation\.state\);/);
  assert.match(index, /button\.textContent='CONTINUE ANYWAY'/);
});
