import test from 'node:test';
import assert from 'node:assert/strict';
import { analysePitchyBrief } from './pitchy-v2.mjs';

test('understands the existing Hungarian diagonal-stripe brief', () => {
  const plan = analysePitchyBrief('Készíts fekete-arany, agresszív, vékony átlós csíkos mezt fekete gallérral', 'kit');
  assert.equal(plan.detected.language, 'hu');
  assert.equal(plan.baseColor, '#101318');
  assert.equal(plan.accentColor, '#c5a46d');
  assert.equal(plan.pattern, 'diagonal-stripes');
  assert.equal(plan.style, 'performance');
});

test('understands English colours, pattern and material', () => {
  const plan = analysePitchyBrief('Create a premium navy and gold jersey with a matte finish and vertical stripes', 'kit');
  assert.equal(plan.detected.language, 'en');
  assert.equal(plan.pattern, 'vertical-stripes');
  assert.equal(plan.material, 'matte');
});

test('respects an explicit request for no stripes', () => {
  const plan = analysePitchyBrief('Create a matte black jersey without stripes', 'kit');
  assert.equal(plan.pattern, 'solid');
});

test('flags conflicting pattern instructions instead of hiding the conflict', () => {
  const plan = analysePitchyBrief('Black jersey with vertical stripes and a checkerboard pattern', 'kit');
  assert.ok(plan.conflicts.some(item => item.field === 'pattern'));
  assert.equal(plan.needsClarification, true);
});

test('flags conflicting material finishes', () => {
  const plan = analysePitchyBrief('Glossy and matte red football', 'ball');
  assert.ok(plan.conflicts.some(item => item.field === 'material'));
});

test('does not overstate confidence for a vague brief', () => {
  const plan = analysePitchyBrief('Make it nice', 'kit');
  assert.ok(plan.confidence < 0.55);
  assert.equal(plan.needsClarification, true);
});

test('retains Hungarian ball and finish recognition', () => {
  const plan = analysePitchyBrief('Fényes piros-fehér labda', 'ball');
  assert.equal(plan.detected.language, 'hu');
  assert.equal(plan.material, 'glossy');
  assert.equal(plan.garment, 'jersey');
});

test('rejects an empty brief', () => {
  assert.throws(() => analysePitchyBrief(''));
});
