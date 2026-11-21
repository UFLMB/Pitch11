import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('a loose ball after a standing tackle uses the shared contact lock', () => {
  const start = source.indexOf('function tryTackle(');
  const end = source.indexOf('\nfunction humanAct(', start);
  assert.ok(start >= 0 && end > start, 'tryTackle() must remain present');
  const tackle = source.slice(start, end);
  assert.match(tackle, /b\.owner=null;registerBallContact\(p\);b\.last=p;/);
  const bodyStart = source.indexOf('function bodyCollide()');
  const bodyEnd = source.indexOf('\nconst _sbH=stepBall;', bodyStart);
  assert.ok(bodyStart >= 0 && bodyEnd > bodyStart, 'bodyCollide() must remain present');
  const body = source.slice(bodyStart, bodyEnd);
  assert.match(body, /registerBallContact\(p\)/);
  assert.match(body, /b\.contactPickupTicks\|\|0\)>0/);
});

test('a loose ball after a slide tackle uses the shared contact lock', () => {
  const start = source.indexOf('function slideHit(');
  const end = source.indexOf('\nconst _int9=integrate;', start);
  assert.ok(start >= 0 && end > start, 'slideHit() must remain present');
  const slide = source.slice(start, end);
  assert.match(slide, /b\.owner=null;registerBallContact\(p\);b\.last=p;/);
  assert.match(slide, /registerBallContact\(p\);b\.last=p;b\.receiver=null/);
});
