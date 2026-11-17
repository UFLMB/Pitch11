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
    await MeshoptDecoder.decodeGltfBuffer(decoded, compressed.count, compressed.byteStride, packed, compressed.mode, compressed.filter);
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

function buildUvIslands(uv, indices) {
  const triangleCount = Math.floor(indices.length / 3);
  const parent = Array.from({ length: triangleCount }, (_, i) => i);
  const find = (x) => parent[x] === x ? x : (parent[x] = find(parent[x]));
  const join = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  const pointKey = (index) => {
    const p = uv[index];
    if (!p) throw new Error(`UV index ${index} outside accessor`);
    return `${Math.round(p[0] * 100000)},${Math.round(p[1] * 100000)}`;
  };
  const edgeOwners = new Map();
  for (let t = 0; t < triangleCount; t++) {
    const tri = [indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]];
    for (let e = 0; e < 3; e++) {
      const a = pointKey(tri[e]), b = pointKey(tri[(e + 1) % 3]);
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const previous = edgeOwners.get(key);
      if (previous !== undefined) join(t, previous);
      else edgeOwners.set(key, t);
    }
  }
  const groups = new Map();
  for (let t = 0; t < triangleCount; t++) {
    const root = find(t);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(t);
  }
  return [...groups.values()].map((triangles) => {
    const vertexIds = new Set();
    let area = 0;
    for (const t of triangles) {
      const ids = [indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]];
      ids.forEach(id => vertexIds.add(id));
      const [a, b, c] = ids.map(id => uv[id]);
      area += Math.abs((a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])) / 2);
    }
    const points = [...vertexIds].map(id => uv[id]);
    return {
      triangles: triangles.length,
      vertices: vertexIds.size,
      uvBounds: {
        min: [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1]))],
        max: [Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))]
      },
      uvArea: area,
      _triangleSet: triangles
    };
  }).sort((a, b) => b.uvArea - a.uvArea);
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
    const islands = uv ? buildUvIslands(uv, indices) : [];
    if (uv) {
      const palette = ["#ef4444", "#0ea5e9", "#22c55e", "#eab308", "#a855f7", "#f97316", "#14b8a6", "#ec4899"];
      const polygons = [];
      for (let t = 0; t * 3 + 2 < indices.length; t++) {
        const islandIndex = islands.findIndex(island => island._triangleSet?.includes(t));
        const pts = [indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]].map(n => {
          const p = uv[n];
          if (!p) throw new Error(`UV index ${n} outside accessor ${uvIndex}`);
          return `${(p[0] * 1023).toFixed(2)},${(p[1] * 1024).toFixed(2)}`;
        }).join(" ");
        polygons.push(`<polygon points="${pts}" fill="none" stroke="${palette[islandIndex % palette.length]}" stroke-width="0.8" stroke-opacity="0.78" />`);
      }
      const labels = islands.map((island, i) => {
        const x = ((island.uvBounds.min[0] + island.uvBounds.max[0]) / 2) * 1023;
        const y = ((island.uvBounds.min[1] + island.uvBounds.max[1]) / 2) * 1024;
        return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="Arial,sans-serif" font-size="18" font-weight="700" text-anchor="middle" fill="#111" stroke="#fff" stroke-width="3" paint-order="stroke">${i + 1}</text>`;
      }).join("");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#fff"/><g>${polygons.join("")}</g><g>${labels}</g></svg>`;
      fs.writeFileSync(path.join(output, svgName), svg);
      fs.writeFileSync(path.join(output, `uv-material-${primitive.material ?? "none"}-islands.json`), JSON.stringify(islands, null, 2));
      if (mesh.name === "m301_hipoly_81_bones" && primitive.material === 0) {
        const jerseyIslandIndexes = [0, 7, 8, 15, 16];
        const jerseyPolygons = [];
        for (const islandIndex of jerseyIslandIndexes) {
          const island = islands[islandIndex];
          if (!island) throw new Error(`Missing expected jersey UV island ${islandIndex + 1}`);
          for (const triangleIndex of island._triangleSet) {
            const pts = [indices[triangleIndex * 3], indices[triangleIndex * 3 + 1], indices[triangleIndex * 3 + 2]].map(n => {
              const p = uv[n];
              return `${(p[0] * 1023).toFixed(2)},${(p[1] * 1024).toFixed(2)}`;
            }).join(" ");
            jerseyPolygons.push(`<polygon points="${pts}" fill="#a3e635" fill-opacity="0.48" stroke="#166534" stroke-width="0.35" />`);
          }
        }
        const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><g>${jerseyPolygons.join("")}</g></svg>`;
        fs.writeFileSync(path.join(output, "jersey-mask-preview.svg"), preview);
      }
    }
    primitives.push({
      meshIndex, mesh: mesh.name || `mesh-${meshIndex}`, primitiveIndex,
      materialIndex: primitive.material ?? null,
      material: materials[primitive.material]?.name || null,
      position: accessorRange(primitive.attributes?.POSITION),
      uv0: accessorRange(uvIndex), uvSvg: uv ? svgName : null,
      uvVertexCount: uv?.length || 0, triangleCount: Math.floor(indices.length / 3),
      uvIslandCount: islands.length, uvIslands: islands.map(({ _triangleSet, ...island }) => island),
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
  "Match each uv-material-N.svg with its material base-color image. SVGs now color-code connected UV islands and number them by descending UV area; matching JSON files list each island bounding box, triangle count, vertex count, and UV area.\n" +
  "No game runtime files or player assets are modified by this diagnostic export.\n");
console.log(JSON.stringify(report, null, 2));
