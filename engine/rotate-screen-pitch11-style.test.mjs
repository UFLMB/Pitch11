import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('portrait orientation displays the PITCH 11 landscape prompt', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const hud = html.indexOf('function drawHud(){');
  assert.notEqual(hud, -1, 'HUD renderer exists');
  const start = html.indexOf('if(H>W){', hud);
  assert.notEqual(start, -1, 'portrait HUD branch exists');
  const end = html.indexOf("if(S.mode==='menu')", start);
  const rotateScreen = html.slice(start, end);
  assert.match(rotateScreen, /PITCH 11/);
  assert.match(rotateScreen, /THE GAME AWAITS/);
  assert.doesNotMatch(rotateScreen, /MATCHDAY EXPERIENCE/);
  assert.ok(rotateScreen.includes('ctx.rotate(-Math.PI/2)'), 'handset is rotated to landscape');
  assert.match(rotateScreen, /Hand-authored SVG rotation-arrow paths, drawn directly into the canvas/);
  assert.ok(rotateScreen.includes("new Path2D('M20 7v6h-6"), 'custom SVG path is drawn');
  assert.ok(rotateScreen.includes('ctx.scale(-arrowSize/24,arrowSize/24)'), 'opposing arrow is mirrored');
  assert.match(rotateScreen, /ROTATE YOUR SCREEN/);
  assert.match(rotateScreen, /PITCH 11 IS DESIGNED FOR LANDSCAPE/);
  assert.match(rotateScreen, /#a3e635/);
  assert.match(rotateScreen, /createLinearGradient/);
  assert.match(rotateScreen, /roundRect/);
  assert.doesNotMatch(rotateScreen, /Rotate your phone to landscape/);
  assert.match(rotateScreen, /return;/);
});
