import assert from 'node:assert/strict';
import fs from 'node:fs';

const game = fs.readFileSync('index.html', 'utf8');
const stadium = fs.readFileSync('stadium-runtime.js', 'utf8');

assert.match(game, /graphicsMobile\?1\.75:1\.5/, 'Mobile render scale may rise to 1.75x when the device DPR allows it');
assert.match(game, /graphicsMobile\?1\.5:1\.25/, 'Mobile starts at 1.5x while desktop retains its 1.25x starting scale');
assert.match(game, /function setRenderScale\(next\)/);
assert.match(game, /window\.dispatchEvent\(new CustomEvent\('p11graphicsqualitychange'/, 'Every adaptive scale change must notify the 3D renderer');
assert.match(game, /frameMs>22[\s\S]*setRenderScale\(renderScale-0\.1\)/, 'Sustained slow frames must reduce resolution');
assert.match(game, /frameMs<18[\s\S]*setRenderScale\(Math\.min\(maxRenderScale,renderScale\+0\.05\)\)/, 'Sustained headroom must restore resolution gradually');
assert.match(game, /addEventListener\('resize',resize\)/);
assert.match(game, /new ResizeObserver\(resize\)/);

assert.match(stadium, /function syncRendererSize\(\)/);
assert.match(stadium, /const targetRatio=uiCanvas\.width\/rect\.width/);
assert.match(stadium, /addEventListener\('p11graphicsqualitychange',resizeStadium\)/, '3D stadium must immediately follow adaptive 2D canvas resolution changes');
assert.match(stadium, /renderer\.setPixelRatio\(targetRatio\)/, 'Three.js must use the shared physical-pixel ratio');

console.log('Adaptive mobile HD graphics synchronization checks passed.');
