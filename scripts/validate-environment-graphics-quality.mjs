import assert from 'node:assert/strict';
import fs from 'node:fs';

const lab=fs.readFileSync(new URL('../environment-lab.html',import.meta.url),'utf8');
const editor=fs.readFileSync(new URL('../stadium-editor.html',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../stadium-environment-runtime.js',import.meta.url),'utf8');

assert.match(lab,/mobile\?1\.75:1\.25/,'Environment Lab mobile cap must be 1.75 and DPR-limited');
assert.match(lab,/mobile\?1\.5:1\.25/,'Environment Lab mobile baseline must be 1.5');
assert.match(lab,/frameMs>22/,'Environment Lab must downscale under sustained slow frames');
assert.match(lab,/stableFrames>=360/,'Environment Lab must recover gradually after stable frames');
assert.match(lab,/canvas\.width\/rect\.width/,'overlay backing-store ratio must remain available to the 3D renderer');
assert.match(runtime,/const targetRatio=uiCanvas\.width\/rect\.width/,'stadium renderer must follow overlay backing-store ratio');
assert.doesNotMatch(editor,/renderer\.setPixelRatio\(Math\.min\(devicePixelRatio\|\|1,mobile\?0\.85:1\.25\)\)/,'Stadium Editor must not override the live renderer pixel ratio');
assert.match(editor,/renderer\.setSize\(innerWidth,innerHeight,false\)/,'Stadium Editor must retain viewport sizing');
console.log('Adaptive HD Environment Lab and Stadium Editor validation passed.');
