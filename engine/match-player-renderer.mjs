import * as THREE from "../vendor/three/build/three.module.js";
import { GLTFLoader } from "../vendor/three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "../vendor/three/examples/jsm/loaders/FBXLoader.js";
import { clone as cloneSkeleton } from "../vendor/three/examples/jsm/utils/SkeletonUtils.js";
import { MeshoptDecoder } from "../vendor/three/examples/jsm/libs/meshopt_decoder.module.js";
import { resolvePlayerAnimationState, resolvePlayerClip } from "./player-animation-map.mjs";
import { resolveMixamoClipCandidates, isMixamoClipFile } from "./mixamo-animation-catalog.mjs";
import { mapLegacyPlayers } from "./player-model-state.mjs";
import { normalizeMixamoTrackTargets } from "./mixamo-track-binding.mjs";

const ONE_SHOT_STATES = new Set([
  "receive", "pass", "shot", "shotHigh", "tackle", "slide", "jump", "fall", "getUp", "throwIn",
  "keeperDiveLeft", "keeperDiveRight", "keeperCatch", "keeperParry", "keeperScoop", "keeperMiss", "keeperPass",
  "keeperDropKick", "keeperThrow", "keeperPlace"
]);
const CORE_MIXAMO_CLIPS = [
  "offensive idle.fbx",
  "jog forward.fbx",
  "jog backward.fbx",
  "jog strafe left.fbx",
  "jog strafe right.fbx"
];
const TEAM_KITS = [
  { shirt: 0x1f6fff, shorts: 0xffffff, socks: 0xffffff, keeper: 0xf2c200 },
  { shirt: 0xe5342b, shorts: 0x1b1b1b, socks: 0x1b1b1b, keeper: 0x27c46b }
];

function kitMaterial(material, meshName, player, cache) {
  const label = (String(meshName || "") + " " + String(material.name || "")).toLowerCase();
  const part = /jersey|shirt|kit|top/.test(label) ? "shirt" : /short/.test(label) ? "shorts" : /sock/.test(label) ? "socks" : /skin/.test(label) ? "skin" : /hair/.test(label) ? "hair" : "base";
  const variant = part === "shirt" ? (player.role === "GK" ? "keeper" : "shirt") : part;
  const teamKey = ["shirt", "shorts", "socks"].includes(part) ? player.team : 0;
  const toneKey = part === "skin" ? player.skinTone : part === "hair" ? player.hairTone : 0;
  const key = [material.uuid, variant, teamKey, toneKey].join(":");
  if (cache.has(key)) return cache.get(key);
  const copy = material.clone();
  const kit = TEAM_KITS[player.team] || TEAM_KITS[0];
  if (copy.color) {
    if (part === "shirt") copy.color.setHex(player.role === "GK" ? kit.keeper : kit.shirt);
    else if (part === "shorts") copy.color.setHex(kit.shorts);
    else if (part === "socks") copy.color.setHex(kit.socks);
    else if (part === "skin") copy.color.setHex(player.skinTone);
    else if (part === "hair") copy.color.setHex(player.hairTone);
  }
  cache.set(key, copy);
  return copy;
}

function inspectSkinnedModel(root) {
  let skinnedMeshes = 0;
  let triangleCount = 0;
  const boneNames = new Set();
  root.traverse(node => {
    if (node.isSkinnedMesh) skinnedMeshes++;
    if (node.isBone && node.name) boneNames.add(node.name);
    if (node.isMesh && node.geometry) {
      const geometry = node.geometry;
      const indexCount = geometry.index ? geometry.index.count : geometry.attributes.position?.count || 0;
      triangleCount += Math.floor(indexCount / 3);
    }
  });
  return { skinnedMeshes, triangleCount, boneNames };
}

export function validateDirectMixamoClip(root, sourceClip) {
  const boneNames = [];
  root.traverse(node => { if (node.isBone && node.name) boneNames.push(node.name); });
  const normalized = normalizeMixamoTrackTargets(boneNames, sourceClip?.tracks);
  if (!normalized.trackCount) throw new Error("FBX contains no animation tracks");
  if (normalized.unresolved.length || normalized.ambiguous.length) {
    const detail = [
      normalized.unresolved.length ? normalized.unresolved.length + " unresolved" : "",
      normalized.ambiguous.length ? normalized.ambiguous.length + " ambiguous" : ""
    ].filter(Boolean).join(", ");
    throw new Error(`Direct Mixamo bone binding failed: ${detail}`);
  }
  return {
    clip: new THREE.AnimationClip(sourceClip.name, sourceClip.duration, normalized.tracks),
    trackCount: normalized.trackCount,
    uniqueTargets: normalized.uniqueTargets
  };
}

