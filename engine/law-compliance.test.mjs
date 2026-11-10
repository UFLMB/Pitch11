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


test('shootout order includes every eligible player, including the goalkeeper, exactly once', () => {
  const players = [];
  for (let team = 0; team < 2; team++) {
    for (let role = 0; role < 11; role++) players.push({ team, role, num: role + 1, gk: role === 0, out: false });
  }
  players[7].out = true;
  const order = law.shootoutOrder(players, 0);
  assert.equal(order.length, 10);
  assert.equal(order.some(p => p.gk), true);
  assert.equal(new Set(order).size, 10);
  assert.equal(order.some(p => p.out), false);
  assert.equal(law.shootoutOrder(players, 1).length, 11);
});


test('Law 3 requires at least seven eligible players; dismissed players do not count', () => {
  const players = Array.from({ length: 11 }, (_, role) => ({ team: 0, role, out: false, inj: role === 6 }));
  assert.equal(law.hasMinimumPlayers(players, 0), true);
  for (const p of players.slice(0, 5)) p.out = true;
  assert.equal(law.hasMinimumPlayers(players, 0), false);
  assert.equal(law.hasMinimumPlayers(players, 1), false);
  assert.equal(law.hasMinimumPlayers(players, 0, 6), true);
});


test('substitution eligibility enforces five players and three stoppage opportunities', () => {
  const check = state => ({ ...law.substitutionEligibility(state) });
  assert.deepEqual(check({ used: 0, windows: 0, inStoppage: false, halftime: false, windowUsed: false }),
    { allowed: false, consumesWindow: false, reason: 'stoppage' });
  assert.deepEqual(check({ used: 0, windows: 0, inStoppage: true, halftime: false, windowUsed: false }),
    { allowed: true, consumesWindow: true, reason: 'new-window' });
  assert.deepEqual(check({ used: 2, windows: 1, inStoppage: true, halftime: false, windowUsed: true }),
    { allowed: true, consumesWindow: false, reason: 'same-window' });
  assert.deepEqual(check({ used: 2, windows: 3, inStoppage: true, halftime: false, windowUsed: false }),
    { allowed: false, consumesWindow: false, reason: 'windows' });
  assert.deepEqual(check({ used: 4, windows: 3, inStoppage: false, halftime: true, windowUsed: false }),
    { allowed: true, consumesWindow: false, reason: 'halftime' });
  assert.deepEqual(check({ used: 5, windows: 0, inStoppage: true, halftime: true, windowUsed: false }),
    { allowed: false, consumesWindow: false, reason: 'limit' });
});


test('goalkeeper hand control expires at eight seconds, not before', () => {
  assert.equal(law.goalkeeperHoldExpired(0), false);
  assert.equal(law.goalkeeperHoldExpired(7.999), false);
  assert.equal(law.goalkeeperHoldExpired(8), true);
  assert.equal(law.goalkeeperHoldExpired(8.5), true);
  assert.equal(law.goalkeeperHoldExpired(NaN), false);
});


test('dropped balls in either penalty area go to the defending goalkeeper', () => {
  const decide = law.droppedBallRecipient;
  assert.deepEqual({ ...decide({ x: 10, y: 50, left: 0, right: 100, centerY: 50, penaltyDepth: 20, penaltyHalfWidth: 20, directions: [1, -1], lastTouchedTeam: 1 }) }, { team: 0, goalkeeper: true });
  assert.deepEqual({ ...decide({ x: 90, y: 50, left: 0, right: 100, centerY: 50, penaltyDepth: 20, penaltyHalfWidth: 20, directions: [1, -1], lastTouchedTeam: 0 }) }, { team: 1, goalkeeper: true });
  assert.deepEqual({ ...decide({ x: 10, y: 50, left: 0, right: 100, centerY: 50, penaltyDepth: 20, penaltyHalfWidth: 20, directions: [-1, 1], lastTouchedTeam: 0 }) }, { team: 1, goalkeeper: true });
  assert.deepEqual({ ...decide({ x: 50, y: 50, left: 0, right: 100, centerY: 50, penaltyDepth: 20, penaltyHalfWidth: 20, directions: [1, -1], lastTouchedTeam: 1 }) }, { team: 1, goalkeeper: false });
});


