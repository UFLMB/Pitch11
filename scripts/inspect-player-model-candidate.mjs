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
  const names = [];
  const elementPattern = new RegExp("<" + tag + "\\b([^>]*)>([\\s\\S]*?)</" + tag + ">", "gi");
  const selfClosingPattern = new RegExp("<" + tag + "\\b([^>]*)/>", "gi");
  const collect = (match) => {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const attributeName = attrs.match(/name="([^"]+)"/i)?.[1];
    const propertyName = body.match(/<Property\b[^>]*\bkey="\$mat\.name"[^>]*\b(?:value|type)="([^"]+)"/i)?.[1];
    const childName = body.match(/<(?:name|Name|string)\b[^>]*>([^<]+)<\//)?.[1];
    const value = attributeName || propertyName || childName;
    if (value) names.push(value.replaceAll("&amp;", "&").trim());
  };
  for (const match of xml.matchAll(elementPattern)) collect(match);
  for (const match of xml.matchAll(selfClosingPattern)) collect(match);
  return [...new Set(names.filter(Boolean))].sort();
}
function xmlElementSamples(xml, tag) {
  const pattern = new RegExp("<" + tag + "\\b[^>]*>([\\s\\S]{1,700})", "gi");
  return [...xml.matchAll(pattern)].slice(0, 8).map(match => match[0].replace(/\s+/g, " ").slice(0, 700));
}

function verifyXmlNameParser() {
  const fixture = '<Root><Mesh name="BodyMesh"><Name>ignored</Name></Mesh><Mesh><Name>JerseyMesh</Name></Mesh><Mesh name="Boot&amp;Sole"/><Material><Property key="$mat.name" value="KeeperFabric"/></Material></Root>';
  const meshes = uniqueXmlNames(fixture, "Mesh");
  const materials = uniqueXmlNames(fixture, "Material");
  if (meshes.join("|") !== "BodyMesh|Boot&Sole|JerseyMesh" || materials.join("|") !== "KeeperFabric") {
    throw new Error("Assimp XML mesh/material name parser self-test failed");
  }
}
verifyXmlNameParser();

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
  meshXmlSamples: [],
  materialXmlSamples: [],
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
    report.meshXmlSamples = xmlElementSamples(xml, "Mesh");
    report.materialXmlSamples = xmlElementSamples(xml, "Material");
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
