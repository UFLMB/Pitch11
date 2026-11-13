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
  assert.equal(JSON.stringify(law.playerEquipmentIssues(complete)), JSON.stringify([]));
  assert.equal(law.equipmentInspectionDecision(complete), 'allow');
});

test('Law 4 requires missing compulsory equipment to be replaced before entry', () => {
  assert.equal(JSON.stringify(law.playerEquipmentIssues({ ...complete, footwear: false })), JSON.stringify(['footwear']));
  assert.equal(law.equipmentInspectionDecision({ ...complete, footwear: false }), 'replace-item');
  assert.equal(JSON.stringify(law.playerEquipmentIssues({ ...complete, shinguardsCovered: false })), JSON.stringify(['shinguards']));
  assert.equal(law.equipmentInspectionDecision({ ...complete, shinguardsCovered: false }), 'replace-item');
});

test('Law 4 rejects dangerous equipment, uncovered jewellery and player electronic equipment', () => {
  const unsafe = { ...complete, dangerousEquipment: true, uncoveredJewellery: true, playerElectronicEquipment: true };
  assert.equal(JSON.stringify(law.playerEquipmentIssues(unsafe)), JSON.stringify([
    'dangerous-equipment', 'uncovered-jewellery', 'electronic-equipment'
  ]));
  assert.equal(law.equipmentInspectionDecision(unsafe), 'remove-item');
});
