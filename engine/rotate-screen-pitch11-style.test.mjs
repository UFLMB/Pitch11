import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('portrait orientation displays the PITCH 11 landscape prompt', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const start = html.indexOf('if(H>W){\n    UI.r.length=0;UI.def=null;pauseBtn.r=camBtn.r=0;');
  assert.notEqual(start, -1, 'portrait HUD branch exists');
  const end = html.indexOf("if(S.mode==='menu')", start);
  const rotateScreen = html.slice(start, end);
  assert.match(rotateScreen, /PITCH 11/);
  assert.match(rotateScreen, /IRON MAST/);
  assert.doesNotMatch(rotateScreen, /MATCHDAY EXPERIENCE/);
  assert.match(rotateScreen, /phoneX-phoneW\*\.58/);
  assert.match(rotateScreen, /phoneX\+phoneW\*\.58/);
  assert.match(rotateScreen, /Two compact opposing rotation arrows sit beside the handset/);
  assert.match(rotateScreen, /ROTATE YOUR SCREEN/);
  assert.match(rotateScreen, /PITCH 11 IS DESIGNED FOR LANDSCAPE/);
  assert.match(rotateScreen, /#a3e635/);
  assert.match(rotateScreen, /createLinearGradient/);
  assert.match(rotateScreen, /roundRect/);
  assert.doesNotMatch(rotateScreen, /Rotate your phone to landscape/);
  assert.match(rotateScreen, /return;/);
});