export class MatchPlayerRenderer {
  constructor(scene, {
    mobile = false,
    modelUrl = new URL("../input/player-model-candidate/character.fbx", import.meta.url).href,
    fallbackModelUrl = new URL("../assets/players/player.glb", import.meta.url).href
  } = {}) {
    this.scene = scene;
    this.mobile = !!mobile;
    this.groundHeight = 0;
    this.modelUrl = modelUrl;
    this.fallbackModelUrl = fallbackModelUrl;
    this.fbxLoader = new FBXLoader();
    this.loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    this.template = null;
    this.animations = [];
    this.players = new Map();
    this.status = "loading";
    this.error = "";
    this.mixamoError = "";
    this.modelSource = "";
    this.clipCount = 0;
    this.clipCache = new Map();
    this.clipPromises = new Map();
    this.failedClips = new Map();
    this.pendingStates = new Map();
    this.lastAnimationUpdate = 0;
    this.animationAccumulator = 0;
    this.animationHz = this.mobile ? 20 : 30;
    this.materialVariants = new Map();
    this.ringGeometry = new THREE.TorusGeometry(0.62, 0.035, 6, 32);
    this.ringMaterial = new THREE.MeshBasicMaterial({ color: 0xa3e635, transparent: true, opacity: 0.9, depthWrite: false });
    this.modelTriangleCount = 0;
    this.inputPlayerCount = 0;
    this.visiblePlayerCount = 0;
    this.boneNames = new Set();
  }

  async load() {
    this.status = "loading-mixamo-model";
    this.error = "";
    try {
      const fbx = await this.fbxLoader.loadAsync(this.modelUrl);
      fbx.updateMatrixWorld(true);
      const stats = inspectSkinnedModel(fbx);
      if (!stats.skinnedMeshes) throw new Error("Mixamo character FBX contains no skinned mesh");
      if (!stats.boneNames.size) throw new Error("Mixamo character FBX contains no named bones");
      this.template = fbx;
      this.modelSource = "mixamo-fbx";
      this.modelTriangleCount = stats.triangleCount;
      this.boneNames = stats.boneNames;
      this.status = "loading-mixamo-animations";
      const results = await Promise.allSettled(CORE_MIXAMO_CLIPS.map(file => this.loadMixamoClip(file)));
      const failures = results.flatMap((result, index) => result.status === "rejected" ? [`${CORE_MIXAMO_CLIPS[index]}: ${result.reason?.message || String(result.reason)}`] : []);
      this.clipCount = this.clipCache.size;
      this.error = failures.join("; ");
      this.status = "ready";
      return;
    } catch (error) {
      this.mixamoError = error?.message || String(error || "Mixamo character unavailable");
      this.template = null;
      this.animations = [];
      this.clipCache.clear();
      this.clipPromises.clear();
      this.failedClips.clear();
    }

    this.status = "loading-fallback-model";
    try {
      const gltf = await this.loader.loadAsync(this.fallbackModelUrl);
      const template = gltf.scene;
      template.updateMatrixWorld(true);
      const stats = inspectSkinnedModel(template);
      if (!stats.skinnedMeshes) throw new Error("Fallback player.glb contains no skinned mesh");
      this.template = template;
      this.modelSource = "legacy-glb-fallback";
      this.modelTriangleCount = stats.triangleCount;
      this.boneNames = stats.boneNames;
      this.status = "loading-fallback-animations";
      const clipFiles = [
        { name: "Idle", url: new URL("../assets/players/idle.glb", import.meta.url).href },
        { name: "Walk", url: new URL("../assets/players/walk.glb", import.meta.url).href },
        { name: "Run", url: new URL("../assets/players/run.glb", import.meta.url).href }
      ];
      const clipResults = await Promise.allSettled(clipFiles.map(async source => {
        const clipAsset = await this.loader.loadAsync(source.url);
        const sourceClip = clipAsset.animations?.[0];
        if (!sourceClip) throw new Error(`${source.name} animation file contains no animation clip`);
        const clip = sourceClip.clone();
        clip.name = source.name;
        return clip;
      }));
      this.animations = [];
      const animationErrors = [];
      clipResults.forEach((result, index) => {
        if (result.status === "fulfilled") this.animations.push(result.value);
        else animationErrors.push(`${clipFiles[index].name}: ${result.reason?.message || String(result.reason)}`);
      });
      this.clipCount = this.animations.length;
      this.error = [this.mixamoError, ...animationErrors].filter(Boolean).join("; ");
      this.status = "ready";
    } catch (error) {
      this.template = null;
      this.animations = [];
      this.clipCount = 0;
      this.status = "asset-error";
      this.error = [this.mixamoError, error?.message || String(error || "Player model unavailable")].filter(Boolean).join("; ");
    }
  }

