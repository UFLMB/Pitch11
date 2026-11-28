import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('portrait orientation uses the premium PITCH 11 rotate-screen layout', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const hud = html.indexOf('function drawHud(){');
  assert.notEqual(hud, -1, 'HUD renderer exists');
  const start = html.indexOf('if(H>W){', hud);
  assert.notEqual(start, -1, 'portrait HUD branch exists');
  const end = html.indexOf("if(S.mode==='menu')", start);
  const rotateScreen = html.slice(start, end);

  assert.match(rotateScreen, /#080d10/, 'premium dark background');
  assert.match(rotateScreen, /A BETTER VIEW OF THE GAME/);
  assert.match(rotateScreen, /ROTATE YOUR SCREEN/);
  assert.match(rotateScreen, /Turn your phone sideways to continue/);
  assert.match(rotateScreen, /roundRect\(px,py,phoneW,phoneH,r\)/, 'landscape phone outline');
  assert.match(rotateScreen, /pitch graphic inside the handset/, 'screen contains a subtle pitch motif');
  assert.match(rotateScreen, /bezierCurveTo/, 'curved rotation arrows');
  assert.match(rotateScreen, /ctx\.strokeStyle='#a3e635'/, 'PITCH 11 lime arrow accent');
  assert.match(rotateScreen, /PITCH 11/);
  assert.ok(rotateScreen.indexOf("ctx.fillText('ROTATE YOUR SCREEN'") < rotateScreen.indexOf('const phoneW='),
    'instruction is drawn before and outside the phone');
  assert.doesNotMatch(rotateScreen, /ctx\.fillText\('ROTATE'|ctx\.fillText\('YOUR'|ctx\.fillText\('PHONE'/,
    'no instruction text is drawn inside the handset');
  assert.doesNotMatch(rotateScreen, /miniature football pitch|Path2D|arrowSize|THE GAME AWAITS/);
  assert.match(rotateScreen, /return;/);
});
