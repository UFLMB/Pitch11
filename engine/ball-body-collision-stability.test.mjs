import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = source.indexOf('function bodyCollide(){');
const end = source.indexOf('\nconst _sbH=stepBall;', start);
assert.ok(start >= 0 && end > start, 'bodyCollide() must remain present');
const bodySource = source.slice(start, end);

const makeBodyCollide = ({ ball, players, state, height = 400, width = 900 }) => {
  const fn = new Function(
    'ball', 'P', 'S', 'H', 'W', 'BR', 'PITCH11Law',
    'applyOffsideTouch', 'callOffside', 'rnd', 'AU', 'registerBallContact',
    bodySource + '\nreturn bodyCollide;'
  );
  return fn(
    ball, players, state, height, width, 4,
    { isRestartKickerSecondContact: () => false },
    () => {}, () => {}, () => 0, undefined,
    p => { if (p) p.kcd = Math.max(p.kcd || 0, 0.3); ball.contactPickupTicks = Math.max(ball.contactPickupTicks || 0, 8); }
  );
};

const player = (x, vx) => ({
  x, y: 0, vx, vy: 0, kcd: 0, down: false, out: false,
  substitutionExiting: false, off: false, team: 0
});
const looseBall = (overrides = {}) => ({
  x: 0, y: 0, vx: 0, vy: 0, z: 0, vz: 0, spin: 0,
  owner: null, last: null, receiver: null, dbl: null,
  ...overrides
});

test('only the deepest approaching player resolves a multi-player contact in one tick', () => {
  const first = player(1, -100);
  const second = player(-3, 100);
  const ball = looseBall();
  const collide = makeBodyCollide({ ball, players: [first, second], state: { t: 1, so: null, prac: true } });

  collide();

  assert.equal(ball.last, first);
  assert.equal(ball.bodyContactPlayer, first);
  assert.equal(ball.bodyContactUntil, 1.12);
  assert.equal(first.kcd, 0.3);
  assert.equal(ball.contactPickupTicks, 8);
  assert.ok(Number.isFinite(ball.vx) && Number.isFinite(ball.vy));
});

test('a descending ball keeps its vertical velocity during a body collision', () => {
  const tackler = player(1, -400);
  const ball = looseBall({ z: 2, vz: -15 });
  const collide = makeBodyCollide({ ball, players: [tackler], state: { t: 2, so: null, prac: true } });

  collide();

  assert.equal(ball.vz, -15, 'horizontal contact must not turn a falling ball upward');
});

test('the same player cannot repeatedly re-trigger body contact during the short separation window', () => {
  const tackler = player(1, -100);
  const ball = looseBall({ bodyContactPlayer: tackler, bodyContactUntil: 10, contactPickupTicks: 8 });
  const state = { t: 9, so: null, prac: true };
  const collide = makeBodyCollide({ ball, players: [tackler], state });

  collide();
  assert.equal(ball.last, null);

  ball.contactPickupTicks = 0;
  state.t = 11;
  collide();
  assert.equal(ball.last, tackler);
});

test('different nearby players cannot alternate body contacts inside the same global contact window', () => {
  const first = player(1, -100);
  const second = player(0, 100);
  const ball = looseBall();
  const state = { t: 1, so: null, prac: true };
  const collide = makeBodyCollide({ ball, players: [first, second], state });

  collide();
  assert.equal(ball.last, first);

  first.out = true;
  ball.x = 0.2;
  ball.y = 0;
  ball.vx = 0;
  state.t = 1.04;
  collide();
  assert.equal(ball.last, first, 'a different player must not immediately reverse the previous contact');

  for (let tick = 0; tick < 8; tick++) ball.contactPickupTicks = Math.max(0, ball.contactPickupTicks - 1);
  state.t = 1.13;
  collide();
  assert.equal(ball.last, second, 'normal contacts resume after the global separation window');
});
