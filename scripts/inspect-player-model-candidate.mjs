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
function decodeXml(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<").replaceAll("&gt;", ">");
}
function uniqueXmlNames(xml, tag) {
  const names = [];
  const elementPattern = new RegExp("<" + tag + "\\b([^>]*)>([\\s\\S]*?)</" + tag + ">", "gi");
  const selfClosingPattern = new RegExp("<" + tag + "\\b([^>]*)/>", "gi");
  const collect = (match) => {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const attributeName = attrs.match(/\bname="([^"]+)"/i)?.[1];
    const materialProperty = body.match(/<MatProperty\b[^>]*\bkey="\?mat\.name"[^>]*>([\s\S]*?)<\/MatProperty>/i)?.[1];
    const legacyProperty = body.match(/<Property\b[^>]*\bkey="\$mat\.name"[^>]*\bvalue="([^"]+)"/i)?.[1];
    const childName = body.match(/<(?:name|Name|string)\b[^>]*>([^<]+)<\//)?.[1];
    const value = attributeName || materialProperty || legacyProperty || childName;
    if (value) names.push(decodeXml(value.trim().replace(/^["']|["']$/g, "").trim()));
  };
  for (const match of xml.matchAll(elementPattern)) collect(match);
  for (const match of xml.matchAll(selfClosingPattern)) collect(match);
  return [...new Set(names.filter(Boolean))].sort();
}
function xmlElementSamples(xml, tag, limit = 8) {
  const pattern = new RegExp("<" + tag + "\\b[^>]*>([\\s\\S]{1,700})", "gi");
  return [...xml.matchAll(pattern)].slice(0, limit).map(match => match[0].replace(/\s+/g, " ").slice(0, 700));
}
function inspectMeshMaterials(xml) {
  const indices = [...xml.matchAll(/<Mesh\b[^>]*\bmaterial_index="(\d+)"/gi)].map(match => Number(match[1]));
  const counts = {};
  for (const index of indices) counts[index] = (counts[index] || 0) + 1;
  return { meshEntries: indices.length, materialIndexCounts: counts };
}
function verifyXmlNameParser() {
  const fixture = '<Root><Mesh name="BodyMesh"><Name>ignored</Name></Mesh><Mesh><Name>JerseyMesh</Name></Mesh><Mesh name="Boot&amp;Sole"/><Material><MatProperty key="?mat.name" type="string">"KeeperFabric"</MatProperty></Material></Root>';
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
  geometryNodeNames: [],
  meshMaterialAssignments: { meshEntries: 0, materialIndexCounts: {} },
  nodeNames: [],
  meshXmlSamples: [],
  materialXmlSamples: [],
  nodeXmlSamples: [],
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
    report.geometryNodeNames = [...new Set([...xml.matchAll(/<Node\b[^>]*\bname="(Ch38_[^"]+)"/gi)].map(match => decodeXml(match[1])))].sort();
    report.meshMaterialAssignments = inspectMeshMaterials(xml);
    report.nodeNames = nodeNames;
    report.meshXmlSamples = xmlElementSamples(xml, "Mesh");
    report.materialXmlSamples = xmlElementSamples(xml, "Material");
    report.nodeXmlSamples = xmlElementSamples(xml, "Node");
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
        if (name) targetNames.add(decodeXml(name));
      }
    }
    const modelNames = new Set([...boneNames, ...nodeNames].map(name =>
      String(name).replace(/_\$AssimpFbx\$_(Translation|Rotation|Scaling)$/i, "")
        .replace(/^mixamorig:/i, "").replace(/[\s_]/g, "").replace(/[^a-z0-9]/gi, "")
        .replace(/^mixamorig\d*/i, "").toLowerCase()
    ));
    const canonical = name => String(name || "").replace(/_\$AssimpFbx\$_(Translation|Rotation|Scaling)$/i, "")
      .replace(/^mixamorig:/i, "").replace(/[\s_]/g, "").replace(/[^a-z0-9]/gi, "")
      .replace(/^mixamorig\d*/i, "").toLowerCase();
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
