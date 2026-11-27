import test from 'node:test';
import assert from 'node:assert/strict';
import { readGameplaySource } from "./gameplay-source.mjs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = readGameplaySource(root);

test('Law 4 initializes compulsory equipment for starters and substitutes', () => {
  assert.match(script, /function standardPlayerEquipment\(\)/);
  assert.match(script, /equipment:standardPlayerEquipment\(\),captain:false/);
  assert.match(script, /BENCH\[t\]=lu\.slice\(11\).*equipment:standardPlayerEquipment\(\)/);
  assert.match(script, /function inspectMatchEquipment\(\)/);
  assert.match(script, /if\(!inspectMatchEquipment\(\)\)return;setupKickoff\(0\)/);
});

test('Law 4 checks substitute equipment before the player enters', () => {
  assert.match(script, /PITCH11Law\.equipmentInspectionDecision\(incomingEquipment\)/);
  assert.match(script, /if\(equipmentDecision!=='allow'\)\{msg\('EQUIPMENT CHECK'/);
  assert.match(script, /p\.equipment=\{\.\.\.incomingEquipment,inspected:true\}/);
});

test('Law 4 assigns a captain and transfers captaincy when the captain is substituted', () => {
  assert.match(script, /function assignCaptain\(team,exclude\)/);
  assert.match(script, /if\(pool\[0\]\)pool\[0\]\.captain=true;/);
  assert.match(script, /if\(wasCaptain\)assignCaptain\(t,p\)/);
  assert.match(script, /p\.captain=false/);
});

test('Law 6 includes two assistant referees and a fourth official with substitution and added-time boards', () => {
  assert.match(script, /ar:\[mkAR\(1\),mkAR\(0\)\]/);
  assert.match(script, /const FO=\{[\s\S]*?fourth:true/);
  assert.match(script, /FO\.board=oldNum\+' > '\+bn\.num/);
  assert.match(script, /FO\.board='\+'\+announced/);
  assert.match(script, /drawFig2\(figO\(FO,a\)\)/);
  assert.match(script, /drawFig3\(figO\(FO,a\)\)/);
  assert.match(script, /if\(o\.fourth&&FO\.boardT>0\)\{pj\(o\.x,o\.y,25\)/);
});
