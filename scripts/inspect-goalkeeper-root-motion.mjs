import fs from "node:fs";
import path from "node:path";
import * as THREE from "../vendor/three/build/three.module.js";
import { FBXLoader } from "../vendor/three/examples/jsm/loaders/FBXLoader.js";

const files = [
  "goalkeeper diving save.fbx",
  "goalkeeper diving save (2).fbx",
  "goalkeeper body block (2).fbx",
  "goalkeeper body block (3).fbx"
];
const sampleFractions = [0, 0.25, 0.5, 0.75, 1];
const relevantBones = [
  "hips", "spine", "spine1", "spine2", "neck",
  "leftarm", "leftforearm", "lefthand", "rightarm", "rightforearm", "righthand",
  "leftupleg", "leftleg", "leftfoot", "rightupleg", "rightleg", "rightfoot"
];
const normalize = value => String(value || "")
  .replace(/_\\$AssimpFbx\\$_(Translation|Rotation|Scaling)$/i, "")
  .replace(/^mixamorig:/i, "")
  .replace(/[\\s_]/g, "")
  .replace(/[^a-z0-9]/gi, "")
  .replace(/^mixamorig\\d*/i, "")
  .toLowerCase();
const loader = new FBXLoader();
const report = [];

function quaternionSummary(track) {
  const frames = [];
  for (let i = 0; i < track.values.length; i += 4) {
    frames.push(new THREE.Quaternion(
      track.values[i], track.values[i + 1], track.values[i + 2], track.values[i + 3]
    ).normalize());
  }
  const first = frames[0], last = frames.at(-1);
  const maxFromStartDeg = Math.max(...frames.map(q => THREE.MathUtils.radToDeg(first.angleTo(q))));
  const euler = q => {
    const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
    return [e.x, e.y, e.z].map(v => Number(THREE.MathUtils.radToDeg(v).toFixed(2)));
  };
  return {
    track: track.name,
    keyframes: frames.length,
    firstEulerYXZDeg: euler(first),
    middleEulerYXZDeg: euler(frames[Math.floor(frames.length / 2)]),
    lastEulerYXZDeg: euler(last),
    firstToLastAngleDeg: Number(THREE.MathUtils.radToDeg(first.angleTo(last)).toFixed(2)),
    maxAngularExcursionDeg: Number(maxFromStartDeg.toFixed(2))
  };
}

for (const file of files) {
  const fullPath = path.resolve("input/player-package", file);
  if (!fs.existsSync(fullPath)) throw new Error("Missing animation asset: " + fullPath);
  const bytes = fs.readFileSync(fullPath);
  const root = loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), path.dirname(fullPath) + path.sep);
  const clip = root.animations?.[0];
  if (!clip) throw new Error(file + " has no animation clip");

  const bones = new Map();
  root.traverse(node => {
    if (node.isBone && node.name) {
      const key = normalize(node.name);
      if (!bones.has(key)) bones.set(key, node);
    }
  });
  const quaternionTracks = clip.tracks.filter(track => /\\.quaternion$/i.test(track.name));
  const positionTracks = clip.tracks.filter(track => /\\.position$/i.test(track.name));
  const selectedTracks = quaternionTracks
    .filter(track => relevantBones.includes(normalize(track.name.slice(0, track.name.lastIndexOf(".")))))
    .map(quaternionSummary);

  const mixer = new THREE.AnimationMixer(root);
  const action = mixer.clipAction(clip);
  action.reset().setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  const sampledPoses = [];
  for (const fraction of sampleFractions) {
    mixer.setTime(clip.duration * fraction);
    root.updateMatrixWorld(true);
    const pose = {};
    for (const name of relevantBones) {
      const bone = bones.get(name);
      if (!bone) continue;
      const position = bone.getWorldPosition(new THREE.Vector3());
      const quaternion = bone.getWorldQuaternion(new THREE.Quaternion()).normalize();
      const euler = new THREE.Euler().setFromQuaternion(quaternion, "YXZ");
      pose[name] = {
        worldPosition: [position.x, position.y, position.z].map(v => Number(v.toFixed(4))),
        worldEulerYXZDeg: [euler.x, euler.y, euler.z].map(v => Number(THREE.MathUtils.radToDeg(v).toFixed(2)))
      };
    }
    sampledPoses.push({ fraction, time: Number((clip.duration * fraction).toFixed(4)), bones: pose });
  }

  report.push({
    file,
    duration: Number(clip.duration.toFixed(4)),
    trackCount: clip.tracks.length,
    quaternionTrackCount: quaternionTracks.length,
    positionTrackCount: positionTracks.length,
    matchedSkeletonBones: relevantBones.filter(name => bones.has(name)),
    missingSkeletonBones: relevantBones.filter(name => !bones.has(name)),
    quaternionTracks: selectedTracks,
    sampledPoses
  });
}
console.log(JSON.stringify({
  result: "BONE_ROTATION_AND_WORLD_POSE_INSPECTION_COMPLETE",
  sampleFractions,
  coordinateNote: "Positions and quaternions are FBX scene world-space values before the game's player group yaw/translation is applied.",
  clips: report
}, null, 2));
