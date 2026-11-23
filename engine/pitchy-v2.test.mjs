import test from 'node:test';
import assert from 'node:assert/strict';
import { analysePitchyBrief, PITCHY_ROLE_PRESETS } from './pitchy-v2.mjs';

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

test('offers three coherent creative directions without changing the requested design', () => {
  const plan = analysePitchyBrief('Premium black and gold jersey with diagonal stripes', 'kit');
  assert.equal(plan.creativeDirections.length, 3);
  assert.equal(plan.creativeDirections[0].pattern, plan.pattern);
  assert.equal(plan.creativeDirections[0].accent, plan.accentColor);
  assert.ok(plan.creativeDirections[1].description.length > 10);
  assert.ok(plan.creativeDirections[2].finish);
});

test('creative alternatives remain deterministic for the same brief', () => {
  const a = analysePitchyBrief('Futuristic navy and cyan ball with geometric panels', 'ball');
  const b = analysePitchyBrief('Futuristic navy and cyan ball with geometric panels', 'ball');
  assert.deepEqual(a.creativeDirections, b.creativeDirections);
});

test('keeps design history newest-first and bounded', async () => {
  const { prependPitchyHistory } = await import('./pitchy-v2.mjs');
  const items = [{ id: 2 }, { id: 1 }];
  assert.deepEqual(prependPitchyHistory(items, { id: 3 }, 2), [{ id: 3 }, { id: 2 }]);
});

test('handles an invalid history store without losing the new entry', async () => {
  const { prependPitchyHistory } = await import('./pitchy-v2.mjs');
  assert.deepEqual(prependPitchyHistory(null, { id: 'new' }), [{ id: 'new' }]);
});


test('marks whether a garment was explicitly named so whole-kit designs can target every Mixamo garment', () => {
  const whole = analysePitchyBrief('Create a black and gold kit with diagonal stripes', 'kit');
  const single = analysePitchyBrief('Create black and gold shorts with diagonal stripes', 'kit');
  assert.equal(whole.detected.garmentExplicit, false);
  assert.equal(single.detected.garmentExplicit, true);
  assert.equal(single.garment, 'shorts');
});


test('provides complete-kit role presets for all Ch38 character roles', () => {
  assert.deepEqual(Object.keys(PITCHY_ROLE_PRESETS), ['player', 'referee', 'assistant', 'coach', 'staff', 'supporter']);
  for (const [role, preset] of Object.entries(PITCHY_ROLE_PRESETS)) {
    assert.ok(preset.label.length > 0, role + ' has a visible label');
    const plan = analysePitchyBrief(preset.brief, 'kit');
    assert.equal(plan.detected.garmentExplicit, false, role + ' must target the complete four-garment kit');
    assert.ok(plan.baseColor.startsWith('#'), role + ' has a resolved base colour');
    assert.ok(plan.accentColor.startsWith('#'), role + ' has a resolved accent colour');
    assert.ok(plan.pattern, role + ' has a resolved pattern');
  }
});
