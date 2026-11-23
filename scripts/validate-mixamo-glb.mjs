import fs from "node:fs";

const file = "input/player-model-candidate/character.glb";
const data = fs.readFileSync(file);
if (data.toString("ascii", 0, 4) !== "glTF") throw new Error("Invalid GLB magic");
if (data.readUInt32LE(4) !== 2) throw new Error("Expected glTF 2.0");
if (data.readUInt32LE(8) !== data.length) throw new Error("GLB length header mismatch");

let offset = 12;
let document;
while (offset + 8 <= data.length) {
  const length = data.readUInt32LE(offset);
  const type = data.readUInt32LE(offset + 4);
  const start = offset + 8;
  if (start + length > data.length) throw new Error("GLB chunk exceeds file length");
  if (type === 0x4e4f534a) document = JSON.parse(data.toString("utf8", start, start + length).trim());
  offset = start + length;
}
if (!document) throw new Error("Missing GLB JSON chunk");

const requiredGarments = ["Ch38_Shirt", "Ch38_Shorts", "Ch38_Socks", "Ch38_Shoes"];
const nodeNames = new Set((document.nodes || []).map(node => node.name).filter(Boolean));
const meshNames = new Set((document.meshes || []).map(mesh => mesh.name).filter(Boolean));
const missingGarments = requiredGarments.filter(name => !nodeNames.has(name) && !meshNames.has(name));
if (missingGarments.length) throw new Error("Missing garment mesh/node names: " + missingGarments.join(", "));

const primitives = (document.meshes || []).flatMap(mesh => mesh.primitives || []);
if (!primitives.length) throw new Error("No mesh primitives found");
const missingUv = primitives.filter(primitive => !Number.isInteger(primitive.attributes?.TEXCOORD_0));
if (missingUv.length) throw new Error(`${missingUv.length} primitives have no TEXCOORD_0 UV channel`);

const skins = document.skins || [];
if (!skins.length) throw new Error("No skin/skeleton found");
const jointCount = Math.max(0, ...skins.map(skin => (skin.joints || []).length));
if (jointCount < 60) throw new Error(`Expected humanoid skeleton (>=60 joints); found ${jointCount}`);

const images = document.images || [];
if (images.length < 4) throw new Error(`Expected at least 4 embedded source textures; found ${images.length}`);
const externalImages = images.filter(image => image.uri && !image.uri.startsWith("data:"));
if (externalImages.length) throw new Error("GLB contains external image dependencies: " + externalImages.map(image => image.uri).join(", "));
if (images.some(image => !image.bufferView && !image.uri?.startsWith("data:"))) {
  throw new Error("One or more GLB images are not embedded");
}
if ((document.materials || []).length < 2) throw new Error("Expected original material slots/materials to survive conversion");

const uv0PrimitiveCount = primitives.length;
const skinBindings = (document.nodes || []).filter(node => Number.isInteger(node.mesh) && Number.isInteger(node.skin)).length;
if (!skinBindings) throw new Error("No skinned mesh node references the converted skeleton");

const report = {
  file,
  bytes: data.length,
  meshes: (document.meshes || []).length,
  primitives: primitives.length,
  uv0Primitives: uv0PrimitiveCount,
  materials: (document.materials || []).length,
  images: images.length,
  skins: skins.length,
  joints: jointCount,
  skinnedMeshNodes: skinBindings,
  garmentNames: requiredGarments.map(name => ({
    name,
    node: nodeNames.has(name),
    mesh: meshNames.has(name)
  })),
  extensionsUsed: document.extensionsUsed || [],
  extensionsRequired: document.extensionsRequired || []
};
fs.writeFileSync("mixamo-character-glb-audit.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
