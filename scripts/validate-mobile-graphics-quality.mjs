import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const runtime = fs.readFileSync('stadium-runtime.js', 'utf8');

assert.match(html, /const maxRenderScale=Math\.min\(window\.devicePixelRatio\|\|1,2\.0\)/, 'mobile and desktop render scale cap should be 2.0, limited by devicePixelRatio');
assert.match(html, /graphicsMobile\?1\.75:1\.25/, 'mobile should start at 1.75 while desktop retains its 1.25 baseline');
assert.match(html, /function setRenderScale\(next\)[\s\S]*?clamp\(next,1,maxRenderScale\)/, 'adaptive scaling must retain a 1.0 minimum');
assert.match(html, /frameMs>22[\s\S]*?setRenderScale\(renderScale-0\.1\)/, 'sustained slow frames must reduce resolution');
assert.match(html, /frameMs<18[\s\S]*?setRenderScale\(Math\.min\(maxRenderScale,renderScale\+0\.05\)\)/, 'sustained headroom must restore resolution gradually');
assert.match(runtime, /const targetRatio=Math\.min\(uiCanvas\.width\/rect\.width,devicePixelRatio\|\|1,2\.0\)/, '3D renderer must inherit the adaptive 2D canvas ratio while retaining the 2.0x and devicePixelRatio caps');
assert.match(runtime, /renderer\.setPixelRatio\(targetRatio\)/, '3D renderer must synchronize to the adaptive canvas ratio');
assert.match(runtime, /syncRendererSize\(\)/, '3D renderer must apply the synchronized dimensions');
console.log('Adaptive mobile HD graphics and 2D/3D pixel-ratio synchronization checks passed.');
