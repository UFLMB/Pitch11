import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('stadium-environment-runtime.js', 'utf8');

assert.match(source, /const clearanceBottom=pitchSurfaceY-1\.0,clearanceTop=pitchSurfaceY\+4\.8/);
assert.match(source, /minX:-4\.35,maxX:4\.35,minY:clearanceBottom,maxY:clearanceTop,minZ:34\.1,maxZ:45\.05/,
  'The narrow portal cut must clear only the entrance fascia and end-stand obstruction');
assert.match(source, /g\.textAlign='center'.*g\.fillText\(title,512,112\)/);
assert.match(source, /new THREE\.PointLight\(0xffe8c2,4\.8,11\.5,1\.35\)/);
assert.match(source, /mat\.emissiveIntensity=mat===floor\|\|mat===rubber\|\|mat===black\?\.42:\.34/);
assert.match(source, /renderer\.toneMappingExposure=1\.05/);
assert.match(source, /const boxGeometryCache=new Map\(\)/, 'Tunnel box geometry must be shared instead of allocated for every prop');
assert.match(source, /new THREE\.InstancedMesh\(boxGeometry\(w,h,d\),mat,placements\.length\)/, 'Repeated locker parts must use instancing');
assert.match(source, /tunnelLightIndex\+\+%\(mobile\?3:2\)/, 'Mobile tunnel point lights must be budgeted more sparsely');
assert.match(source, /const grainMap=new THREE\.CanvasTexture\(grainCanvas\)/, 'Tunnel surface grain must use one shared texture');
assert.match(source, /const boardTexture=new THREE\.CanvasTexture\(boardCanvas\)/, 'Changing rooms must share a single tactics-board texture');
assert.match(source, /new THREE\.Mesh\(boardGeometry,boardMaterial\)/, 'Changing rooms must reuse the tactics-board geometry and material');
assert.doesNotMatch(source, /applySurfaceGrain\(/, 'Per-material grain textures must not be reintroduced');

assert.match(source, /function rebuildWalkColliders\(stadiumRoot\)/);
assert.match(source, /function movePlayerWalk\(position,deltaX,deltaZ\)/);
assert.match(source, /const apronHalfDepth=5\.8,apronHalfWidth=3\.8,apronRise=\.17/, 'The ramp must overlap the pitch edge and corridor landing');
assert.match(source, /apron\.position\.set\(0,0,39\.8\)/);
assert.match(source, /officialsEnd=roomDoorZ\+\.5/, 'The officials corridor floor must overlap the dressing-room floor');
assert.match(source, /optionalAssets\.testGoal='loading'/);
assert.match(source, /\.\/assets\/football-goal-test\.glb/);
assert.match(source, /PITCH 11 imported football goal test/);
assert.match(source, /doesNotReplaceProceduralGoal:true/);
assert.match(source, /if\(side>0&&i===2\)continue/, 'Only the north-side ramp staff member is removed');
assert.match(source, /walkSurfaceMeshes=\[\]/, 'Ground surfaces must be tracked independently from obstruction colliders');
assert.match(source, /walkRaycaster\.intersectObjects\(nearbyBlockers,false\)/, 'Horizontal movement must query obstruction meshes only');
assert.match(source, /walkRaycaster\.intersectObjects\(nearbySurfaces,false\)/, 'Ground probing must query walkable surfaces only');
assert.match(source, /userData\.p11WalkableSurface===true/);
assert.match(source, /function registerWalkNavigationRoot\(root\)/);
assert.match(source, /rebuildWalkNavigation:\(\)=>rebuildWalkColliders\(\)/);
assert.match(source, /movePlayerWalk,project/);
const html = fs.readFileSync('environment-lab.html', 'utf8');
assert.match(html, /id="pov"/);
assert.match(html, /id="pov-stick"/);
assert.match(html, /function enterPov\(\)/);
assert.match(html, /pov\.yaw=Math\.PI/, 'Player POV must initially face the players entrance ramp');
assert.match(html, /function updatePov\(dt\)/);
assert.match(html, /pov\.keys\.add\(k\)/);
assert.match(html, /povStick\.addEventListener\('pointerdown'/);
assert.match(source, /emissiveIntensity=mat===floor\|\|mat===rubber\|\|mat===black\?\.42:\.34/);
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

assert.match(source, /currentGround\+1\.25/, 'Player walking must detect the raised approach ramp landing');
assert.match(source, /currentGround-1\.0/, 'Player walking must tolerate the ramp transition down');
assert.match(html, /id="ui-toggle"/);
assert.match(html, /function setUiHidden\(hidden\)/);
assert.match(html, /body\.ui-hidden #pov-stick/);
assert.match(html, /e\.key\.toLowerCase\(\)==='h'/);

assert.match(html, /id="fullscreen-entry"/);
assert.match(html, /requestFullscreen\(\{navigationUI:'hide'\}\)/);
assert.match(html, /screen\.orientation\?\.lock\?\.\('landscape'\)/);
assert.match(html, /fullscreenchange/);
assert.match(html, /#fullscreen-entry/);
