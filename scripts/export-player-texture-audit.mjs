import fs from "node:fs";
import path from "node:path";
import { MeshoptDecoder } from "../vendor/three/examples/jsm/libs/meshopt_decoder.module.js";

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
if (!document || !binary) throw new Error("GLB JSON or BIN chunk missing");

const componentInfo = {
  5120: { bytes: 1, get: "getInt8" },
  5121: { bytes: 1, get: "getUint8" },
  5122: { bytes: 2, get: "getInt16" },
  5123: { bytes: 2, get: "getUint16" },
  5125: { bytes: 4, get: "getUint32" },
  5126: { bytes: 4, get: "getFloat32" }
};
const typeSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

await MeshoptDecoder.ready;

async function readAccessor(index) {
  const accessor = document.accessors?.[index];
  if (!accessor) throw new Error(`Missing accessor ${index}`);
  if (accessor.sparse) throw new Error(`Sparse accessor ${index} is not supported by this audit`);
  const view = document.bufferViews?.[accessor.bufferView];
  if (!view) throw new Error(`Accessor ${index} has no bufferView`);
  const info = componentInfo[accessor.componentType];
  if (!info) throw new Error(`Unsupported component type ${accessor.componentType}`);
  const width = typeSize[accessor.type];
  let sourceBytes = binary;
  let viewStart = view.byteOffset || 0;
  let stride = view.byteStride || info.bytes * width;
  const compressed = view.extensions?.EXT_meshopt_compression;
  if (compressed) {
    if (compressed.buffer !== 0) throw new Error(`Accessor ${index} references an unsupported non-GLB buffer`);
    const packed = binary.subarray(compressed.byteOffset || 0, (compressed.byteOffset || 0) + compressed.byteLength);
    const decoded = new Uint8Array(compressed.count * compressed.byteStride);
    MeshoptDecoder.decodeGltfBuffer(decoded, compressed.count, compressed.byteStride, packed, compressed.mode, compressed.filter);
    sourceBytes = decoded;
    viewStart = 0;
    stride = compressed.byteStride;
  }
  const start = viewStart + (accessor.byteOffset || 0);
  const data = new DataView(sourceBytes.buffer, sourceBytes.byteOffset, sourceBytes.byteLength);
  const values = [];
  for (let i = 0; i < accessor.count; i++) {
    const row = [];
    for (let c = 0; c < width; c++) {
      let value = data[info.get](start + i * stride + c * info.bytes, true);
      if (accessor.normalized && accessor.componentType !== 5126) {
        if (accessor.componentType === 5120) value = Math.max(value / 127, -1);
        else if (accessor.componentType === 5121) value /= 255;
        else if (accessor.componentType === 5122) value = Math.max(value / 32767, -1);
        else if (accessor.componentType === 5123) value /= 65535;
      }
      row.push(value);
    }
    values.push(width === 1 ? row[0] : row);
  }
  return values;
}

