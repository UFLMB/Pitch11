import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const main = read("index.html");
const sw = read("sw.js");
const viewer = read("player-model-viewer.html");
const fbx = read("scripts/inspect-player-fbx-package.mjs");
const uv = read("scripts/generate-uv-mapping.py");
const simulation = read("engine/simulation.mjs");
const simulationTests = read("engine/simulation.test.mjs");

const updateStart = main.indexOf("function update(){");
const updateEnd = main.indexOf("\n}", updateStart);
assert.notEqual(updateStart, -1, "main update() exists");
assert.match(main.slice(updateStart, updateStart + 90), /^function update\(\)\{\s*if\(H>W\)return;/,
  "portrait mode must pause before snap(), match timers, or gameplay state advances");

const tickStart = main.indexOf("function tick8(){");
const tickEnd = main.indexOf("\n}", tickStart);
assert.notEqual(tickStart, -1, "tick8() exists");
assert.match(main.slice(tickStart, tickEnd), /^function tick8\(\)\{\s*if\(H>W\)return;/,
  "timed shot and first-touch actions must pause in portrait mode");

assert.match(main, /const _u8=update;update=function\(\)\{if\(H>W\)return;tick8\(\);_u8\(\);\};/,
  "the update wrapper must not run timed actions while portrait");
const finalGuard = main.indexOf("const _portraitPauseFinal=update;update=function(){if(H>W)return;_portraitPauseFinal();};");
const mainScriptClose = main.indexOf('</script>\n<script type="importmap">', finalGuard);
assert.ok(finalGuard >= 0 && mainScriptClose > finalGuard && mainScriptClose - finalGuard < 160,
  "the final update guard must wrap every layered update extension");
assert.match(main, /if\(H>W\)\{\s*UI\.r\.length=0;UI\.def=null;pauseBtn\.r=camBtn\.r=0;/,
  "portrait overlay must clear stale menu and gameplay hitboxes");
const captureGuard = main.indexOf("cv.addEventListener('pointerdown',e=>{if(H>W){e.preventDefault();e.stopImmediatePropagation();releaseAll();}},true);");
const primaryPointer = main.indexOf("cv.addEventListener('pointerdown',e=>{\n  e.preventDefault();");
assert.ok(captureGuard >= 0 && primaryPointer > captureGuard,
  "portrait input guard must run before all subsequent pointer handlers");

assert.match(sw, /const CACHE_NAME='pitch11-shell-v7'/, "service worker cache must be versioned");
assert.doesNotMatch(sw, /cache\.put\('\.\/index\.html'/,
  "navigation responses must not overwrite the app-shell cache entry");
assert.match(sw, /cache\.put\(request,response\.clone\(\)\)/,
  "navigation responses must be cached by their own request URL");
assert.match(sw, /event\.waitUntil\(networkResponse\.then/,
  "cache writes must extend the fetch event lifetime");
assert.match(sw, /caches\.match\(request\)\.then\(cached=>cached\|\|caches\.match\('\.\/index\.html'\)\)/,
  "offline navigation must prefer the requested route, then fall back to the app shell");

assert.equal(viewer.includes("\\n#hint"), false,
  "viewer CSS must not contain a literal escaped newline before #hint");
assert.match(viewer, /}\n#hint\{/,
  "viewer #hint selector must begin on a real CSS line");

assert.match(fbx, /reportText \+ "\\n"/,
  "FBX audit JSON must end with a real newline escape");
assert.doesNotMatch(fbx, /reportText \+ "\\\\n"/,
  "FBX audit JSON must not append a literal backslash-n");

assert.doesNotMatch(uv, /\\\\n/,
  "UV README export must use real newline escapes rather than literal backslash-n");

assert.match(simulation, /this\.players\.find\(p => p\.team === team && !p\.out && p\.role === "GK"\)/,
  "goalkeeper saves must resolve the active goalkeeper, not a fixed player array slot");
assert.match(simulationTests, /goalkeeper saves use the active keeper after a substitution \(team \$\{team\}\)/,
  "substituted goalkeeper regression tests must cover both teams");

console.log("PITCH 11 audit regression checks passed.");