  async loadMixamoClip(file) {
    if (!isMixamoClipFile(file)) throw new Error(`Unknown Mixamo clip: ${file}`);
    if (this.clipCache.has(file)) return this.clipCache.get(file);
    if (this.clipPromises.has(file)) return this.clipPromises.get(file);
    if (this.failedClips.has(file)) throw new Error(this.failedClips.get(file));
    const promise = (async () => {
      const url = new URL(`../input/player-package/${encodeURIComponent(file)}`, import.meta.url).href;
      const source = await this.fbxLoader.loadAsync(url);
      const sourceClip = source.animations?.[0];
      if (!sourceClip) throw new Error("FBX contains no animation clip");
      const binding = validateDirectMixamoClip(this.template, sourceClip);
      const clip = binding.clip;
      clip.name = file.replace(/\.fbx$/i, "");
      // Match movement to the simulation's player transform: locomotion clips animate
      // the gait in place, rather than translating the skeleton and then snapping on loop.
      if (/^(jog forward|jog backward|jog strafe left|jog strafe right)\.fbx$/i.test(file)) {
        for (const track of clip.tracks) {
          if (!/\.position$/i.test(track.name)) continue;
          const bone = track.name.slice(0, track.name.lastIndexOf(".")).replace(/[\s_]/g, "").toLowerCase();
          if (!/(mixamorig)?hips$/.test(bone) && !/(mixamorig)?root$/.test(bone)) continue;
          const values = track.values;
          if (!values || values.length < 3) continue;
          const x = values[0];
          const z = values[2];
          for (let i = 0; i + 2 < values.length; i += 3) {
            values[i] = x;
            values[i + 2] = z;
          }
        }
      }
      clip.userData = { ...(clip.userData || {}), sourceFile: file, directBinding: binding };
      this.clipCache.set(file, clip);
      this.animations.push(clip);
      this.clipCount = this.clipCache.size;
      return clip;
    })();
    this.clipPromises.set(file, promise);
    try {
      return await promise;
    } catch (error) {
      const message = error?.message || String(error);
      this.failedClips.set(file, message);
      throw error;
    } finally {
      this.clipPromises.delete(file);
    }
  }

  ensureMixamoState(state, playerId) {
    const key = `${state}:${playerId}`;
    if (this.pendingStates.has(key)) return this.pendingStates.get(key);
    const promise = (async () => {
      const candidates = resolveMixamoClipCandidates(state, playerId);
      for (const file of candidates) {
        if (this.clipCache.has(file)) return this.clipCache.get(file);
        if (this.failedClips.has(file)) continue;
        try {
          return await this.loadMixamoClip(file);
        } catch {}
      }
      return null;
    })();
    this.pendingStates.set(key, promise);
    promise.finally(() => this.pendingStates.delete(key));
    return promise;
  }

