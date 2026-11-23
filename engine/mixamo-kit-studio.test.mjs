import test from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";
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
  assert.ok(studio.includes("function cloneTextureWithIndependentSource(sourceTexture,image)"));
  assert.ok(studio.includes("const texture=sourceTexture.clone();texture.source=new THREE.Source(image)"));
  assert.ok(studio.includes("map?cloneTextureWithIndependentSource(map,originalCanvas):new THREE.CanvasTexture(originalCanvas)"));
  assert.ok(studio.includes("texture.source=new THREE.Source(image)"));
  assert.ok(studio.includes("sourceMaterials=Array.isArray(mesh.material)?mesh.material:[mesh.material]"));
  assert.ok(studio.includes("for(let materialIndex=0;materialIndex<sourceMaterials.length;materialIndex++)"));
  assert.ok(studio.includes("layers.push({materialIndex,material,texture,originalCanvas,originalAlpha,originalNormalMap:material.normalMap,originalBumpMap:material.bumpMap,originalDisplacementMap:material.displacementMap,originalSpecularMap:material.specularMap,mask,canvas:originalCanvas,width:w,height:h})"));
  assert.ok(studio.includes("buildMask(mesh,{image:originalCanvas},materialIndex,sourceMaterials.length)"));
  assert.ok(studio.includes("clonedMaterials.push(material)"));
  assert.ok(studio.includes("layer.texture.image=layer.canvas"));
  assert.ok(studio.includes("layer.texture.needsUpdate=true"));
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


test("Pitchy is mounted inside the Mixamo Kit Studio and uses the active Ch38 garment records", () => {
  assert.ok(studio.includes("import {mountPitchy} from './engine/pitchy-v2.mjs'"));
  assert.ok(studio.includes('id="pitchyMount"'));
  assert.ok(studio.includes("mountPitchy({type:'kit',host:$('pitchyMount'),onApply:applyPitchyDesign})"));
  assert.ok(studio.includes("function applyPitchyDesign(plan)"));
  assert.ok(studio.includes("Object.keys(targets)"));
  assert.ok(studio.includes("makePitchyPattern(layer,plan,key)"));
  assert.ok(studio.includes("r.layers=item.layers.map(({canvas,...layer})=>"));
  assert.ok(studio.includes("layer.material.roughness"));
});

test("Pitchy garment target has an explicit ALL full-kit mode and SET selected-garment mode", () => {
  assert.ok(studio.includes('data-target-mode="all"'));
  assert.ok(studio.includes('data-target-mode="set"'));
  assert.ok(studio.includes('let garmentTargetMode=\'all\''));
  assert.ok(studio.includes("garmentTargetMode==='all'?Object.keys(targets):[active]"));
  assert.ok(studio.includes("setGarmentTargetMode(b.dataset.targetMode)"));
  assert.ok(studio.includes("ALL mode applies the Pitchy design to all four garment meshes."));
  assert.ok(studio.includes("SET mode enables garment selection and applies the Pitchy design only to the selected garment."));
  assert.ok(studio.includes('id="garmentSelection" aria-disabled="true" inert'));
  assert.ok(studio.includes("selection.inert=disabled"));
  assert.ok(studio.includes("selection.setAttribute('aria-disabled',String(disabled))"));
  assert.ok(studio.includes('.garment-selection[aria-disabled="true"]{opacity:.38;pointer-events:none}'));
});

test("Mixamo Kit Studio supports CLEAN REPLACE and PRESERVE DETAIL texture treatments", () => {
  assert.ok(studio.includes('data-texture-treatment="clean"'));
  assert.ok(studio.includes('data-texture-treatment="preserve"'));
  assert.ok(studio.includes("let textureTreatment='clean'"));
  assert.ok(studio.includes("if(textureTreatment==='preserve')"));
  assert.ok(studio.includes("function applyLayerTreatment(layer)"));
  assert.ok(studio.includes("layer.material.normalMap=textureTreatment==='clean'?null:layer.originalNormalMap"));
  assert.ok(studio.includes("layer.material.bumpMap=textureTreatment==='clean'?null:layer.originalBumpMap"));
  assert.ok(studio.includes("layer.material.displacementMap=textureTreatment==='clean'?null:layer.originalDisplacementMap"));
  assert.ok(studio.includes("layer.material.specularMap=textureTreatment==='clean'?null:layer.originalSpecularMap"));
  assert.ok(studio.includes("originalNormalMap:material.normalMap"));
  assert.ok(studio.includes("layer.material.normalMap=layer.originalNormalMap"));
  assert.ok(studio.includes("o.globalCompositeOperation='soft-light'"));
  assert.ok(studio.includes("o.drawImage(layer.originalAlpha,0,0)"));
  assert.ok(studio.includes("plan.pattern"));
});
test("ALL mode prepares and validates four independent garment textures before committing", () => {
  assert.ok(studio.includes("const missing=keys.filter(key=>!records.has(key))"));
  assert.ok(studio.includes("const prepared=keys.map(key=>"));
  assert.ok(studio.includes("prepared.length!==4"));
  assert.ok(studio.includes("All four independent garment meshes must have editable texture layers."));
  assert.ok(studio.includes("GARMENTS UPDATED"));
  assert.ok(studio.includes("layer.texture.image=layer.canvas"));
  assert.ok(studio.includes("new Set(prepared.map(item=>item.record.mesh)).size!==4"));
  assert.ok(studio.includes("Full-kit design cancelled."));
  assert.ok(studio.includes("GARMENTS UPDATED"));
  assert.ok(studio.includes("layer.texture.needsUpdate=true"));
});

test("every textured material slot gets an independent UV-group mask and Pitchy texture", () => {
  assert.ok(studio.includes("mesh.geometry.groups||[]"));
  assert.ok(studio.includes("groups.filter(group=>group.materialIndex===materialIndex)"));
  assert.ok(studio.includes("new THREE.CanvasTexture(originalCanvas)"));
  assert.ok(studio.includes("layer.texture.image=layer.canvas"));
  assert.ok(studio.includes("for(const layer of r.layers)"));
  assert.ok(studio.includes("material slot(s)"));
});


test("Mixamo Kit Studio supports reusable team templates and bulk squad texture generation", () => {
  assert.ok(studio.includes("team-kit-template.mjs"));
  assert.ok(studio.includes('id="teamTemplateName"'));
  assert.ok(studio.includes('id="squadCsv"'));
  assert.ok(studio.includes('id="saveTeamTemplate"'));
  assert.ok(studio.includes('id="generateSquadPack"'));
  assert.ok(studio.includes("parseTeamRosterCsv(await file.text())"));
  assert.ok(studio.includes("item.kind==='player-name'"));
  assert.ok(studio.includes("item.kind==='number'"));
  assert.ok(studio.includes("renderGraphics(key)"));
  assert.ok(studio.includes("createStoredZip(entries)"));
  assert.ok(studio.includes("canvas.toBlob(resolve,'image/png')"));
  assert.ok(studio.includes("openTeamKitDatabase"));
  assert.ok(studio.includes("baseTextures[key]=record.layers.map(layer=>layer.canvas.toDataURL('image/png'))"));
  assert.ok(studio.includes("restoreTemplateBaseTextures(template)"));
});


test("Mixamo Kit Studio inline module script parses as valid JavaScript", () => {
  const match = studio.match(/<script type="module">([\\s\\S]*?)<\\/script>/);
  assert.ok(match, "Missing Mixamo Kit Studio module script");
  const source = match[1].replace(/^import .*?;\\s*$/gm, "");
  assert.doesNotThrow(() => new Script(source));
});
