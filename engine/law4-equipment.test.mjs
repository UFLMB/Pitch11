import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('./law-compliance.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const law = context.globalThis.PITCH11Law;

const complete = {
  shirtWithSleeves: true, shorts: true, socks: true,
  shinguards: true, shinguardsCovered: true, footwear: true,
  dangerousEquipment: false, uncoveredJewellery: false,
  playerElectronicEquipment: false
};

test('Law 4 permits complete and safe compulsory player equipment', () => {
  assert.deepEqual(law.playerEquipmentIssues(complete), []);
  assert.equal(law.equipmentInspectionDecision(complete), 'allow');
});

test('Law 4 requires missing compulsory equipment to be replaced before entry', () => {
  assert.deepEqual(law.playerEquipmentIssues({ ...complete, footwear: false }), ['footwear']);
  assert.equal(law.equipmentInspectionDecision({ ...complete, footwear: false }), 'replace-item');
  assert.deepEqual(law.playerEquipmentIssues({ ...complete, shinguardsCovered: false }), ['shinguards']);
  assert.equal(law.equipmentInspectionDecision({ ...complete, shinguardsCovered: false }), 'replace-item');
});

test('Law 4 rejects dangerous equipment, uncovered jewellery and player electronic equipment', () => {
  const unsafe = { ...complete, dangerousEquipment: true, uncoveredJewellery: true, playerElectronicEquipment: true };
  assert.deepEqual(law.playerEquipmentIssues(unsafe), [
    'dangerous-equipment', 'uncovered-jewellery', 'electronic-equipment'
  ]);
  assert.equal(law.equipmentInspectionDecision(unsafe), 'remove-item');
});
