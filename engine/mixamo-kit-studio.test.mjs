import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const studio = readFileSync(new URL("../mixamo-kit-studio.html", import.meta.url), "utf8");
const viewer = readFileSync(new URL("../player-model-viewer.html", import.meta.url), "utf8");

test("Mixamo Kit Studio loads the active Ch38 FBX independently", () => {
  assert.ok(studio.includes("./input/player-model-candidate/character.fbx"));
  assert.ok(studio.includes("new FBXLoader()"));
  assert.ok(!studio.includes("GLTFLoader"));
  assert.ok(!studio.includes("assets/players/player.glb"));
});

test("garment targets use their own FBX mesh UV0 triangles", () => {
  for (const name of ["Ch38_Shirt", "Ch38_Shorts", "Ch38_Socks", "Ch38_Shoes"]) {
    assert.ok(studio.includes(name), "Missing garment mesh target: " + name);
  }
  assert.ok(studio.includes("mesh.geometry.getAttribute('uv')"));
  assert.ok(studio.includes("texture.flipY?uv.getY(id):1-uv.getY(id)"));
  assert.ok(studio.includes("ctx.fill()"));
});

test("garment material edits are isolated from shared source materials", () => {
  assert.ok(studio.includes("sourceMaterial.clone()"));
  assert.ok(studio.includes("const texture=map.clone()"));
  assert.ok(studio.includes("r.texture.image=r.canvas"));
  assert.ok(studio.includes("r.texture.needsUpdate=true"));
});

test("the model viewer exposes a separate Mixamo Kit Studio route", () => {
  assert.ok(viewer.includes('href="./mixamo-kit-studio.html"'));
});
