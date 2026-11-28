import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('rotate-screen typography is refined while the handset remains unchanged', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const hud = html.indexOf('function drawHud(){');
  assert.notEqual(hud, -1, 'HUD renderer exists');
  const start = html.indexOf('if(H>W){', hud);
  assert.notEqual(start, -1, 'portrait HUD branch exists');
  const end = html.indexOf("if(S.mode==='menu')", start);
  const rotateScreen = html.slice(start, end);

  assert.match(rotateScreen, /ROTATE YOUR SCREEN/);
  assert.match(rotateScreen, /Turn your phone sideways to continue/);
  assert.match(rotateScreen, /THE PITCH AWAITS/);
  assert.match(rotateScreen, /MATCHDAY  \/  PITCH 11/);
  assert.match(rotateScreen, /roundRect\(px,py,phoneW,phoneH,r\)/, 'original landscape phone outline');
  assert.match(rotateScreen, /phoneW=Math\.min\(W\*\.66,H\*\.30,310\)/, 'original phone sizing is preserved');
  assert.match(rotateScreen, /arc\(px\+phoneW\*\.94,cy,phoneH\*\.075/, 'original phone detail is preserved');
  assert.match(rotateScreen, /bezierCurveTo/, 'original curved lime rotation arrows remain');
  assert.ok(rotateScreen.indexOf("ctx.fillText('ROTATE YOUR SCREEN'") < rotateScreen.indexOf('const phoneW='),
    'instruction is outside the handset');
  assert.ok(rotateScreen.indexOf("ctx.fillText('THE PITCH AWAITS'") > rotateScreen.indexOf('const phoneW='),
    'closing tagline is outside and below the handset');
  assert.doesNotMatch(rotateScreen, /ctx\.fillText\('ROTATE'|ctx\.fillText\('YOUR'|ctx\.fillText\('PHONE'/,
    'no instruction text is drawn inside the handset');
  assert.doesNotMatch(rotateScreen, /titanium bezel|screenFill|pitch graphic inside the handset/);
  assert.match(rotateScreen, /return;/);
});
