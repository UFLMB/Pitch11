import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name}() must exist`);
  const open = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Unclosed function ${name}`);
}
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const targetFn = new Function('clamp', 'Math', `return (${extractFunction('dribbleBallTarget')});`)(clamp, Math);
const player = (overrides = {}) => ({
  x: 100, y: 100, vx: 60, vy: 0, face: 0, anim: 0, turn: 0,
  st: { drib: 0.8 }, stam: 1, sp: false, winded: false, ...overrides
});

test('constant carrier motion converges to a stable forward ball offset without stride oscillation', () => {
  const p = player(), target = targetFn(p), ball = { x: p.x, y: p.y };
  const offsets = [];
  for (let i = 0; i < 180; i++) {
    const next = targetFn(p), alpha = 1 - Math.exp(-next.rate / 60);
    ball.x += (next.x - ball.x) * alpha;
    ball.y += (next.y - ball.y) * alpha;
    offsets.push(ball.x - p.x, ball.y - p.y);
  }
  const finalX = offsets[offsets.length - 2], finalY = offsets[offsets.length - 1];
  assert.ok(Math.abs(finalX - target.x + p.x) < 0.01);
  assert.ok(Math.abs(finalY - target.y + p.y) < 0.01);
  const tail = offsets.slice(-40);
  assert.ok(Math.max(...tail.filter((_, i) => i % 2 === 0)) - Math.min(...tail.filter((_, i) => i % 2 === 0)) < 0.01);
  assert.ok(Math.max(...tail.filter((_, i) => i % 2 === 1)) - Math.min(...tail.filter((_, i) => i % 2 === 1)) < 0.01);
  assert.doesNotMatch(extractFunction('stepBall'), /Math\.sin\(o\.anim\)/);
});

test('turning changes the target smoothly and the spring follows without a snap', () => {
  const p = player(), initial = targetFn(p);
  p.face = Math.PI / 2;
  const turned = targetFn(p);
  assert.ok(Math.abs(turned.x - p.x) < 0.01);
  assert.ok(turned.y > initial.y);
  const ball = { x: initial.x, y: initial.y }, alpha = 1 - Math.exp(-turned.rate / 60);
  const first = { ...ball };
  ball.x += (turned.x - ball.x) * alpha;
  ball.y += (turned.y - ball.y) * alpha;
  assert.ok(Math.hypot(ball.x - first.x, ball.y - first.y) < 3);
});

test('pace, dribbling control, stamina and sprint influence lead without periodic animation terms', () => {
  const normal = targetFn(player());
  const sprint = targetFn(player({ sp: true }));
  const tired = targetFn(player({ stam: 0.2 }));
  const lowControl = targetFn(player({ st: { drib: 0.2 } }));
  assert.ok(sprint.x > normal.x);
  assert.ok(tired.x > normal.x);
  assert.ok(lowControl.x > normal.x);
  assert.doesNotMatch(extractFunction('dribbleBallTarget'), /carrier\.anim|o\.anim|Math\.sin\(o\.anim\)/);
});

test('the gameplay 3.0 layer no longer applies a second dribble-position correction', () => {
  assert.match(source, /Dribble target and follow are calculated only in stepBall\(\)/);
  assert.doesNotMatch(source, /const correction=clamp\(\(1-control\)\*0\.8\+turn\*0\.35/);
});
