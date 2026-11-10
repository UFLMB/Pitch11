import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('./law-compliance.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const law = context.globalThis.PITCH11Law;

const base = {
  shooterTeam: 0, targetDirection: 1,
  left: 0, right: 100, top: 0, bottom: 60,
  centerY: 30, goalHalfWidth: 3.66, goalHeight: 2.44,
  radius: 0.11, elapsed: 2, maxSeconds: 8,
  ball: { x: 100.12, y: 30, z: 1, vx: 1, vy: 0, vz: 0, owner: null }
};

test('shootout goal requires the whole ball to cross inside the frame', () => {
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, x: 100.12 } }), 'goal');
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, x: 100.05 } }), 'live');
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, y: 3.60 } }), 'miss');
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, z: 2.40 } }), 'miss');
});

test('a goalkeeper catch ends the kick but a parry leaves it live', () => {
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, x: 95, owner: { team: 1 } } }), 'miss');
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, x: 95, vx: -1, owner: null, last: { team: 1 } } }), 'live');
});

test('a post rebound remains live until it stops or leaves the field', () => {
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, x: 95, vx: -2 } }), 'live');
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, x: 95, y: 60.2, vx: 0 } }), 'miss');
  assert.equal(law.shootoutDecision({ ...base, elapsed: 8, ball: { ...base.ball, x: 95 } }), 'miss');
  assert.equal(law.shootoutDecision({ ...base, elapsed: 8, restartActive: true, ball: { ...base.ball, x: 95, owner: { team: 0 } } }), 'live');
});

test('shootout teams are reduced to equal numbers without removing goalkeepers', () => {
  const players = [];
  for (let team = 0; team < 2; team++) {
    for (let role = 0; role < 11; role++) players.push({ team, role, num: role + 1, gk: role === 0, out: team === 1 && role === 10 });
  }
  const excluded = law.shootoutExclusions(players);
  assert.equal(excluded.length, 1);
  assert.equal(excluded[0].team, 0);
  assert.equal(excluded[0].gk, false);
  assert.equal(excluded[0].role, 10);
});

test('production ball dimensions remain unchanged', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /GOALH=36\.6,GOALD=22,GOALZ=24,BR=4,BVR=1\.1,BALL_SCALE=1/);
});
