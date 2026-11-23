import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const studio = readFileSync(new URL("../mixamo-kit-studio.html", import.meta.url), "utf8");
const viewer = readFileSync(new URL("../player-model-viewer.html", import.meta.url), "utf8");

test("Mixamo Kit Studio loads the active Ch38 FBX independently", () => {
  assert.ok(studio.includes("./input/player-model-candidate/character.fbx"));
  assert.ok(studio.includes("new FBXLoader(textureManager)"));
  assert.ok(studio.includes("await textureLoadsFinished"));
  assert.ok(studio.includes("textureManager.onLoad=resolveTextureLoads"));
  assert.ok(!studio.includes("GLTFLoader"));
  assert.ok(!studio.includes("assets/players/player.glb"));
});

test("garment targets use their own FBX mesh UV0 triangles", () => {
  for (const name of ["Ch38_Shirt", "Ch38_Shorts", "Ch38_Socks", "Ch38_Shoes"]) {
    assert.ok(studio.includes(name), "Missing garment mesh target: " + name);
  }
  assert.ok(studio.includes("mesh.geometry.getAttribute('uv')"));
  assert.ok(studio.includes("(1-uv.getY(id))*h"));
  assert.ok(studio.includes("ctx.fill()"));
});

test("garment material edits are isolated from shared source materials", () => {
  assert.ok(studio.includes("sourceMaterial.clone()"));
  assert.ok(studio.includes("const texture=map.clone()"));
  assert.ok(studio.includes("materials.find(material=>material?.map)"));
  assert.ok(studio.includes("m===sourceMaterial?material:m.clone()"));
  assert.ok(studio.includes("r.texture.image=r.canvas"));
  assert.ok(studio.includes("r.texture.needsUpdate=true"));
});

test("the model viewer exposes a separate Mixamo Kit Studio route", () => {
  assert.ok(viewer.includes('href="./mixamo-kit-studio.html"'));
});


test("Mixamo Kit Studio provides explicit camera zoom and a collapsible control panel", () => {
  assert.ok(studio.includes('id="zoomIn"'));
  assert.ok(studio.includes('id="zoomOut"'));
  assert.ok(studio.includes("controls.dollyIn(1.25)"));
  assert.ok(studio.includes("controls.dollyOut(1.25)"));
  assert.ok(studio.includes('id="togglePanel"'));
  assert.ok(studio.includes("classList.toggle('collapsed')"));
  assert.ok(studio.includes("aria-expanded"));
});


test("Mixamo Kit Studio frames the camera in world space without mutating the FBX root transform", () => {
  assert.ok(studio.includes("const box=new THREE.Box3().setFromObject(object)"));
  assert.ok(studio.includes("const center=box.getCenter(new THREE.Vector3())"));
  assert.ok(studio.includes("const sphere=box.getBoundingSphere(new THREE.Sphere())"));
  assert.ok(studio.includes("modelCenter.copy(center)"));
  assert.ok(studio.includes("controls.target.copy(modelCenter)"));
  assert.ok(studio.includes("camera.position.copy(modelCenter).add(new THREE.Vector3(...offset))"));
  assert.ok(studio.includes("distance=radius*3.1"));
  assert.ok(!studio.includes("object.position.sub(center)"));
  assert.ok(!studio.includes("object.position.y+=size.y/2"));
  assert.ok(studio.includes("object.updateMatrixWorld(true)"));
});
