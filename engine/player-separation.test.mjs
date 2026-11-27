import test from 'node:test';
import assert from 'node:assert/strict';
import { readGameplaySource } from "./gameplay-source.mjs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readGameplaySource(root);
const start = html.indexOf('function separate(){');
const end = html.indexOf('\nfunction stepBall(){', start);
assert.ok(start >= 0 && end > start, 'separate() must remain present in the gameplay modules');
const separateSource = html.slice(start, end);
const makeSeparate = (players) => {
  const clampPos = (p) => {
    p.x = Math.max(42, Math.min(1110, p.x));
    p.y = Math.max(42, Math.min(778, p.y));
  };
  return new Function('P', 'clampPos', separateSource + '\nreturn separate;')(players, clampPos);
};
const player = (team, x, y, phys = 0.6) => ({
  team, x, y, px: x, py: y, dive: 0, out: false,
  substitutionExiting: false, st: { phys }
});

test('collision resolution reduces overlap for same-team and opposing players', () => {
  const players = Array.from({ length: 22 }, (_, i) => player(i < 11 ? 0 : 1, 100 + i * 24, 100));
  players[0].x = 500; players[0].y = 400;
  players[1].x = 506; players[1].y = 400;
  players[11].x = 700; players[11].y = 400;
  players[12].x = 706; players[12].y = 400;
  players[2].x = 900; players[2].y = 600;
  players[13].x = 906; players[13].y = 600;
  const before = [[0,1],[11,12],[2,13]].map(([a,b]) => Math.hypot(players[a].x-players[b].x, players[a].y-players[b].y));
  makeSeparate(players)();
  const after = [[0,1],[11,12],[2,13]].map(([a,b]) => Math.hypot(players[a].x-players[b].x, players[a].y-players[b].y));
  after.forEach((distance, i) => assert.ok(distance > before[i], `pair ${i} should move apart`));
});

test('no player can be displaced more than the per-tick correction budget', () => {
  const players = Array.from({ length: 22 }, (_, i) => player(i < 11 ? 0 : 1, 500 + (i % 2) * 0.01, 400 + Math.floor(i / 2) * 0.01));
  const before = players.map(p => [p.x, p.y]);
  makeSeparate(players)();
  for (let i = 0; i < players.length; i++) {
    const moved = Math.hypot(players[i].x - before[i][0], players[i].y - before[i][1]);
    assert.ok(moved <= 1.800001, `player ${i} moved ${moved} units in one tick`);
  }
});

test('players outside collision range receive no separation movement', () => {
  const players = Array.from({ length: 22 }, (_, i) => player(i < 11 ? 0 : 1, 80 + i * 35, 100 + (i % 3) * 30));
  const before = players.map(p => [p.x, p.y]);
  makeSeparate(players)();
  players.forEach((p, i) => {
    assert.equal(p.x, before[i][0]);
    assert.equal(p.y, before[i][1]);
  });
});

test('coincident players are separated deterministically without teleporting', () => {
  const run = () => {
    const players = Array.from({ length: 22 }, (_, i) => player(i < 11 ? 0 : 1, 100 + i * 30, 100));
    players[0].x = players[11].x = 500;
    players[0].y = players[11].y = 400;
    makeSeparate(players)();
    return players.slice(0, 12).map(p => [p.x, p.y]);
  };
  const first = run(), second = run();
  assert.deepEqual(first, second);
  for (const [x, y] of first) assert.ok(Number.isFinite(x) && Number.isFinite(y));
});
