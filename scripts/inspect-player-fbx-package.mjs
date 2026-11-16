import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const directory = "input/player-package";
const sourceDirectory = path.resolve(directory);
const compareModel = process.argv.includes("--compare-model");
const playerModelPath = path.resolve("assets/players/player.glb");
const entries = await readdir(sourceDirectory, { withFileTypes: true });
const files = entries.filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".fbx")).map(entry => ({ name: entry.name }));
if (!files.length) throw new Error("No FBX files found in input/player-package");
const work = "/tmp/pitch11-fbx-audit";
await mkdir(work, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  return result.stdout || "";
}
function names(xml, tag) {
  const found = [];
  const re = new RegExp(`<${tag}\\b[^>]*\\bname="([^"]+)"`, "g");
  for (const match of xml.matchAll(re)) found.push(match[1].replaceAll("&amp;", "&"));
  return [...new Set(found)].sort();
}
function readGlbJson(file) {
  const buffer = requireBuffer(file);
  if (buffer.toString("ascii", 0, 4) !== "glTF" || buffer.readUInt32LE(4) !== 2) {
    throw new Error(`${file} is not a glTF 2.0 binary`);
  }
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
function requireBuffer(file) {
  return glbBuffers.get(file);
}
const glbBuffers = new Map();
let modelNodeNames = null;
if (compareModel) {
  const modelBytes = await readFile(playerModelPath);
  glbBuffers.set(playerModelPath, modelBytes);
  const model = readGlbJson(playerModelPath);
  modelNodeNames = new Set((model.nodes || []).map(node => node.name).filter(Boolean));
  if (!modelNodeNames.size) throw new Error("The downloaded player GLB has no named nodes");
}

const results = [];
for (const entry of files) {
  const target = path.join(work, entry.name);
  const bytes = await readFile(path.join(sourceDirectory, entry.name));
  if (bytes.length < 128) throw new Error(`Suspiciously small FBX: ${entry.name}`);
  await writeFile(target, bytes);
  const xmlPath = target + ".assxml";
  run("assimp", ["dump", target, xmlPath]);
  const xml = await readFile(xmlPath, "utf8");
  const boneNames = names(xml, "Bone");
  const nodeNames = names(xml, "Node");
  const animationNames = names(xml, "Animation");
  const hierarchy = boneNames.length ? boneNames : nodeNames.filter(name => !/^(RootNode|Scene|Armature)$/i.test(name));
  const signature = hierarchy.length ? createHash("sha256").update(hierarchy.join("\n")).digest("hex").slice(0, 12) : "no-skeleton-names";
  const info = run("assimp", ["info", target]);
  const pick = label => {
    const match = info.match(new RegExp(`^\\s*${label}:\\s*(.+)$`, "mi"));
    return match ? match[1].trim() : "not-reported";
  };
  const trackTargets = [];
  for (const match of xml.matchAll(/<NodeAnim\b([^>]*)>/g)) {
    const attrs = match[1];
    const targetName = attrs.match(/\bnode="([^"]+)"/)?.[1] || attrs.match(/\bname="([^"]+)"/)?.[1];
    if (targetName) trackTargets.push(targetName.replaceAll("&amp;", "&"));
  }
  const uniqueTrackTargets = [...new Set(trackTargets)].sort();
  if (!nodeNames.length) throw new Error(`${entry.name}: Assimp returned no hierarchy nodes`);
  if (compareModel && !uniqueTrackTargets.length) throw new Error(`${entry.name}: could not extract any FBX animation track targets`);
  if (!nodeNames.length) throw new Error(`${entry.name}: Assimp returned no hierarchy nodes`);
  const result = {
    file: entry.name,
    bytes: bytes.length,
    meshes: pick("Meshes"),
    materials: pick("Materials"),
    animations: pick("Animations"),
    bones: pick("Bones"),
    boneNameCount: boneNames.length,
    hierarchyNodeCount: nodeNames.length,
    animationChannelCount: (xml.match(/<NodeAnim\b/g) || []).length,
    animationChannelCount: (xml.match(/<NodeAnim\\b/g) || []).length,
    skeletonSignature: signature
  };
  if (compareModel) {
    const matched = uniqueTrackTargets.filter(name => modelNodeNames.has(name));
    const unmatched = uniqueTrackTargets.filter(name => !modelNodeNames.has(name));
    result.modelRigComparison = {
      uniqueAnimationTargets: uniqueTrackTargets.length,
      matchedTargets: matched.length,
      unmatchedTargets: unmatched.length,
      coveragePercent: uniqueTrackTargets.length ? Number((matched.length / uniqueTrackTargets.length * 100).toFixed(1)) : 0,
      unmatchedTargetExamples: unmatched.slice(0, 20)
    };
  }
  results.push(result);
}
const groups = new Map();
for (const item of results) {
  if (!groups.has(item.skeletonSignature)) groups.set(item.skeletonSignature, []);
  groups.get(item.skeletonSignature).push(item.file);
}
const report = {
  directory,
  fbxCount: results.length,
  totalMB: Number(results.reduce((sum, item) => sum + item.bytes, 0) / 1048576).toFixed(2),
  skeletonSignatureGroups: [...groups.entries()].map(([signature, groupFiles]) => ({ signature, count: groupFiles.length, files: groupFiles })),
  ...(compareModel ? { comparisonModel: "assets/players/player.glb", modelNamedNodeCount: modelNodeNames.size } : {}),
  files: results
};
console.log(JSON.stringify(report, null, 2));
