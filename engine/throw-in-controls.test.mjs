import test from "node:test";
import assert from "node:assert/strict";
import { readGameplaySource } from "./gameplay-source.mjs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readGameplaySource(root);

test("throw-in action buttons execute the dedicated overhead restart", () => {
  const law15 = html.slice(html.indexOf("/* Law 15: every attacking action button"), html.indexOf("/* IFAB Law 14: goalkeeper line"));
  assert.match(law15, /actionPressed=!!\(I\.shoot\|\|I\.shootUp\|\|I\.pass\|\|I\.thru\|\|I\.lob\|\|I\.skill\)/);
  assert.match(law15, /if\(SPA\.rs!==rs\)\{SPA\.rs=rs;spInit\(rs\);\}/);
  assert.match(law15, /SPA\.on=true;\s*restKick\(p\);/);
  assert.match(law15, /I\.shoot=I\.shootUp=I\.pass=I\.thru=I\.lob=I\.skill=false;/);
});

test("throw-in action buttons cannot fall through to normal foot-kick actions", () => {
  const law15 = html.slice(html.indexOf("/* Law 15: every attacking action button"), html.indexOf("/* IFAB Law 14: goalkeeper line"));
  assert.match(law15, /if\(actionPressed\)[\s\S]*?restKick\(p\);[\s\S]*?return;/);
  assert.match(law15, /I\.chargeT=0;/);
});
