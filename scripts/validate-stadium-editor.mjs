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
  'LIVE OBJECT PREVIEW', 'LIVE SYNC', 'id="previewStage"', 'function createLivePreviewClone(object)',
  'function syncLivePreviewNode(source,clone,isRoot=false)', 'function renderLivePreview()',
  'previewRenderer.render(previewScene,previewCamera)',
  "environment-lab.html?editorHost=1", 'P11Stadium', 'setEditorMode(true)',
  'live.renderer', 'live.scene', 'openConfigDb', 'data-filter="people"', 'function isPersonnelActor(object)', 'function hasPersonnelActorAncestor(object)',
  'Object removed from this stadium version', "cameraPreset('drone')", "cameraPreset('pov')"
]) {
  assert.ok(html.includes(feature), 'Missing Stadium Editor feature: ' + feature);
}
assert.ok(html.includes('renderer=live.renderer'), 'Standalone editor must reuse the isolated Matchday Environment renderer.');
assert.ok(html.includes("width:'100vw',height:'100vh'"), 'Hidden Environment Lab bridge must use the full viewport, not a 2x2 pixel viewport.');
assert.ok(html.includes("boot?.state==='error'"), 'Editor must surface Environment Lab startup errors immediately.');
assert.ok(html.includes('previewRenderer=new THREE.WebGLRenderer'), 'Live preview must use its own dedicated WebGL renderer so inspector panels cannot occlude it.');
assert.ok(html.includes('previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobile?1:1.5))'), 'Dedicated preview renderer must cap pixel ratio for mobile GPU safety.');
assert.ok(html.includes("$('previewStage').appendChild(previewRenderer.domElement)"), 'Dedicated preview canvas must be mounted inside the visible preview stage.');
assert.ok(html.includes('#previewStage canvas{position:absolute;inset:0;display:block;width:100%;height:100%;z-index:0'), 'Preview canvas must occupy the preview stage below its status overlays.');
assert.ok(html.includes('const previewScene=new THREE.Scene()'), 'Live preview scene is missing.');
assert.ok(html.includes('renderer=live.renderer'), 'Main editor viewport must continue using the isolated Matchday Environment renderer.');
assert.ok(html.includes('previewRenderer.render(previewScene,previewCamera)'), 'Live preview must render through its dedicated renderer, not the main viewport renderer.');
assert.ok(html.includes('renderLivePreview();'), 'Live preview must render continuously alongside the main viewport.');
assert.ok(html.includes('clone.material=source.material'), 'Live preview must reflect source material replacements as well as transforms.');
assert.ok(html.includes('clone.scale.copy(worldScale).multiplyScalar(previewFit)'), 'Live preview root scale must be derived from source world scale on every frame without cumulative multiplication.');
assert.ok(html.includes('o.userData.editorSelectable'), 'Editor object hierarchy must include named stadium assemblies.');
assert.ok(html.includes("return'people'"), 'Personnel actors must have a dedicated PEOPLE filter category.');
assert.ok(html.includes('(!isPersonnelActor(o)&&hasPersonnelActorAncestor(o))'), 'Personnel must be selected and transformed as complete actors, not individual body meshes.');
assert.ok(html.includes('if(hasPersonnelActorAncestor(target))'), 'Viewport clicks must select the whole personnel actor, not an individual body part.');
assert.ok(runtime.includes("guard.name='Stadium Security Guard '+(i+1)"), 'Production security actors are missing from the live environment.');
assert.ok(runtime.includes("actor.name='Touchline Staff '+(side>0?'North ':'South ')+(i+1)"), 'Touchline staff actors are missing from the live environment.');
assert.ok(runtime.includes('const z=side*38.1,x=-22+i*11;'), 'Touchline staff placement coordinates are missing.');
assert.ok(runtime.includes('createProductionSecurityPositions()'), 'Production security placement positions are missing.');
assert.ok(runtime.includes('editorSelectable=true'), 'Runtime stadium assemblies are missing editor selection metadata.');
assert.ok(runtime.includes('setEditorMode(active)'), 'Environment runtime does not expose the isolated editor bridge.');
assert.ok(runtime.includes('if(externalEditorActive)return'), 'Environment runtime does not pause its own renderer while the editor owns the scene.');
assert.ok(runtime.includes('editorLocked=true'), 'Playing surface lock metadata is missing.');
assert.ok(env.includes('id="stadium-editor"'), 'Environment Lab has no Stadium Editor entry.');
assert.ok(env.includes("location.href='./stadium-editor.html'"), 'Environment Lab must navigate to the separate Stadium Editor page.');
assert.ok(!env.includes('function openStadiumEditor()'), 'Environment Lab must not create an inline editor overlay.');
assert.ok(!env.includes("frame.src='./stadium-editor.html?embedded=1'"), 'Stadium Editor must not be embedded over the Matchday Viewer.');
assert.ok(html.includes("bridge.src='./environment-lab.html?editorHost=1'"), 'Standalone editor must create its isolated Environment Lab bridge.');
assert.ok(html.includes('const child=bridge.contentWindow'), 'Standalone editor must read the bridge from its own iframe, not its parent window.');
assert.ok(html.includes('host.appendChild(renderer.domElement)'), 'Standalone editor must mount the shared Environment Lab renderer in its own viewport.');
assert.ok(html.includes('live.setEditorMode(true)'), 'Standalone editor must explicitly acquire the isolated scene for editing.');
assert.ok(html.includes("$('backBtn').addEventListener('click',()=>location.href='./environment-lab.html')"), 'Editor BACK action must return to the Matchday Viewer.');
assert.ok(html.includes('#mobilePanels{display:none}') && html.includes('#mobilePanels{display:flex'), 'Mobile editor must expose compact object/property panel toggles.');
assert.ok(html.includes('id="duplicateBtn"') && html.includes('id="deleteBtn"'), 'Object actions must remain available in the responsive inspector.');
assert.ok(!html.includes('graphics3d.html'), 'Stadium Editor must not route into the production renderer.');
console.log('Standalone Stadium Editor module syntax and feature-safety checks passed.');
