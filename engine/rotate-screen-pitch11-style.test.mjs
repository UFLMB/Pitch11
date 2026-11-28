import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('portrait orientation uses the supplied minimalist rotate-phone reference', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const hud = html.indexOf('function drawHud(){');
  assert.notEqual(hud, -1, 'HUD renderer exists');
  const start = html.indexOf('if(H>W){', hud);
  assert.notEqual(start, -1, 'portrait HUD branch exists');
  const end = html.indexOf("if(S.mode==='menu')", start);
  const rotateScreen = html.slice(start, end);

  assert.match(rotateScreen, /#000/, 'solid black background');
  assert.match(rotateScreen, /roundRect\(px,py,phoneW,phoneH,r\)/, 'landscape phone outline');
  assert.match(rotateScreen, /ROTATE/);
  assert.match(rotateScreen, /YOUR/);
  assert.match(rotateScreen, /PHONE/);
  assert.match(rotateScreen, /bezierCurveTo/, 'curved rotation arrows');
  assert.match(rotateScreen, /PITCH 11/);
  assert.doesNotMatch(rotateScreen, /miniature football pitch|football pitch|Path2D|arrowSize|createLinearGradient|createRadialGradient|THE GAME AWAITS/);
  assert.match(rotateScreen, /return;/);
});
