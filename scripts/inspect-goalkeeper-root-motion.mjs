import fs from "node:fs";
import path from "node:path";
import * as THREE from "../vendor/three/build/three.module.js";
import { FBXLoader } from "../vendor/three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "../vendor/three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "../vendor/three/examples/jsm/libs/meshopt_decoder.module.js";
import { clone as cloneSkeleton } from "../vendor/three/examples/jsm/utils/SkeletonUtils.js";
import { validateDirectMixamoClip } from "../engine/match-player-renderer.mjs";

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
  .replace(/_\$AssimpFbx\$_(Translation|Rotation|Scaling)$/i, "")
  .replace(/^mixamorig:/i, "")
  .replace(/[\s_]/g, "")
  .replace(/[^a-z0-9]/gi, "")
  .replace(/^mixamorig\d*/i, "")
  .toLowerCase();

const fbxLoader = new FBXLoader();

// The diagnostic runs in Node, while FBX/GLTF loaders normally expect browser image APIs.
// Textures are irrelevant to bone transforms and model bounds, so provide a tiny image stub.
globalThis.window = globalThis;
globalThis.self = globalThis;
globalThis.innerWidth = 1;
globalThis.innerHeight = 1;
globalThis.createImageBitmap ||= async () => ({ width: 1, height: 1, close() {} });

function toArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function inspectModel(root) {
  let skinnedMeshes = 0;
  const boneNames = new Set();
  root.traverse(node => {
    if (node.isSkinnedMesh) skinnedMeshes++;
    if (node.isBone && node.name) boneNames.add(normalize(node.name));
  });
  return { skinnedMeshes, boneCount: boneNames.size, boneNames: [...boneNames].sort() };
}

async function loadRuntimeCharacterTemplate() {
  const candidatePath = path.resolve("input/player-model-candidate/character.fbx");
  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).size > 1024) {
    try {
      const bytes = fs.readFileSync(candidatePath);
      const originalTextureLoad = THREE.TextureLoader.prototype.load;
      THREE.TextureLoader.prototype.load = function () { return new THREE.Texture(); };
      let candidate;
      try {
        candidate = fbxLoader.parse(toArrayBuffer(bytes), path.dirname(candidatePath) + path.sep);
      } finally {
        THREE.TextureLoader.prototype.load = originalTextureLoad;
      }
      candidate.updateMatrixWorld(true);
      const stats = inspectModel(candidate);
      if (stats.skinnedMeshes && stats.boneCount) {
        return { root: candidate, source: "input/player-model-candidate/character.fbx", stats };
      }
    } catch (error) {
      console.warn("Character FBX candidate could not be loaded; matching runtime GLB fallback:", error.message);
    }
  }

  const fallbackPath = path.resolve("assets/players/player.glb");
  if (!fs.existsSync(fallbackPath)) throw new Error("No runtime character model is available");
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const bytes = fs.readFileSync(fallbackPath);
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(toArrayBuffer(bytes), path.dirname(fallbackPath) + path.sep, resolve, reject);
  });
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const stats = inspectModel(root);
  if (!stats.skinnedMeshes || !stats.boneCount) {
    throw new Error("Runtime GLB fallback has no usable skinned Mixamo skeleton");
  }
  return { root, source: "assets/players/player.glb (runtime fallback)", stats };
}

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

const runtimeTemplate = await loadRuntimeCharacterTemplate();
const report = [];

