import test from 'node:test';
import assert from 'node:assert/strict';
import { readGameplaySource } from "./gameplay-source.mjs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readGameplaySource(root);
function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name}() must exist`);
  const open = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (quote) { if (escaped) escaped = false; else if (c === '\\\\') escaped = true; else if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Unclosed function ${name}`);
}
const makeRegister = ball => new Function('ball', `return (${extractFunction('registerBallContact')});`)(ball);
test('shared contact registration sets player cooldown and an eight-fixed-tick pickup lock', () => {
  const ball = { contactPickupTicks: 0 }, player = { kcd: 0.05 };
  makeRegister(ball)(player);
  assert.equal(player.kcd, 0.3); assert.equal(ball.contactPickupTicks, 8);
  player.kcd = 0.6; makeRegister(ball)(player);
  assert.equal(player.kcd, 0.6); assert.equal(ball.contactPickupTicks, 8);
});
test('full fixed-update cycle blocks touches after body contact and releases after eight ticks', () => {
  const updateStart = source.indexOf('function update(){'), updateEnd = source.indexOf('let last=performance.now()', updateStart);
  const updateSource = source.slice(updateStart, updateEnd), touchesStart = source.indexOf('function touches(){');
  const touchesHead = source.slice(touchesStart, touchesStart + 260);
  assert.match(touchesHead, /b\.contactPickupTicks\|\|0\)>0\)return/);
  assert.match(updateSource, /ball\.contactPickupTicks>0\)ball\.contactPickupTicks=Math\.max\(0,ball\.contactPickupTicks-1\)/);
  assert.ok(updateSource.indexOf('ball.contactPickupTicks>0') < updateSource.indexOf('touches();'));
  const wrapperStart = source.indexOf('const _upC=update;'), wrapperEnd = source.indexOf('/* ===================== 21.', wrapperStart);
  assert.match(source.slice(wrapperStart, wrapperEnd), /_upC\(\)[\s\S]*if\(S\.mode==='play'\)bodyCollide\(\)/);
  const ball = { contactPickupTicks: 0 }, register = makeRegister(ball); register({ kcd: 0 });
  const blocked = [];
  for (let tick = 0; tick < 8; tick++) { if (ball.contactPickupTicks > 0) ball.contactPickupTicks = Math.max(0, ball.contactPickupTicks - 1); blocked.push(ball.contactPickupTicks > 0); }
  assert.deepEqual(blocked, [true,true,true,true,true,true,true,false]); assert.equal(ball.contactPickupTicks, 0);
});
test('all loose-ball contact producers use the shared contact lock', () => {
  for (const name of ['tryTackle', 'slideHit', 'bodyCollide', 'gkReact', 'gkStep', 'aiGK', 'touches'])
    assert.match(extractFunction(name), /registerBallContact\(/, `${name}() must register the shared lock`);
});
test('body collision cannot inject a vertical bounce into the ball', () => {
  const fn = extractFunction('bodyCollide');
  assert.doesNotMatch(fn, /b\.vz\s*=\s*Math\.min\(55/); assert.match(fn, /2D side\/body collision/);
});
