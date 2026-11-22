import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const runtime = readFileSync(new URL('../stadium-runtime.js', import.meta.url), 'utf8');

test('imported football goal remains a separate visual test object', () => {
  assert.match(runtime, /testGoal:'pending'/);
  assert.match(runtime, /\.\/assets\/football-goal-test\.glb/);
  assert.match(runtime, /PITCH 11 imported football goal test/);
  assert.match(runtime, /doesNotReplaceProceduralGoal:true/);
  assert.match(runtime, /testGoal\.position\.set\(55\.5,\.019,0\)/);
});

test('existing procedural goal geometry remains the active match goal', () => {
  assert.match(runtime, /function setGoalDimensions\(/);
  assert.match(runtime, /setGoalDimensions\(\);addFlags\(\)/);
  assert.match(runtime, /goalNetMesh=new THREE\.LineSegments\(geometry,material\)/);
});