for (const file of files) {
  const fullPath = path.resolve("input/player-package", file);
  if (!fs.existsSync(fullPath)) throw new Error("Missing animation asset: " + fullPath);
  const bytes = fs.readFileSync(fullPath);
  const sourceRoot = fbxLoader.parse(toArrayBuffer(bytes), path.dirname(fullPath) + path.sep);
  const sourceClip = sourceRoot.animations?.[0];
  if (!sourceClip) throw new Error(file + " has no animation clip");

  // Match the production renderer: bind the source FBX tracks to the actual
  // runtime character skeleton, rather than measuring the animation-only FBX.
  const binding = validateDirectMixamoClip(runtimeTemplate.root, sourceClip);
  const clip = binding.clip;
  const model = cloneSkeleton(runtimeTemplate.root);
  model.updateMatrixWorld(true);

  // This is the exact scale/ground-anchor procedure used by MatchPlayerRenderer.createPlayer().
  const initialBounds = new THREE.Box3().setFromObject(model);
  const sourceHeight = initialBounds.max.y - initialBounds.min.y;
  if (!Number.isFinite(sourceHeight) || sourceHeight < 0.5) {
    throw new Error("Runtime character bounds are invalid: " + runtimeTemplate.source);
  }
  const gameScale = 1.8 / sourceHeight;
  model.scale.setScalar(gameScale);
  model.position.y = 0;
  model.updateMatrixWorld(true);
  const scaledBounds = new THREE.Box3().setFromObject(model);
  const gameGroundOffset = -scaledBounds.min.y;
  model.position.y += gameGroundOffset;
  model.updateMatrixWorld(true);

  const group = new THREE.Group();
  group.add(model);
  const bones = new Map();
  model.traverse(node => {
    if (node.isBone && node.name) {
      const key = normalize(node.name);
      if (!bones.has(key)) bones.set(key, node);
    }
  });

  const quaternionTracks = clip.tracks.filter(track => /\.quaternion$/i.test(track.name));
  const positionTracks = clip.tracks.filter(track => /\.position$/i.test(track.name));
  const positionTrackDetails = positionTracks.map(track => {
    const stride = track.getValueSize();
    const frames = [];
    for (let i = 0; i < track.values.length; i += stride) {
      frames.push(Array.from(track.values.slice(i, i + stride)).map(v => Number(v.toFixed(5))));
    }
    const sample = fraction => {
      const values = new Float32Array(stride);
      track.createInterpolant(values).evaluate(clip.duration * fraction);
      return Array.from(values).map(v => Number(v.toFixed(5)));
    };
    const componentMin = Array.from({ length: stride }, (_, axis) => Number(Math.min(...frames.map(v => v[axis])).toFixed(5)));
    const componentMax = Array.from({ length: stride }, (_, axis) => Number(Math.max(...frames.map(v => v[axis])).toFixed(5)));
    return {
      track: track.name,
      target: track.name.slice(0, track.name.lastIndexOf(".")),
      normalizedTarget: normalize(track.name.slice(0, track.name.lastIndexOf("."))),
      keyframes: frames.length,
      first: frames[0],
      quarter: sample(0.25),
      middle: sample(0.5),
      threeQuarter: sample(0.75),
      last: frames.at(-1),
      componentMin,
      componentMax,
      firstToLastDelta: frames[0].map((v, axis) => Number((frames.at(-1)[axis] - v).toFixed(5)))
    };
  });
  const selectedTracks = quaternionTracks
    .filter(track => relevantBones.includes(normalize(track.name.slice(0, track.name.lastIndexOf("."))))
    )
    .map(quaternionSummary);

  const mixer = new THREE.AnimationMixer(model);
  const action = mixer.clipAction(clip);
  action.reset().setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  const sampledPoses = [];
  for (const fraction of sampleFractions) {
    mixer.setTime(clip.duration * fraction);
    group.updateMatrixWorld(true);
    const pose = {};
    for (const name of relevantBones) {
      const bone = bones.get(name);
      if (!bone) continue;
      const localPosition = bone.position.clone();
      const modelWorld = bone.getWorldPosition(new THREE.Vector3());
      const gameWorld = modelWorld.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
      const quaternion = bone.getWorldQuaternion(new THREE.Quaternion()).normalize();
      const euler = new THREE.Euler().setFromQuaternion(quaternion, "YXZ");
      pose[name] = {
        localPosition: [localPosition.x, localPosition.y, localPosition.z].map(v => Number(v.toFixed(4))),
        scaledAnchoredModelWorldPosition: [modelWorld.x, modelWorld.y, modelWorld.z].map(v => Number(v.toFixed(4))),
        gameWorldPositionAtYaw90: [gameWorld.x, gameWorld.y, gameWorld.z].map(v => Number(v.toFixed(4))),
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
    binding: { trackCount: binding.trackCount, uniqueTargets: binding.uniqueTargets },
    runtimeModel: runtimeTemplate.source,
    runtimeModelBounds: {
      min: initialBounds.min.toArray().map(v => Number(v.toFixed(4))),
      max: initialBounds.max.toArray().map(v => Number(v.toFixed(4))),
      height: Number(sourceHeight.toFixed(4)),
      gameScaleTo1_8m: Number(gameScale.toFixed(6)),
      scaledBoundsMinYBeforeGroundAnchor: Number(scaledBounds.min.y.toFixed(6)),
      groundAnchorOffset: Number(gameGroundOffset.toFixed(6))
    },
    positionTrackDetails,
    matchedSkeletonBones: relevantBones.filter(name => bones.has(name)),
    missingSkeletonBones: relevantBones.filter(name => !bones.has(name)),
    quaternionTracks: selectedTracks,
    sampledPoses
  });
}

console.log(JSON.stringify({
  result: "RUNTIME_CHARACTER_BONE_ROTATION_AND_GAME_SPACE_POSE_INSPECTION_COMPLETE",
  sampleFractions,
  runtimeModel: { source: runtimeTemplate.source, ...runtimeTemplate.stats },
  coordinateNote: "The animation is bound to the same skinned runtime character used by MatchPlayerRenderer. Positions include the runtime model scale and ground anchor; gameWorldPositionAtYaw90 additionally applies the renderer's +90-degree player-group yaw.",
  clips: report
}, null, 2));
