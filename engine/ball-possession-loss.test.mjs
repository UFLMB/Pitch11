import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('a loose ball after a standing tackle briefly ignores the tackler body', () => {
  const start = source.indexOf('function tryTackle(');
  const end = source.indexOf('\nfunction humanAct(', start);
  assert.ok(start >= 0 && end > start, 'tryTackle() must remain present');
  const tackle = source.slice(start, end);
  assert.match(tackle, /p\.kcd=Math\.max\(p\.kcd\|\|0,0\.3\);b\.owner=null;b\.last=p;/);
  const bodyStart = source.indexOf('function bodyCollide()');
  const bodyEnd = source.indexOf('\nconst _sbH=stepBall;', bodyStart);
  assert.ok(bodyStart >= 0 && bodyEnd > bodyStart, 'bodyCollide() must remain present');
  assert.match(source.slice(bodyStart, bodyEnd), /p===b\.last&&p\.kcd>0\.1/);
});

test('a loose ball after a slide tackle briefly ignores the tackler body', () => {
  const start = source.indexOf('function slideHit(');
  const end = source.indexOf('\nconst _int9=integrate;', start);
  assert.ok(start >= 0 && end > start, 'slideHit() must remain present');
  assert.match(source.slice(start, end), /p\.kcd=Math\.max\(p\.kcd\|\|0,0\.3\);const previousLast=b\.last;b\.owner=null;b\.last=p;/);
});
