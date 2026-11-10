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


test('offside line uses the live second-last opponent and the ball position', () => {
  const players = [
    { team: 1, x: 950, out: false },
    { team: 1, x: 900, out: false },
    { team: 1, x: 700, out: false },
    { team: 0, x: 990, out: false }
  ];
  assert.equal(law.offsideLine(players, 0, 1, 800, 1110), 900);
  assert.equal(law.offsideLine(players, 0, 1, 930, 1110), 930);
  assert.equal(law.offsideLine(players.slice(0, 1), 0, 1, 700, 1110), 1110);
});

test('substitution limits follow the five-plus-three-window model and optional extra-time allowance', () => {
  assert.deepEqual({ ...law.substitutionLimits(2, true) }, { substitutions: 5, windows: 3 });
  assert.deepEqual({ ...law.substitutionLimits(3, true) }, { substitutions: 6, windows: 4 });
  assert.deepEqual({ ...law.substitutionLimits(4, true) }, { substitutions: 6, windows: 4 });
  assert.deepEqual({ ...law.substitutionLimits(5, true) }, { substitutions: 5, windows: 3 });
  assert.deepEqual({ ...law.substitutionLimits(4, false) }, { substitutions: 5, windows: 3 });
});

test('goalkeeper eight-second limit triggers at eight seconds, not before', () => {
  assert.equal(law.goalkeeperHoldExpired(7.99), false);
  assert.equal(law.goalkeeperHoldExpired(8), true);
  assert.equal(law.goalkeeperHoldExpired(9), true);
});

test('a match cannot continue with fewer than seven active players', () => {
  const players = [];
  for (let team = 0; team < 2; team++) {
    for (let role = 0; role < 11; role++) {
      players.push({ team, out: team === 1 ? role >= 6 : role >= 7 });
    }
  }
  assert.equal(law.abandoningTeam(players), 1);
  assert.equal(law.abandoningTeam(players.map(p => ({ ...p, out: p.team === 0 ? p.out : p.role >= 5 }))), 0);
  assert.equal(law.abandoningTeam(players.map(p => ({ ...p, out: false }))), null);
});
