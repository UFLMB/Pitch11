import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const html = fs.readFileSync('stadium-editor.html', 'utf8');
const env = fs.readFileSync('environment-lab.html', 'utf8');
const moduleMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(moduleMatch, 'Stadium Editor module script is missing.');
fs.writeFileSync('/tmp/pitch11-stadium-editor.mjs', moduleMatch[1]);
const syntax = spawnSync(process.execPath, ['--check', '/tmp/pitch11-stadium-editor.mjs'], { encoding: 'utf8' });
if (syntax.status !== 0) {
  process.stderr.write(syntax.stderr || syntax.stdout);
  process.exit(syntax.status || 1);
}

for (const feature of [
  'TransformControls', 'OrbitControls', 'GLTFLoader', 'MeshoptDecoder',
  'STADIUM EDITOR', 'EDIT MODE', 'VIEW MODE', 'data-tool="translate"',
  'data-tool="rotate"', 'data-tool="scale"', 'materialColor', 'emissiveIntensity',
  'applyText', 'imageUpload', 'duplicateSelected', 'deleteSelected',
  'function undo()', 'function redo()', 'localStorage', 'PITCH11_STADIUM_CONFIG',
  'football-stadium.glb', 'NON-EDITABLE PLAYING FIELD', 'openConfigDb', 'Object removed from this stadium version', "cameraPreset('drone')", "cameraPreset('pov')"
]) {
  assert.ok(html.includes(feature), 'Missing Stadium Editor feature: ' + feature);
}
assert.ok(env.includes('id="stadium-editor"'), 'Environment Lab has no Stadium Editor entry.');
assert.ok(env.includes("location.href='./stadium-editor.html'"), 'Environment Lab entry does not open Stadium Editor.');
assert.ok(!html.includes('graphics3d.html'), 'Stadium Editor must not route into the production renderer.');
console.log('Stadium Editor module syntax and feature-safety checks passed.');
