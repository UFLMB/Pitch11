import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const playerDir = path.join(root, "assets", "players");

function readGlb(file) {
  const buffer = fs.readFileSync(path.join(playerDir, file));
  if (buffer.toString("ascii", 0, 4) !== "glTF") throw new Error(`${file} is not a GLB file`);
  if (buffer.readUInt32LE(4) !== 2) throw new Error(`${file} is not glTF 2.0`);
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (type === 0x4e4f534a) return JSON.parse(buffer.toString("utf8", start, start + length).trim());
    offset = start + length;
  }
  throw new Error(`${file} has no JSON chunk`);
}

const model = readGlb("player.glb");
if (!model.skins?.length) throw new Error("player.glb has no skin/skeleton");
const modelNodes = new Set((model.nodes || []).map(node => node.name).filter(Boolean));
const joints = new Set(model.skins.flatMap(skin => skin.joints || []).map(index => model.nodes?.[index]?.name).filter(Boolean));
if (joints.size < 60) throw new Error(`Expected a full humanoid rig; found only ${joints.size} named joints`);

let triangles = 0;
for (const mesh of model.meshes || []) {
  for (const primitive of mesh.primitives || []) {
    if ((primitive.mode ?? 4) !== 4) continue;
    const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
    const count = model.accessors?.[accessorIndex]?.count || 0;
    triangles += Math.floor(count / 3);
  }
}
if (!triangles || triangles > 20000) throw new Error(`Unexpected player triangle count: ${triangles}`);

const materialReport = (model.materials || []).map((material, index) => ({
  index,
  name: material.name || `material-${index}`,
  baseColorFactor: material.pbrMetallicRoughness?.baseColorFactor || null,
  baseColorTexture: material.pbrMetallicRoughness?.baseColorTexture?.index ?? null,
  normalTexture: material.normalTexture?.index ?? null,
  metallicRoughnessTexture: material.pbrMetallicRoughness?.metallicRoughnessTexture?.index ?? null
}));
const meshAssignments = (model.nodes || [])
  .filter(node => Number.isInteger(node.mesh))
  .map(node => ({
    node: node.name || "(unnamed node)",
    mesh: model.meshes?.[node.mesh]?.name || `mesh-${node.mesh}`,
    skin: Number.isInteger(node.skin) ? (model.skins?.[node.skin]?.name || `skin-${node.skin}`) : null,
    primitives: (model.meshes?.[node.mesh]?.primitives || []).map(primitive => ({
      material: Number.isInteger(primitive.material)
        ? (model.materials?.[primitive.material]?.name || `material-${primitive.material}`)
        : null,
      materialIndex: primitive.material ?? null,
      mode: primitive.mode ?? 4
    }))
  }));

const clips = [
  ["idle.glb", "Idle"],
  ["walk.glb", "Walk"],
  ["run.glb", "Run"]
];
const copyrightNotices = new Set();
if (model.asset?.copyright) copyrightNotices.add(model.asset.copyright.trim());
const clipReport = [];
for (const [file, name] of clips) {
  const clipAsset = readGlb(file);
  const animation = clipAsset.animations?.[0];
  if (!animation) throw new Error(`${file} contains no animation`);
  const targets = new Set((animation.channels || [])
    .map(channel => clipAsset.nodes?.[channel.target?.node]?.name)
    .filter(Boolean));
  const missing = [...targets].filter(target => !modelNodes.has(target));
  if (!targets.size || missing.length) {
    throw new Error(`${name} rig mismatch; missing model nodes: ${missing.slice(0, 8).join(", ") || "no named targets"}`);
  }
  if (clipAsset.asset?.copyright) copyrightNotices.add(clipAsset.asset.copyright.trim());
  clipReport.push({ name, channels: animation.channels?.length || 0, matchedBones: targets.size });
}
if (!copyrightNotices.size) throw new Error("MIT copyright notice missing from GLB metadata");

const mit = `MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

fs.writeFileSync(path.join(playerDir, "THIRD_PARTY_NOTICES.txt"),
  `PITCH 11 — third-party player model and animation assets

Source: CodeLove 3D Models — Male Athlete 02
Model page: https://models.codelove.in/models/sports-male-02/
Animation library: https://models.codelove.in/animations/
License: MIT

Embedded copyright notices:
${[...copyrightNotices].join("\n")}

${mit}
`);

console.log(JSON.stringify({
  model: "Male Athlete 02",
  triangles,
  namedJoints: joints.size,
  skins: model.skins.length,
  materials: materialReport,
  meshAssignments,
  animations: clipReport,
  copyrightNotices: [...copyrightNotices]
}, null, 2));