  createPlayer(state) {
    if (!this.template) return null;
    const group = new THREE.Group();
    const model = cloneSkeleton(this.template);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const height = bounds.max.y - bounds.min.y;
    if (!Number.isFinite(height) || height < 0.5) return null;
    const scale = 1.8 / height;
    model.scale.setScalar(scale);
    // Recompute bounds after applying scale, then anchor the actual mesh bottom to y=0.
    // This avoids relying on FBX source-space bounds, which may include root transforms.
    model.position.y = 0;
    model.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(model);
    model.position.y -= scaledBounds.min.y;
    model.updateMatrixWorld(true);
    model.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = false;
      node.receiveShadow = false;
      node.frustumCulled = false;
      if (Array.isArray(node.material)) node.material = node.material.map(material => kitMaterial(material, node.name, state, this.materialVariants));
      else if (node.material) node.material = kitMaterial(node.material, node.name, state, this.materialVariants);
    });
    group.add(model);

    const ring = new THREE.Mesh(this.ringGeometry, this.ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.025;
    ring.visible = false;
    group.add(ring);

    const mixer = new THREE.AnimationMixer(model);
    const entry = { group, mixer, ring, activeAction: null, activeClipName: "", state: "" };
    this.scene.add(group);
    this.players.set(state.id, entry);
    return entry;
  }

  setGroundHeight(value) {
    this.groundHeight = Number.isFinite(value) ? value : 0;
  }

  update(legacyPlayers, selectedPlayer, alpha = 1, delta = 1 / 60, context = {}) {
    const states = mapLegacyPlayers(legacyPlayers, alpha, selectedPlayer, context.ballOwner || null, context.restart || null);
    this.inputPlayerCount = states.length;
    this.visiblePlayerCount = states.reduce((count, state) => count + (state.visible ? 1 : 0), 0);
    if (!this.template || this.status !== "ready") return false;
    const dt = Math.max(0, Math.min(0.05, Number(delta) || 0));
    this.animationAccumulator += dt;
    const animationStep = 1 / this.animationHz;
    const updateAnimations = this.animationAccumulator >= animationStep;
    const animationDelta = updateAnimations ? this.animationAccumulator : 0;
    if (updateAnimations) {
      this.animationAccumulator %= animationStep;
      this.lastAnimationUpdate = (this.lastAnimationUpdate || 0) + 1;
    }
    for (const state of states) {
      let entry = this.players.get(state.id);
      if (!entry) entry = this.createPlayer(state);
      if (!entry) continue;

      const { group, mixer, ring } = entry;
      group.visible = state.visible;
      group.position.set(state.x, this.groundHeight, state.z);
      const targetYaw = -state.facing + Math.PI / 2;
      const angleDelta = Math.atan2(Math.sin(targetYaw - group.rotation.y), Math.cos(targetYaw - group.rotation.y));
      group.rotation.y += angleDelta * (1 - Math.exp(-12 * Math.max(dt, 1 / 120)));
      ring.visible = state.selected;

      const animationState = resolvePlayerAnimationState({ role: state.role, action: state.action }, state.speed);
      let clip = null;
      if (this.modelSource === "mixamo-fbx") {
        const candidates = resolveMixamoClipCandidates(animationState, state.id);
        clip = candidates.map(file => this.clipCache.get(file)).find(Boolean) || null;
        if (!clip) this.ensureMixamoState(animationState, state.id);
      } else {
        clip = resolvePlayerClip(this.animations, animationState);
      }

      if (clip && entry.activeClipName !== clip.name) {
        const nextAction = mixer.clipAction(clip);
        nextAction.reset();
        if (ONE_SHOT_STATES.has(animationState)) {
          nextAction.setLoop(THREE.LoopOnce, 1);
          nextAction.clampWhenFinished = true;
        } else {
          nextAction.setLoop(THREE.LoopRepeat, Infinity);
          nextAction.clampWhenFinished = false;
        }
        nextAction.fadeIn(0.16).play();
        if (entry.activeAction) entry.activeAction.crossFadeTo(nextAction, 0.16, false);
        entry.activeAction = nextAction;
        entry.activeClipName = clip.name;
        entry.state = animationState;
      }
      if (entry.activeAction && ["walk", "run", "sprint"].includes(animationState)) {
        entry.activeAction.timeScale = animationState === "walk" ? 0.72 : animationState === "sprint" ? 1.28 : 1;
      }
      if (updateAnimations) mixer.update(animationDelta);
    }
    return true;
  }

  get ready() { return this.status === "ready" && !!this.template; }
  get count() { return this.players.size; }
  get expectedCount() { return this.inputPlayerCount; }
  get visibleCount() { return this.visiblePlayerCount; }
  get animatedCount() {
    let count = 0;
    for (const entry of this.players.values()) if (entry.activeAction) count++;
    return count;
  }
  get triangleCount() { return this.modelTriangleCount * this.players.size; }
  get animationUpdateRate() { return this.animationHz; }
}
