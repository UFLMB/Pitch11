import assert from "node:assert/strict";
import fs from "node:fs";

const serviceWorker = fs.readFileSync("sw.js", "utf8");
const audio = fs.readFileSync("engine/audio-assets.mjs", "utf8");
const index = fs.readFileSync("index.html", "utf8");

assert.match(serviceWorker, /pitch11-shell-v7/);
assert.match(serviceWorker, /Network-first for every same-origin GET/);
assert.match(serviceWorker, /fetch\(request\)\.then\(response/);
assert.match(serviceWorker, /caches\.match\(request\)/);
assert.match(serviceWorker, /caches\.delete\(key\)/);

assert.match(audio, /function retryPreloadAssets\(/);
assert.match(audio, /if \(audioPreloadState === "error"\) audioPreloadPromise = null/);
assert.match(audio, /retryPreloadAssets,/);

assert.match(index, /#p11-version\{[^}]*left:50%;transform:translateX\(-50%\)/);
assert.match(index, /audio\.retryPreloadAssets/);
assert.match(index, /audioState==='error'\s*&&window\.P11AudioAssets/);

console.log("Runtime hardening checks passed: cache refresh, version badge, audio retry.");
