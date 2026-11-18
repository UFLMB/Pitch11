import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const modelPath = path.resolve("input/player-model-candidate/character.fbx");
const packageDir = path.resolve("input/player-package");
const reportPath = path.resolve("player-model-candidate-audit.json");

function run(args) {
  const result = spawnSync("assimp", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `assimp ${args.join(" ")} failed`);
  return result.stdout || "";
}
function count(label, info) {
  const match = info.match(new RegExp(`^\\s*${label}:\\s*(.+)$`, "mi"));
  return match ? Number.parseInt(match[1], 10) : 0;
}
function canonical(name) {
  return String(name || "").replace(/_\$AssimpFbx\$_(Translation|Rotation|Scaling)$/i, "").replace(/^mixamorig:/i, "").replace(/[\s_]/g, "").replace(/[^a-z0-9]/gi, "").replace(/^mixamorig\d*/i, "").toLowerCase();
}
function uniqueXmlNames(xml, tag) {
  return [...new Set([...xml.matchAll(new RegExp(`<${tag}\\b[^>]*\\bname="([^"]+)"`, "g"))]
    .map(match => match[1].replaceAll("&amp;", "&")))].sort();
}

const report = {
  path: "input/player-model-candidate/character.fbx",
  available: false,
  validBinaryFbx: false,
  sizeBytes: 0,
  sha256: null,
  skinnedBoneCount: 0,
  hierarchyNodeCount: 0,
  meshCount: 0,
  materialCount: 0,
  animationClipCount: 0,
  meshNames: [],
  materialNames: [],
  animationRigCoverage: null,
  status: "missing"
};

try {
  const bytes = await readFile(modelPath);
  report.sizeBytes = bytes.length;
  report.sha256 = createHash("sha256").update(bytes).digest("hex");
  const header = bytes.subarray(0, 32).toString("utf8");
  if (header.startsWith("version https://git-lfs.github.com/spec/v1")) {
    report.status = "git-lfs-pointer-only";
    report.pointer = header.trim();
  } else {
    report.available = true;
    report.validBinaryFbx = bytes.subarray(0, 18).toString("binary").startsWith("Kaydara FBX Binary");
    if (!report.validBinaryFbx && !bytes.toString("utf8", 0, Math.min(bytes.length, 128)).trimStart().startsWith("; FBX")) {
      report.status = "not-an-fbx-file";
      throw new Error("Candidate is neither binary nor ASCII FBX");
    }
    const dumpPath = "/tmp/pitch11-character-candidate.assxml";
    run(["dump", modelPath, dumpPath]);
    const xml = await readFile(dumpPath, "utf8");
    const boneNames = uniqueXmlNames(xml, "Bone");
    const nodeNames = uniqueXmlNames(xml, "Node");
    report.meshNames = uniqueXmlNames(xml, "Mesh");
    report.materialNames = uniqueXmlNames(xml, "Material");
    const info = run(["info", modelPath]);
    report.skinnedBoneCount = boneNames.length;
    report.hierarchyNodeCount = nodeNames.length;
    report.meshCount = count("Meshes", info);
    report.materialCount = count("Materials", info);
    report.animationClipCount = count("Animations", info);

    const targetNames = new Set();
    const { readdir } = await import("node:fs/promises");
    for (const file of (await readdir(packageDir)).filter(name => name.toLowerCase().endsWith(".fbx"))) {
      const clipPath = path.join(packageDir, file);
      const clipDump = `/tmp/pitch11-clip-${Buffer.from(file).toString("hex")}.assxml`;
      run(["dump", clipPath, clipDump]);
      const clipXml = await readFile(clipDump, "utf8");
      for (const match of clipXml.matchAll(/<NodeAnim\b([^>]*)>/g)) {
        const attrs = match[1];
        const name = attrs.match(/\bnode="([^"]+)"/)?.[1] || attrs.match(/\bname="([^"]+)"/)?.[1];
        if (name) targetNames.add(name.replaceAll("&amp;", "&"));
      }
    }
    const modelNames = new Set([...boneNames, ...nodeNames].map(canonical));
    const matched = [...targetNames].filter(name => modelNames.has(canonical(name)));
    const unmatched = [...targetNames].filter(name => !modelNames.has(canonical(name)));
    report.animationRigCoverage = {
      uniqueAnimationTargets: targetNames.size,
      matchedTargets: matched.length,
      unmatchedTargets: unmatched.length,
      coveragePercent: targetNames.size ? Number((matched.length / targetNames.size * 100).toFixed(1)) : 0,
      unmatchedExamples: unmatched.slice(0, 20)
    };
    report.status = report.skinnedBoneCount > 0 ? "fbx-loaded-and-inspected" : "fbx-has-no-skinned-bones";
  }
} catch (error) {
  report.error = error?.message || String(error);
}

await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (!report.available || report.status !== "fbx-loaded-and-inspected" ||
    !report.animationRigCoverage || report.animationRigCoverage.coveragePercent < 95) {
  console.warn("Goalkeeper character candidate is not yet verified for direct Mixamo animation playback.");
}
