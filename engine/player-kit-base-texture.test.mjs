import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editor = readFileSync(new URL("../player-texture-editor.html", import.meta.url), "utf8");
const mapping = readFileSync(new URL("../docs/PLAYER-UV-ANATOMICAL-MAPPING.md", import.meta.url), "utf8");

test("Kit Studio preserves the original model texture until the user edits a garment", () => {
  assert.ok(editor.includes("colours:{}"));
  assert.ok(editor.includes("else{status.textContent='ORIGINAL MODEL TEXTURE PRESERVED'}"));
  assert.ok(!editor.includes("colours:{jersey:'#f2f4f6',shorts:'#e6eaee',socks:'#eef1f4',boots:'#2a313a'}"));
  assert.ok(editor.includes("function exportTexture()"));
  assert.ok(editor.includes("pitch11-player-kit-basecolor.png"));
});

test("placement descriptors update each mesh without relying on an outer root variable", () => {
  assert.ok(editor.includes("function buildPlacementDescriptors(islands){"));
  assert.ok(editor.includes("island.mesh.updateWorldMatrix(true,false)"));
  assert.ok(editor.includes("buildPlacementDescriptors(bodyIslands);"));
  assert.ok(!editor.includes("function buildPlacementDescriptors(root,"));
});

test("base texture editing uses the four user-approved UV garment masks", () => {
  for (const phrase of [
    "Jersey | 1, 8, 9, 16, 17",
    "Shorts | 6, 7, 14, 15",
    "Socks | 4, 5",
    "Boots | 12, 13, 18–27"
  ]) assert.ok(mapping.includes(phrase), "Missing accepted UV mask: " + phrase);
  assert.ok(editor.includes("buildGarmentMask(bodyIslands,[0,7,8,15,16]"));
  assert.ok(editor.includes("buildGarmentMask(bodyIslands,[5,6,13,14]"));
  assert.ok(editor.includes("buildGarmentMask(bodyIslands,[3,4]"));
  assert.ok(editor.includes("buildGarmentMask(bodyIslands,[11,12,17,18,19,20,21,22,23,24,25,26]"));
});
