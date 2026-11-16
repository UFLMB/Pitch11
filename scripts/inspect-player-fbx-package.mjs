import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const directory = "input/player-package";
const sourceDirectory = path.resolve(directory);
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
  results.push({
    file: entry.name,
    bytes: bytes.length,
    meshes: pick("Meshes"),
    materials: pick("Materials"),
    animations: pick("Animations"),
    bones: pick("Bones"),
    boneNameCount: boneNames.length,
    hierarchyNodeCount: nodeNames.length,
    animationNames,
    animationChannelCount: (xml.match(/<Channel\\b/g) || []).length,
    skeletonSignature: signature
  });
}
const groups = new Map();
for (const item of results) {
  if (!groups.has(item.skeletonSignature)) groups.set(item.skeletonSignature, []);
  groups.get(item.skeletonSignature).push(item.file);
}
console.log(JSON.stringify({
  directory,
  fbxCount: results.length,
  totalMB: Number(results.reduce((sum, item) => sum + item.bytes, 0) / 1048576).toFixed(2),
  skeletonSignatureGroups: [...groups.entries()].map(([signature, files]) => ({ signature, count: files.length, files })),
  files: results
}, null, 2));