function imageDimensions(bytes) {
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    const kind = bytes.subarray(12, 16).toString("ascii");
    if (kind === "VP8X") return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
    if (kind === "VP8 ") return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    if (kind === "VP8L") {
      const bits = bytes.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  if (bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" && bytes.length >= 24) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  return null;
}

const images = (document.images || []).map((image, index) => {
  if (!Number.isInteger(image.bufferView)) {
    return { index, name: image.name || `image-${index}`, mimeType: image.mimeType || null, extracted: false, reason: "Image is not stored in a GLB bufferView" };
  }
  const view = document.bufferViews?.[image.bufferView];
  if (!view) throw new Error(`Image ${index} has an invalid bufferView`);
  const bytes = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  const mime = image.mimeType || "application/octet-stream";
  const ext = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "bin";
  const filename = `texture-${index}.${ext}`;
  fs.writeFileSync(path.join(output, filename), bytes);
  return { index, name: image.name || `image-${index}`, mimeType: mime, filename, bytes: bytes.length, dimensions: imageDimensions(bytes), extracted: true };
});

const textures = (document.textures || []).map((texture, index) => ({
  index,
  name: texture.name || `texture-${index}`,
  imageIndex: texture.source ?? texture.extensions?.KHR_texture_basisu?.source ?? texture.extensions?.EXT_texture_webp?.source ?? null
}));
const materials = (document.materials || []).map((material, index) => {
  const pbr = material.pbrMetallicRoughness || {};
  const base = pbr.baseColorTexture?.index ?? null;
  const normal = material.normalTexture?.index ?? null;
  return {
    index, name: material.name || `material-${index}`,
    baseColorTexture: base, baseColorImage: textures[base]?.imageIndex ?? null,
    normalTexture: normal, normalImage: textures[normal]?.imageIndex ?? null,
    metallicRoughnessTexture: pbr.metallicRoughnessTexture?.index ?? null,
    emissiveTexture: material.emissiveTexture?.index ?? null,
    alphaMode: material.alphaMode || "OPAQUE", doubleSided: Boolean(material.doubleSided)
  };
});

function accessorRange(index) {
  if (!Number.isInteger(index)) return null;
  const a = document.accessors?.[index];
  return a ? { accessor: index, min: a.min || null, max: a.max || null, count: a.count, type: a.type, componentType: a.componentType } : null;
}

const primitives = [];
for (const [meshIndex, mesh] of (document.meshes || []).entries()) {
  for (const [primitiveIndex, primitive] of (mesh.primitives || []).entries()) {
    const uvIndex = primitive.attributes?.TEXCOORD_0;
    const uv = Number.isInteger(uvIndex) ? await readAccessor(uvIndex) : null;
    const indexValues = Number.isInteger(primitive.indices) ? await readAccessor(primitive.indices) : null;
    const vertexCount = uv?.length || 0;
    const indices = indexValues ? indexValues.map(Number) : Array.from({ length: vertexCount }, (_, i) => i);
    const svgName = `uv-material-${primitive.material ?? "none"}.svg`;
    if (uv) {
      const lines = [];
      for (let i = 0; i + 2 < indices.length; i += 3) {
        const pts = [indices[i], indices[i + 1], indices[i + 2]].map(n => {
          const p = uv[n];
          if (!p) throw new Error(`UV index ${n} outside accessor ${uvIndex}`);
          return `${(p[0] * 1024).toFixed(2)},${((1 - p[1]) * 1024).toFixed(2)}`;
        }).join(" ");
        lines.push(`<polygon points="${pts}" />`);
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#fff"/><g fill="none" stroke="#111" stroke-width="0.65" stroke-opacity="0.62">${lines.join("")}</g></svg>`;
      fs.writeFileSync(path.join(output, svgName), svg);
    }
    primitives.push({
      meshIndex, mesh: mesh.name || `mesh-${meshIndex}`, primitiveIndex,
      materialIndex: primitive.material ?? null,
      material: materials[primitive.material]?.name || null,
      position: accessorRange(primitive.attributes?.POSITION),
      uv0: accessorRange(uvIndex), uvSvg: uv ? svgName : null,
      uvVertexCount: uv?.length || 0, triangleCount: Math.floor(indices.length / 3),
      uvBounds: uv ? {
        min: [Math.min(...uv.map(p => p[0])), Math.min(...uv.map(p => p[1]))],
        max: [Math.max(...uv.map(p => p[0])), Math.max(...uv.map(p => p[1]))]
      } : null,
      vertexColor: accessorRange(primitive.attributes?.COLOR_0),
      joints: accessorRange(primitive.attributes?.JOINTS_0),
      weights: accessorRange(primitive.attributes?.WEIGHTS_0)
    });
  }
}

const report = {
  model: "Male Athlete 02",
  source: "https://models.codelove.in/models/sports-male-02.glb",
  glbBytes: buffer.length, images, textures, materials, primitives,
  note: "UV SVGs show triangle layout in texture space. Match each UV SVG to its material base-color image; semantic regions still require visual interpretation."
};
fs.writeFileSync(path.join(output, "texture-audit.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(output, "README.txt"),
  "PITCH 11 — PLAYER TEXTURE / UV AUDIT\n\n" +
  "Extracted embedded images and exported per-material UV triangle layouts from the existing Male Athlete 02 GLB.\n" +
  "Match uv-material-0.svg with the m301_body base-color image and uv-material-1.svg with the m301_head base-color image.\n" +
  "No game runtime files or player assets are modified by this diagnostic export.\n");
console.log(JSON.stringify(report, null, 2));
