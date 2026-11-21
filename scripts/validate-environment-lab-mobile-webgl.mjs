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
assert.match(page, /mobile\?Math\.min\(devicePixelRatio\|\|1,\.8\)/);

console.log('Environment Lab mobile WebGL startup and fallback checks passed.');
