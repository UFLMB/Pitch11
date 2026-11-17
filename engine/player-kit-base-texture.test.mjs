import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const texture = readFileSync(new URL("../assets/players/player-basecolor-neutral.svg", import.meta.url), "utf8");
const editor = readFileSync(new URL("../player-texture-editor.html", import.meta.url), "utf8");
const mapping = readFileSync(new URL("../docs/PLAYER-UV-ANATOMICAL-MAPPING.md", import.meta.url), "utf8");

test("neutral base texture is model-specific and embedded for offline Kit Studio use", () => {
  assert.match(texture, /<svg[^>]+width="1024"[^>]+height="1024"/);
  assert.match(texture, /data:image\/webp;base64,/);
  assert.match(texture, /Male Athlete 02/);
  assert.ok(editor.includes("./assets/players/player-basecolor-neutral.svg"));
});

test("neutral base texture reuses the four user-approved UV garment masks", () => {
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
