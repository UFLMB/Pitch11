import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const editor = readFileSync(new URL('../ball-editor.html', import.meta.url), 'utf8');
const pitchy = readFileSync(new URL('../engine/pitchy-v2.mjs', import.meta.url), 'utf8');

assert.match(editor, /function drawFrontFacingText\(text,colour,font,maxWidth,yOffset=0\)/);
assert.match(editor, /g\.translate\(size\*\.25,size\*\.5\+yOffset\);g\.scale\(-1,1\)/);
assert.match(editor, /function addText\([^]*?drawFrontFacingText\(text,colour/);
assert.match(editor, /function addBadge\(\)\{[^]*?g\.translate\(size\*\.25,size\*\.5\);g\.scale\(-1,1\)/);
assert.match(editor, /if\(plan\.decalText\)\{drawFrontFacingText\(plan\.decalText/);
assert.match(pitchy, /decalText:textMatch\?\.\[1\]\|\|''/);
assert.doesNotMatch(editor, /g\.fillText\(plan\.decalText,size\/2,size\*\.5/);
assert.doesNotMatch(editor, /g\.fillText\(text,size\/2,size\*\.5/);

console.log('Ball branding orientation checks passed: front UV placement, horizontal correction, manual decal and Pitchy decal.');
