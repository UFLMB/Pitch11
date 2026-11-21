import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const html = fs.readFileSync('stadium-editor.html', 'utf8');
const env = fs.readFileSync('environment-lab.html', 'utf8');
const runtime = fs.readFileSync('stadium-environment-runtime.js', 'utf8');
const moduleMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(moduleMatch, 'Stadium Editor module script is missing.');
fs.writeFileSync('/tmp/pitch11-stadium-editor.mjs', moduleMatch[1]);
const syntax = spawnSync(process.execPath, ['--check', '/tmp/pitch11-stadium-editor.mjs'], { encoding: 'utf8' });
if (syntax.status !== 0) {
  process.stderr.write(syntax.stderr || syntax.stdout);
  process.exit(syntax.status || 1);
}

for (const feature of [
  'TransformControls', 'OrbitControls',
  'STADIUM EDITOR', 'EDIT MODE', 'VIEW MODE', 'data-tool="translate"',
  'data-tool="rotate"', 'data-tool="scale"', 'materialColor', 'emissiveIntensity',
  'applyText', 'imageUpload', 'duplicateSelected', 'deleteSelected',
  'function undo()', 'function redo()', 'localStorage', 'PITCH11_STADIUM_CONFIG',
  'environment-lab.html?editorHost=1', 'P11Stadium', 'setEditorMode(true)', 'live.renderer', 'live.scene', 'openConfigDb', 'Object removed from this stadium version', "cameraPreset('drone')", "cameraPreset('pov')"
]) {
  assert.ok(html.includes(feature), 'Missing Stadium Editor feature: ' + feature);
}
assert.ok(html.includes('renderer=live.renderer'), 'Editor must reuse the live Matchday WebGL renderer.');
assert.ok(html.includes("width:'100vw',height:'100vh'"), 'Hidden Environment Lab bridge must use the full viewport, not a 2x2 pixel viewport.');
assert.ok(html.includes("boot?.state==='error'"), 'Editor must surface Environment Lab startup errors immediately.');
assert.ok(!html.includes('new THREE.WebGLRenderer'), 'Editor must not allocate a second WebGL context.');
assert.ok(html.includes('o.userData.editorSelectable'), 'Editor object hierarchy must include named stadium assemblies.');
assert.ok(runtime.includes('editorSelectable=true'), 'Runtime stadium assemblies are missing editor selection metadata.');
assert.ok(runtime.includes('setEditorMode(active)'), 'Environment runtime does not expose the isolated editor bridge.');
assert.ok(runtime.includes('if(externalEditorActive)return'), 'Environment runtime does not pause its own renderer while the editor owns the scene.');
assert.ok(runtime.includes('editorLocked=true'), 'Playing surface lock metadata is missing.');
assert.ok(env.includes('id="stadium-editor"'), 'Environment Lab has no Stadium Editor entry.');
assert.ok(env.includes('function openStadiumEditor()'), 'Environment Lab must open the editor as an inline overlay.');
assert.ok(env.includes("frame.src='./stadium-editor.html?embedded=1'"), 'Editor must be embedded over the Matchday Viewer.');
assert.ok(html.includes("location.replace('./environment-lab.html?editor=1')"), 'Direct editor URL must return to the Matchday Viewer and open edit mode there.');
assert.ok(html.includes("#duplicateBtn::before{content:'⧉'"), 'Mobile editing actions must use compact icon controls.');
assert.ok(env.includes("type:'P11_STADIUM_EDITOR_CLOSE'"), 'Editor must return to the viewer without navigating to a separate section.');
assert.ok(html.includes('const embeddedMode='), 'Editor must detect embedded mode.');
assert.ok(html.includes('live=window.parent.P11Stadium'), 'Embedded editor must reuse the existing Matchday Viewer runtime.');
assert.ok(html.includes("if(!embeddedMode)host.appendChild(renderer.domElement)"), 'Embedded editor must keep the live viewer canvas in place.');
assert.ok(html.includes('function closeEditor()'), 'Editor must provide a safe return-to-viewer action.');
assert.ok(html.includes('window.parent.P11StadiumBoot'), 'Embedded editor must wait for the parent viewer to finish booting.');
assert.ok(env.includes('event.source!==editorFrame?.contentWindow'), 'Viewer must validate the editor close message source.');
assert.ok(html.includes("document.querySelectorAll('.sectionTitle')"), 'Inspector sections must be collapsible.');
assert.ok(html.includes('id="fileMenu"'), 'File actions must be grouped in a compact dropdown.');
assert.ok(html.includes('id="objectsToggle" title="Object list"'), 'Mobile panels must use compact icon controls.');
assert.ok(!html.includes('graphics3d.html'), 'Stadium Editor must not route into the production renderer.');
console.log('Stadium Editor module syntax and feature-safety checks passed.');
