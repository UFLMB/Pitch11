import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const editor = readFileSync(new URL('../ball-editor.html', import.meta.url), 'utf8');
const pitchy = readFileSync(new URL('../engine/pitchy-v2.mjs', import.meta.url), 'utf8');

assert.match(editor, /function drawFrontFacingText\(text,colour,font,maxWidth,yOffset=0\)/);
assert.match(editor, /g\.translate\(size\*\.25,size\*\.5\+yOffset\);g\.scale\(-1,1\)/);
assert.match(editor, /function addText\([^]*?drawFrontFacingText\(text,colour/);
assert.match(editor, /function addBadge\(\)\{[^]*?g\.translate\(x,y\);g\.rotate\(angle\);g\.scale\(-1,1\)/);
assert.match(editor, /if\(plan\.decalText\)\{drawFrontFacingText\(plan\.decalText/);
assert.match(pitchy, /decalText:textMatch\?\.\[1\]\|\|''/);
assert.doesNotMatch(editor, /g\.fillText\(plan\.decalText,size\/2,size\*\.5/);
assert.doesNotMatch(editor, /g\.fillText\(text,size\/2,size\*\.5/);

console.log('Ball branding orientation checks passed: front UV placement, horizontal correction, manual decal and Pitchy decal.');

assert.match(editor, /id="addBadge"[^>]*>Add PITCH 11 Logo/);
assert.match(editor, /id="logoScale"/);
assert.match(editor, /id="logoX"/);
assert.match(editor, /id="logoY"/);
assert.match(editor, /id="logoRotation"/);
assert.match(editor, /const lightSurface=luminance>=\.48,ink=lightSurface\?'#17212B':'#D8B66A'/);
assert.match(editor, /g\.strokeText\('PITCH 11'/);
assert.match(editor, /g\.fillText\('PITCH 11'/);
assert.match(editor, /g\.strokeText\('PITCH 11',0,0,size\*\.20\)/);
assert.match(editor, /g\.fillText\('PITCH 11',0,0,size\*\.20\)/);
assert.doesNotMatch(editor, /g\.(?:strokeText|fillText)\('PITCH 11',0,0,size\*\.(?:38|86)\)/);
assert.match(editor, /logoApplied=true/);
assert.match(editor, /OFFICIAL PITCH 11 LOGO EMBEDDED/);
console.log('PITCH 11 official logo embed checks passed: adaptive contrast, readable wordmark, front placement, scale, position and rotation controls.');


assert.match(editor, /type:'text',text,colour,fontSize:sizePx/);
assert.match(editor, /type:'image',src:reader\.result/);
assert.match(editor, /id="decalMode"/);
assert.match(editor, /id="decalScale"/);
assert.match(editor, /id="decalX"/);
assert.match(editor, /id="decalY"/);
assert.match(editor, /id="decalRotation"/);
assert.match(editor, /function decalAt\(uv\)/);
assert.match(editor, /draggingDecal=true/);
assert.match(editor, /id="deleteDecal"/);
assert.match(editor, /decals:cloneDecals\(\)/);
assert.match(editor, /decals=Array\.isArray\(p\.decals\)\?p\.decals:\[\]/);
console.log('Editable decal checks passed: text/image selection, drag, size, position, rotation, delete, undo and profile persistence.');
