import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("loading percentage is derived from real boot, animation, audio and texture progress", () => {
  assert.match(index, /const weighted=15\*stadiumProgress\+10\*modelProgress\+35\*animationProgress\+10\*audioRatio/);
  assert.match(index, /anim\.completed===54/);
  assert.match(index, /audioState==='ready'/);
  assert.match(index, /optional\.every\(isReady\)/);
  assert.match(index, /pbrStates\.every\(x=>isReady\(x\.status\)\)/);
  assert.match(index, /detailedTexture===1/);
  assert.match(index, /stadium\?\.playerModelsReady===true/);
  assert.match(index, /kits.completed===kits.total/);
  assert.match(index, /KIT TEXTURES/);
});

test("loading screen keeps the 15-second presentation minimum without inventing progress", () => {
  assert.match(index, /MINIMUM_DURATION=15000/);
  assert.match(index, /allReady&&elapsed>=MINIMUM_DURATION\?100:Math\.min\(99,Math\.floor\(weighted\)\)/);
  assert.match(index, /requestAnimationFrame\(tick\)/);
});

test("loading screen provides a user-activated fullscreen control and useful matchday tips", () => {
  assert.match(index, /id="p11-loading-fullscreen"/);
  assert.match(index, /fullscreen\.addEventListener\('click'/);
  assert.match(index, /requestFullscreen/);
  assert.match(index, /MATCHDAY NOTE/);
  assert.match(index, /p11-stadium-ambience/);
  assert.match(index, /RETRY LOADING/);
});
