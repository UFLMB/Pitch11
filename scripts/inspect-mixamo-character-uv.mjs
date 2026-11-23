import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const sourcePath = path.resolve("input/player-model-candidate/character.fbx");
const exportPath = "/tmp/pitch11-mixamo-character-audit.glb";
const reportPath = "mixamo-character-uv-audit.json";

function run(args) {
  const result = spawnSync("assimp", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "assimp " + args.join(" ") + " failed");
  return result.stdout || "";
}
function parseGlb(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "glTF" || buffer.readUInt32LE(4) !== 2) {
    throw new Error("Assimp did not produce a valid binary glTF 2.0 file");
  }
  let offset = 12, document = null, binary = null;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + length > buffer.length) throw new Error("GLB chunk exceeds file bounds");
    const chunk = buffer.subarray(start, start + length);
    if (type === 0x4e4f534a) document = JSON.parse(chunk.toString("utf8").trim());
    if (type === 0x004e4942) binary = chunk;
    offset = start + length;
  }
  if (!document || !binary) throw new Error("GLB JSON or BIN chunk missing");
  return { document, binary };
}
const componentInfo = {
  5120: { bytes: 1, get: "getInt8" }, 5121: { bytes: 1, get: "getUint8" },
  5122: { bytes: 2, get: "getInt16" }, 5123: { bytes: 2, get: "getUint16" },
  5125: { bytes: 4, get: "getUint32" }, 5126: { bytes: 4, get: "getFloat32" }
};
const typeSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
function createAccessorReader(document, binary) {
  return function readAccessor(index) {
    const accessor = document.accessors?.[index];
    if (!accessor) throw new Error("Missing accessor " + index);
    if (accessor.sparse) throw new Error("Sparse accessor " + index + " is not supported by this audit");
    const view = document.bufferViews?.[accessor.bufferView];
    if (!view) throw new Error("Accessor " + index + " has no bufferView");
    const info = componentInfo[accessor.componentType], width = typeSize[accessor.type];
    if (!info || !width) throw new Error("Unsupported accessor " + index + " format");
    const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
    const stride = view.byteStride || info.bytes * width;
    const data = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
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
  };
}
function imageDimensions(bytes) {
  if (bytes.length >= 24 && bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), format: "png" };
  }
  if (bytes.length >= 30 && bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    const kind = bytes.subarray(12, 16).toString("ascii");
    if (kind === "VP8X") return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3), format: "webp" };
    if (kind === "VP8 ") return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff, format: "webp" };
    if (kind === "VP8L") {
      const bits = bytes.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, format: "webp" };
    }
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue; }
      const marker = bytes[offset + 1], length = bytes.readUInt16BE(offset + 2);
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
        return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5), format: "jpeg" };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  return null;
}
function materialTextureRefs(material) {
  const pbr = material.pbrMetallicRoughness || {};
  return {
    baseColor: pbr.baseColorTexture?.index ?? null,
    metallicRoughness: pbr.metallicRoughnessTexture?.index ?? null,
    normal: material.normalTexture?.index ?? null,
    occlusion: material.occlusionTexture?.index ?? null,
    emissive: material.emissiveTexture?.index ?? null
  };
}
function summarizeUv(values, indices, triangleCount) {
  if (!values?.length) return null;
  let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity, outside = 0;
  for (const pair of values) {
    const u = pair[0], v = pair[1];
    minU = Math.min(minU, u); minV = Math.min(minV, v);
    maxU = Math.max(maxU, u); maxV = Math.max(maxV, v);
    if (u < -1e-5 || u > 1.00001 || v < -1e-5 || v > 1.00001) outside++;
  }
  let degenerateTriangles = 0, uvArea = 0;
  for (let t = 0; t < triangleCount; t++) {
    const ids = [indices[t * 3], indices[t * 3 + 1], indices[t * 3 + 2]];
    if (ids.some(id => !values[id])) continue;
    const a = values[ids[0]], b = values[ids[1]], c = values[ids[2]];
    const area = Math.abs((a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]))/2);
    uvArea += area;
    if (area < 1e-10) degenerateTriangles++;
  }
  return {
    vertexUvCount: values.length,
    bounds: { min: [minU,minV], max: [maxU,maxV] },
    outOfUnitSquareUvCount: outside,
    degenerateUvTriangleCount: degenerateTriangles,
    totalTriangleUvArea: Number(uvArea.toFixed(8))
  };
}

const report = {
  source: "input/player-model-candidate/character.fbx",
  sourceSha256: null, sourceBytes: 0,
  export: "Assimp FBX to glTF 2.0 binary; inspection copy only",
  meshInstances: [], meshes: [], materials: [], textures: [], skins: [], totals: {},
  status: "failed"
};