test('goal-kick opponents are moved outside the penalty area, while players outside stay put', () => {
  const place = state => ({ ...law.goalKickOpponentPosition(state) });
  assert.deepEqual(place({ x: 80, y: 0, goalLine: 0, direction: 1, penaltyDepth: 165, halfWidth: 100, centerY: 0, clearance: 12 }), { x: 177, y: 0 });
  assert.deepEqual(place({ x: 120, y: 80, goalLine: 0, direction: 1, penaltyDepth: 165, halfWidth: 100, centerY: 0, clearance: 12 }), { x: 177, y: 80 });
  assert.deepEqual(place({ x: 190, y: 0, goalLine: 0, direction: 1, penaltyDepth: 165, halfWidth: 100, centerY: 0, clearance: 12 }), { x: 190, y: 0 });
  assert.deepEqual(place({ x: 920, y: 0, goalLine: 1000, direction: -1, penaltyDepth: 165, halfWidth: 100, centerY: 0, clearance: 12 }), { x: 823, y: 0 });
});

test('goalkeeper hand control outside the penalty area is a direct free kick; inside follows the eight-second clock', () => {
  assert.equal(law.goalkeeperHandControlDecision(false, 0), 'direct-free-kick');
  assert.equal(law.goalkeeperHandControlDecision(false, 8), 'direct-free-kick');
  assert.equal(law.goalkeeperHandControlDecision(true, 7.999), 'continue');
  assert.equal(law.goalkeeperHandControlDecision(true, 8), 'corner');
});


test('goalkeeper illegal handling uses a direct free kick outside the area and an indirect free kick for a prohibited pass inside', () => {
  assert.equal(law.goalkeeperIllegalHandlingRestart(false, false), 'direct-free-kick');
  assert.equal(law.goalkeeperIllegalHandlingRestart(false, true), 'direct-free-kick');
  assert.equal(law.goalkeeperIllegalHandlingRestart(true, true), 'indirect-free-kick');
  assert.equal(law.goalkeeperIllegalHandlingRestart(true, false), null);
});


test('kick-off positioning keeps every player outside the centre circle and in their own half', () => {
  const place = state => ({ ...law.kickoffPlayerPosition(state) });
  const base = { centerX: 50, centerY: 50, radius: 9.15, pitchTop: 0, pitchBottom: 100, side: -1 };
  const left = place({ ...base, x: 50, y: 50, direction: 1 });
  assert.ok(left.x < base.centerX);
  assert.ok(Math.hypot(left.x - base.centerX, left.y - base.centerY) >= base.radius - 1e-9);
  const right = place({ ...base, x: 50, y: 50, direction: -1 });
  assert.ok(right.x > base.centerX);
  assert.ok(Math.hypot(right.x - base.centerX, right.y - base.centerY) >= base.radius - 1e-9);
  assert.deepEqual(place({ ...base, x: 20, y: 20, direction: 1 }), { x: 20, y: 20 });
  const far = place({ ...base, x: 70, y: 20, direction: 1 });
  assert.ok(far.x < base.centerX);
  assert.equal(far.y, 20);
});


test('free-kick attackers stay at least one metre from a three-player defensive wall', () => {
  const place = state => ({ ...law.freeKickWallClearancePosition(state) });
  const base = { wallX: 50, wallY: 50, tangentX: 0, tangentY: 1, halfLength: 15, clearance: 10, ballX: 0, ballY: 50 };
  const centre = place({ ...base, x: 50, y: 50 });
  assert.ok(Math.hypot(centre.x - 50, centre.y - 50) >= 10 - 1e-9);
  const endpoint = place({ ...base, x: 50, y: 64 });
  assert.ok(Math.hypot(endpoint.x - 50, endpoint.y - 65) >= 10 - 1e-9);
  assert.deepEqual(place({ ...base, x: 50, y: 80 }), { x: 50, y: 80 });
});
