import fs from "node:fs";
import path from "node:path";

const input = path.resolve("assets/players/player.glb");
const output = path.resolve(process.argv[2] || "/tmp/pitch11-player-texture-audit");
fs.mkdirSync(output, { recursive: true });

const buffer = fs.readFileSync(input);
if (buffer.toString("ascii", 0, 4) !== "glTF" || buffer.readUInt32LE(4) !== 2) {
  throw new Error("Expected a binary glTF 2.0 player model");
}

let offset = 12;
let document;
let binary;
while (offset + 8 <= buffer.length) {
  const length = buffer.readUInt32LE(offset);
  const type = buffer.readUInt32LE(offset + 4);
  const start = offset + 8;
  const chunk = buffer.subarray(start, start + length);
  if (type === 0x4e4f534a) document = JSON.parse(chunk.toString("utf8").trim());
  if (type === 0x004e4942) binary = chunk;
  offset = start + length;
}
if (!document) throw new Error("GLB JSON chunk missing");

function imageDimensions(bytes, mime) {
  if (mime === "image/png" && bytes.length >= 24) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (mime === "image/jpeg") {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const marker = bytes[i + 1];
      const size = bytes.readUInt16BE(i + 2);
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
        return { width: bytes.readUInt16BE(i + 7), height: bytes.readUInt16BE(i + 5) };
      }
      if (size < 2) break;
      i += 2 + size;
    }
  }
  return null;
}

const images = (document.images || []).map((image, index) => {
  if (!Number.isInteger(image.bufferView)) {
    return { index, name: image.name || `image-${index}`, mimeType: image.mimeType || null, extracted: false, reason: "Image is not stored in a GLB bufferView" };
  }
  const view = document.bufferViews?.[image.bufferView];
  if (!view || !binary) throw new Error(`Image ${index} has an invalid bufferView`);
  const bytes = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  const mime = image.mimeType || "application/octet-stream";
  const ext = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "bin";
  const filename = `texture-${index}.${ext}`;
  fs.writeFileSync(path.join(output, filename), bytes);
  return {
    index,
    name: image.name || `image-${index}`,
    mimeType: mime,
    filename,
    bytes: bytes.length,
    dimensions: imageDimensions(bytes, mime),
    extracted: true
  };
});

const textures = (document.textures || []).map((texture, index) => ({
  index,
  name: texture.name || `texture-${index}`,
  imageIndex: texture.source ?? null
}));

const materials = (document.materials || []).map((material, index) => {
  const pbr = material.pbrMetallicRoughness || {};
  return {
    index,
    name: material.name || `material-${index}`,
    baseColorTexture: pbr.baseColorTexture?.index ?? null,
    baseColorImage: textures[pbr.baseColorTexture?.index]?.imageIndex ?? null,
    normalTexture: material.normalTexture?.index ?? null,
    normalImage: textures[material.normalTexture?.index]?.imageIndex ?? null,
    metallicRoughnessTexture: pbr.metallicRoughnessTexture?.index ?? null,
    emissiveTexture: material.emissiveTexture?.index ?? null,
    alphaMode: material.alphaMode || "OPAQUE",
    doubleSided: Boolean(material.doubleSided)
  };
});

function accessorRange(index) {
  if (!Number.isInteger(index)) return null;
  const accessor = document.accessors?.[index];
  return accessor ? { accessor: index, min: accessor.min || null, max: accessor.max || null, count: accessor.count, type: accessor.type } : null;
}

const primitives = [];
for (const [meshIndex, mesh] of (document.meshes || []).entries()) {
  for (const [primitiveIndex, primitive] of (mesh.primitives || []).entries()) {
    primitives.push({
      meshIndex,
      mesh: mesh.name || `mesh-${meshIndex}`,
      primitiveIndex,
      materialIndex: primitive.material ?? null,
      material: materials[primitive.material]?.name || null,
      position: accessorRange(primitive.attributes?.POSITION),
      uv0: accessorRange(primitive.attributes?.TEXCOORD_0),
      uv1: accessorRange(primitive.attributes?.TEXCOORD_1),
      vertexColor: accessorRange(primitive.attributes?.COLOR_0),
      joints: accessorRange(primitive.attributes?.JOINTS_0),
      weights: accessorRange(primitive.attributes?.WEIGHTS_0)
    });
  }
}

const report = {
  model: "Male Athlete 02",
  source: "https://models.codelove.in/models/sports-male-02.glb",
  glbBytes: buffer.length,
  images,
  textures,
  materials,
  primitives,
  note: "UV ranges describe the complete primitive; they do not identify semantic body regions without inspecting the texture atlas."
};
fs.writeFileSync(path.join(output, "texture-audit.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(output, "README.txt"),
  "PITCH 11 — PLAYER TEXTURE AUDIT\n\n" +
  "Extracted embedded images from the existing Male Athlete 02 GLB.\n" +
  "texture-audit.json maps image indices to material texture slots and records UV accessor ranges.\n" +
  "No game runtime files or player assets are modified by this audit.\n");
console.log(JSON.stringify(report, null, 2));