try {
  const source = await readFile(sourcePath);
  report.sourceBytes = source.length;
  report.sourceSha256 = createHash("sha256").update(source).digest("hex");
  if (source.subarray(0, 18).toString("binary") !== "Kaydara FBX Binary") {
    throw new Error("Source is not a binary FBX file");
  }
  run(["export", sourcePath, exportPath, "-f", "glb2"]);
  const parsed = parseGlb(await readFile(exportPath));
  const document = parsed.document, binary = parsed.binary;
  const readAccessor = createAccessorReader(document, binary);
  const nodesByMesh = new Map();
  for (const [nodeIndex, node] of (document.nodes || []).entries()) {
    if (!Number.isInteger(node.mesh)) continue;
    if (!nodesByMesh.has(node.mesh)) nodesByMesh.set(node.mesh, []);
    nodesByMesh.get(node.mesh).push({
      nodeIndex, nodeName: node.name || "node-" + nodeIndex,
      skinIndex: Number.isInteger(node.skin) ? node.skin : null
    });
  }
  report.meshInstances = [...nodesByMesh.entries()].flatMap(([meshIndex, instances]) =>
    instances.map(instance => ({ meshIndex, ...instance }))
  );
  report.skins = (document.skins || []).map((skin, index) => ({
    index, name: skin.name || "skin-" + index, jointCount: skin.joints?.length || 0,
    jointNames: (skin.joints || []).map(nodeIndex => document.nodes?.[nodeIndex]?.name || "node-" + nodeIndex)
  }));
  report.materials = (document.materials || []).map((material, index) => ({
    index, name: material.name || "material-" + index,
    textureRefs: materialTextureRefs(material),
    alphaMode: material.alphaMode || "OPAQUE", doubleSided: Boolean(material.doubleSided)
  }));
  report.textures = (document.images || []).map((entry, index) => {
    let bytes = null;
    if (Number.isInteger(entry.bufferView)) {
      const view = document.bufferViews?.[entry.bufferView];
      if (view) bytes = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    } else if (entry.uri) {
      return { index, name: entry.name || "image-" + index, uri: entry.uri, embedded: false, dimensions: null };
    }
    return {
      index, name: entry.name || "image-" + index, mimeType: entry.mimeType || null,
      embedded: Boolean(bytes), bytes: bytes?.length || 0,
      dimensions: bytes ? imageDimensions(bytes) : null
    };
  });

  let totalVertices = 0, totalTriangles = 0, totalPrimitives = 0, uvChannelCount = 0;
  for (const [meshIndex, mesh] of (document.meshes || []).entries()) {
    const meshReport = {
      index: meshIndex, name: mesh.name || "mesh-" + meshIndex,
      nodeInstances: nodesByMesh.get(meshIndex) || [], primitives: []
    };
    for (const [primitiveIndex, primitive] of (mesh.primitives || []).entries()) {
      const attrs = primitive.attributes || {};
      const position = Number.isInteger(attrs.POSITION) ? readAccessor(attrs.POSITION) : [];
      const indices = Number.isInteger(primitive.indices)
        ? readAccessor(primitive.indices).map(Number)
        : Array.from({ length: position.length }, (_, i) => i);
      const mode = primitive.mode ?? 4;
      const triangleCount = mode === 4 ? Math.floor(indices.length / 3)
        : mode === 5 || mode === 6 ? Math.max(0, indices.length - 2) : 0;
      const uvChannels = {};
      for (const [attributeName, accessorIndex] of Object.entries(attrs)) {
        const match = attributeName.match(/^TEXCOORD_(\d+)$/);
        if (!match) continue;
        const channel = Number(match[1]);
        uvChannels["uv" + channel] = summarizeUv(readAccessor(accessorIndex), indices, triangleCount);
        uvChannelCount++;
      }
      meshReport.primitives.push({
        index: primitiveIndex, materialIndex: primitive.material ?? null,
        materialName: document.materials?.[primitive.material]?.name || null,
        topologyMode: mode, vertexCount: position.length, indexCount: indices.length, triangleCount,
        uvChannels, attributes: Object.keys(attrs).sort(),
        positionBounds: document.accessors?.[attrs.POSITION]?.min && document.accessors?.[attrs.POSITION]?.max
          ? { min: document.accessors[attrs.POSITION].min, max: document.accessors[attrs.POSITION].max } : null
      });
      totalVertices += position.length; totalTriangles += triangleCount; totalPrimitives++;
    }
    report.meshes.push(meshReport);
  }
  report.totals = {
    meshCount: report.meshes.length, meshInstanceCount: report.meshInstances.length,
    primitiveCount: totalPrimitives, vertexCount: totalVertices, triangleCount: totalTriangles,
    uvChannelPrimitiveCount: uvChannelCount,
    materialCount: report.materials.length,
    embeddedTextureCount: report.textures.filter(t => t.embedded).length,
    externalTextureCount: report.textures.filter(t => !t.embedded).length,
    skinCount: report.skins.length,
    totalSkinJointReferences: report.skins.reduce((sum, skin) => sum + skin.jointCount, 0)
  };
  if (!report.meshes.length) throw new Error("The FBX export contains no meshes");
  report.status = "completed";
} catch (error) {
  report.error = error?.message || String(error);
}
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (report.status !== "completed") process.exitCode = 1;
