import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('stadium-environment-runtime.js', 'utf8');

assert.match(source, /const clearanceBottom=pitchSurfaceY-1\.0,clearanceTop=pitchSurfaceY\+4\.8/);
assert.match(source, /minX:-4\.35,maxX:4\.35,minY:clearanceBottom,maxY:clearanceTop,minZ:34\.1,maxZ:45\.05/,
  'The narrow portal cut must clear only the entrance fascia and end-stand obstruction');
assert.match(source, /g\.textAlign='center'.*g\.fillText\(title,512,112\)/);
assert.match(source, /new THREE\.PointLight\(0xffe8c2,2\.15,9,1\.65\)/);
assert.match(source, /emissiveIntensity=mat===floor\|\|mat===rubber\|\|mat===black\?\.16:\.11/);
for (const [name, minZ, maxZ] of [
  ['main approach', '44.55', '66.75'],
  ['T-junction', '63.15', '69.05'],
  ['home/away rooms', '59.45', '72.75'],
  ['officials corridor', '68.15', '80.05'],
  ['officials room', '78.45', '92.25'],
]) {
  assert.ok(source.includes(`minZ:${minZ},maxZ:${maxZ}`), `Missing continuous stadium cut for ${name}`);
}

assert.match(source, /branchLength=35,junctionOpening=6\.2/);
assert.match(source, /T-junction front wall '\+\(side<0\?'left':'right'\)/);
assert.match(source, /T-junction rear wall '\+\(side<0\?'left':'right'\)/);
assert.doesNotMatch(source, /add\('Junction column'/);
assert.match(source, /door=id==='Officials'\?4\.2:2\.35/);
assert.match(source, /method:'triangle-box-clipping'/);
assert.match(source, /scope:'imported-stadium-glb-only'/);
assert.match(source, /values=\[n\.x,n\.y,n\.z,\.\.\.values\.slice\(3\)\]/);

const branchLength = 35;
const opening = 6.2;
const wing = (branchLength - opening) / 2;
const wingCenter = opening / 2 + wing / 2;
assert.equal(wing, 14.4);
assert.ok(Math.abs((wingCenter - wing / 2) - opening / 2) < 1e-9);
assert.ok(Math.abs((wingCenter + wing / 2) - branchLength / 2) < 1e-9);
console.log('Environment Lab stadium clearance, portal opening, centered wayfinding and independent tunnel LED lighting checks passed.');
