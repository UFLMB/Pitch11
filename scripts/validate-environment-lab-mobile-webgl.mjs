import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync('stadium-environment-runtime.js', 'utf8');
const page = fs.readFileSync('environment-lab.html', 'utf8');

assert.match(runtime, /getContext\('webgl2'/);
assert.match(runtime, /powerPreference:'low-power'/);
assert.match(runtime, /antialias:false/);
assert.match(runtime, /failIfMajorPerformanceCaveat:false/);
assert.match(runtime, /if\(!renderer\)\s*\{/);
assert.match(runtime, /boot\.state='error'/);
assert.match(runtime, /Mobile WebGL startup failed:/);
assert.match(page, /runtimeImport\.catch\(error=>/);

// The Environment Lab now starts mobile rendering at 1.5x (capped at 1.75x
// and the device pixel ratio), then adapts quality to sustained frame time.
assert.match(page, /const maxRenderScale=Math\.min\(devicePixelRatio\|\|1,mobile\?1\.75:1\.25\)/);
assert.match(page, /let renderScale=Math\.min\(maxRenderScale,mobile\?1\.5:1\.25\)/);
assert.match(page, /function setRenderScale\(next\)/);
assert.match(page, /slowFrames/);
assert.match(page, /stableFrames/);
assert.match(page, /P11EnvironmentGraphicsQuality/);

console.log('Environment Lab mobile WebGL startup, adaptive HD rendering, and fallback checks passed.');
