import * as THREE from "../vendor/three/build/three.module.js";
import { FBXLoader } from "../vendor/three/examples/jsm/loaders/FBXLoader.js";
import { clone as cloneSkeleton } from "../vendor/three/examples/jsm/utils/SkeletonUtils.js";
import { resolvePlayerAnimationState, resolvePlayerClip, isOneShotAnimationState } from "./player-animation-map.mjs";
import { resolveMixamoClipCandidates, isMixamoClipFile } from "./mixamo-animation-catalog.mjs";
import { mapLegacyPlayers } from "./player-model-state.mjs";
import { normalizeMixamoTrackTargets } from "./mixamo-track-binding.mjs";
import { extractHorizontalRootMotion, flattenHorizontalRootMotion, removeLocomotionRootTranslation, shouldRemoveLocomotionRootTranslation, getHorizontalRootMotionDelta, getHorizontalRootMotionDisplacement, getLocomotionTimeScale, shouldFlattenHorizontalRootMotion } from "./locomotion-animation.mjs";

const CORE_MIXAMO_CLIPS = [
  "offensive idle.fbx",
  "jog forward.fbx",
  "jog backward.fbx",
  "jog strafe left.fbx",
  "jog strafe right.fbx",
  "goalkeeper sidestep.fbx",
  "goalkeeper sidestep (2).fbx"
];
function loadWithTimeout(promise, timeoutMs, label) {
  if (!(timeoutMs > 0)) return promise;
  let timeoutId;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label} load timed out after ${timeoutMs} ms`)), timeoutMs);
    })
  ]).finally(() => clearTimeout(timeoutId));
}

const TEAM_KITS = [
  { shirt: 0x1f6fff, shorts: 0xffffff, socks: 0xffffff, keeper: 0xf2c200 },
  { shirt: 0xe5342b, shorts: 0x1b1b1b, socks: 0x1b1b1b, keeper: 0x27c46b }
];

function kitMaterial(material, meshName, player, cache) {
  const label = (String(meshName || "") + " " + String(material.name || "")).toLowerCase();
  const part = /jersey|shirt|kit|top/.test(label) ? "shirt" : /short/.test(label) ? "shorts" : /sock/.test(label) ? "socks" : /skin|body/.test(label) ? "skin" : /hair/.test(label) ? "hair" : "base";
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

function inspectModelGeometry(root) {
  const meshNames = new Set();
  const materialNames = new Set();
  const kitParts = new Set();
  let meshCount = 0;
  let skinnedMeshCount = 0;
  root.traverse(node => {
    if (!node.isMesh) return;
    meshCount++;
    if (node.isSkinnedMesh) skinnedMeshCount++;
    if (node.name) {
      meshNames.add(node.name);
      const name = node.name.toLowerCase();
      if (/shirt|jersey|kit|top/.test(name)) kitParts.add("shirt");
      if (/short/.test(name)) kitParts.add("shorts");
      if (/sock/.test(name)) kitParts.add("socks");
      if (/body|skin/.test(name)) kitParts.add("body");
      if (/hair/.test(name)) kitParts.add("hair");
      if (/shoe|boot/.test(name)) kitParts.add("shoes");
    }
    for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
      if (material?.name) materialNames.add(material.name);
    }
  });
  return {
    meshCount,
    skinnedMeshCount,
    meshNames: [...meshNames].sort(),
    materialNames: [...materialNames].sort(),
    kitParts: [...kitParts].sort()
  };
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
    modelLoadTimeoutMs = 0,
    castShadows = false
  } = {}) {
    this.scene = scene;
    this.mobile = !!mobile;
    this.groundHeight = 0;
    this.modelUrl = modelUrl;
    this.modelLoadTimeoutMs = Math.max(0, Number(modelLoadTimeoutMs) || 0);
    this.castShadows = !!castShadows;
    this.fbxLoader = new FBXLoader();
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
    this.modelDiagnostics = { meshCount: 0, skinnedMeshCount: 0, meshNames: [], materialNames: [], kitParts: [] };
    this.inputPlayerCount = 0;
    this.visiblePlayerCount = 0;
    this.boneNames = new Set();
  }

  async load() {
    this.status = "loading-mixamo-model";
    this.error = "";
    try {
      const fbxRequest = this.fbxLoader.loadAsync(this.modelUrl);
      let fbx;
      if (this.modelLoadTimeoutMs > 0) {
        let timeoutId;
        try {
          fbx = await Promise.race([
            fbxRequest,
            new Promise((_, reject) => {
              timeoutId = setTimeout(() => reject(new Error(
                `Mixamo FBX load timed out after ${this.modelLoadTimeoutMs} ms`
              )), this.modelLoadTimeoutMs);
            })
          ]);
        } finally {
          clearTimeout(timeoutId);
        }
      } else {
        fbx = await fbxRequest;
      }
      fbx.updateMatrixWorld(true);
      const stats = inspectSkinnedModel(fbx);
      if (!stats.skinnedMeshes) throw new Error("Mixamo character FBX contains no skinned mesh");
      if (!stats.boneNames.size) throw new Error("Mixamo character FBX contains no named bones");
      this.template = fbx;
      this.modelSource = "mixamo-fbx";
      this.modelTriangleCount = stats.triangleCount;
      this.modelDiagnostics = inspectModelGeometry(fbx);
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
      this.status = "asset-error";
      this.error = this.mixamoError;
      return;
    }
  }

  async loadMixamoClip(file) {
    if (!isMixamoClipFile(file)) throw new Error(`Unknown Mixamo clip: ${file}`);
    if (this.clipCache.has(file)) return this.clipCache.get(file);
    if (this.clipPromises.has(file)) return this.clipPromises.get(file);
    if (this.failedClips.has(file)) throw new Error(this.failedClips.get(file));
    const promise = (async () => {
      const url = new URL(`../input/player-package/${encodeURIComponent(file)}`, import.meta.url).href;
      const source = await loadWithTimeout(this.fbxLoader.loadAsync(url), this.modelLoadTimeoutMs, `Mixamo animation ${file}`);
      const sourceClip = source.animations?.[0];
      if (!sourceClip) throw new Error("FBX contains no animation clip");
      const binding = validateDirectMixamoClip(this.template, sourceClip);
      const clip = binding.clip;
      clip.name = file.replace(/\.fbx$/i, "");
      // The simulation owns horizontal player movement for every animation.
      // Keeper sidesteps are the sole exception: extract their displacement
      // for one-time engine application and neutralize the mixer track.
      // One-shot action clips retain their authored translation channels.
      if (shouldRemoveLocomotionRootTranslation(file)) {
        // Lock Root/Hips translation to the rig bind pose. This prevents
        // root/pelvis drift and cross-fade pops while simulation owns movement.
        removeLocomotionRootTranslation(clip);
      } else if (/^goalkeeper sidestep(?: \(2\))?\.fbx$/i.test(file)) {
        extractHorizontalRootMotion(clip);
      } else if (shouldFlattenHorizontalRootMotion(file)) {
        flattenHorizontalRootMotion(clip);
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

  async preloadGoalkeeperTestClips() {
    const files = [
      "gk_catch-middle-head_height.fbx",
      "gk_catch-middle-jump-above_head_height.fbx",
      "gk_catch-middle-rolling_ball_pickup.fbx",
      "gk_catch-middle-stomach_height.fbx",
      "gk_catch-middle_2_steps_forward_jump-above_head_height.fbx",
      "gk_dive-high_shot-left-ball_in_hand.fbx",
      "gk_dive-high_shot-right-ball_in_hand.fbx",
      "gk_dive-middle_shot-left-ball_in_hand.fbx",
      "gk_dive-middle_shot-right-ball_in_hand.fbx",
      "gk_dive-low_shot-left-ball_not_in_hand.fbx",
      "gk_dive-low_shot-right-ball_not_in_hand.fbx"
    ];
    const supportStates = [
      ["keeperSet", 0], ["keeperPenaltyReady", 0], ["keeperMove", 0],
      ["keeperPass", 0], ["keeperDropKick", 0], ["getUp", 0]
    ];
    const results = await Promise.allSettled([
      ...files.map(file => this.loadMixamoClip(file)),
      ...supportStates.map(([state, playerId]) => this.ensureMixamoState(state, playerId))
    ]);
    return results.map((result, index) => ({
      state: index < files.length ? files[index] : supportStates[index - files.length][0],
      ok: result.status === "fulfilled" && !!result.value,
      clip: result.status === "fulfilled" && result.value ? result.value.name : "",
      error: result.status === "rejected" ? result.reason?.message || String(result.reason) : ""
    }));
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
      node.castShadow = this.castShadows;
      node.receiveShadow = this.castShadows;
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
    const bones = new Map();
    model.traverse(node => {
      if (!node.isBone || !node.name) return;
      const key = node.name
        .replace(/_\$AssimpFbx\$_(Translation|Rotation|Scaling)$/i, "")
        .replace(/^mixamorig:/i, "")
        .replace(/[\s_]/g, "")
        .replace(/[^a-z0-9]/gi, "")
        .replace(/^mixamorig\d*/i, "")
        .toLowerCase();
      if (!bones.has(key)) bones.set(key, node);
    });
    const entry = { group, model, bones, mixer, ring, activeAction: null, activeClipName: "", activeManualClipToken: -1, state: "", rootMotionAction: null, rootMotionLastTime: null, rootMotionPendingDelta: { x: 0, z: 0 }, rootMotionPendingDuration: 0 };
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
        if (state.manualClipFile) {
          clip = this.clipCache.get(state.manualClipFile) || null;
          if (!clip) this.loadMixamoClip(state.manualClipFile).catch(() => {});
        } else {
          const candidates = resolveMixamoClipCandidates(animationState, state.id);
          clip = candidates.map(file => this.clipCache.get(file)).find(Boolean) || null;
          if (!clip) this.ensureMixamoState(animationState, state.id);
        }
      } else {
        clip = resolvePlayerClip(this.animations, animationState);
      }

      if (clip && (entry.activeClipName !== clip.name || entry.state !== animationState || (state.manualClipFile && entry.activeManualClipToken !== state.manualClipToken))) {
        const nextAction = mixer.clipAction(clip);
        nextAction.reset();
        if (isOneShotAnimationState(animationState)) {
          nextAction.setLoop(THREE.LoopOnce, 1);
          nextAction.clampWhenFinished = true;
        } else {
          nextAction.setLoop(THREE.LoopRepeat, Infinity);
          nextAction.clampWhenFinished = false;
        }
        nextAction.fadeIn(0.16).play();
        if (entry.activeAction) entry.activeAction.crossFadeTo(nextAction, 0.16, false);
        entry.activeAction = nextAction;
        entry.rootMotionAction = null;
          entry.rootMotionLastTime = null;
          entry.rootMotionPendingDelta = { x: 0, z: 0 };
          entry.rootMotionPendingDuration = 0;
        entry.activeClipName = clip.name;
        entry.activeManualClipToken = state.manualClipToken;
        entry.state = animationState;
      }
      if (entry.activeAction && ["walk", "run", "sprint"].includes(animationState)) {
        entry.activeAction.timeScale = getLocomotionTimeScale(animationState, state.speed);
      }
      if (updateAnimations) {
        mixer.update(animationDelta);
        const action = entry.activeAction;
        const activeClip = action?.getClip?.();
        if (activeClip?.userData?.rootMotionExtracted && activeClip.userData.rootMotion) {
          const previousTime = entry.rootMotionAction === action ? entry.rootMotionLastTime : NaN;
          const localDelta = getHorizontalRootMotionDelta(activeClip, previousTime, action.time);
          entry.rootMotionAction = action;
          entry.rootMotionLastTime = action.time;
          const worldDelta = new THREE.Vector3(localDelta.x * entry.model.scale.x, 0, localDelta.z * entry.model.scale.z).applyQuaternion(group.quaternion);
          const weight = action.getEffectiveWeight();
          entry.rootMotionPendingDelta.x += worldDelta.x * weight;
          entry.rootMotionPendingDelta.z += worldDelta.z * weight;
          entry.rootMotionPendingDuration += animationDelta;
        } else {
          entry.rootMotionAction = null;
          entry.rootMotionLastTime = null;
          entry.rootMotionPendingDelta = { x: 0, z: 0 };
          entry.rootMotionPendingDuration = 0;
        }
      }
    }
    return true;
  }

  consumeRootMotionDelta(deltaTime, playerId = 0) {
    const entry = this.players.get(playerId);
    if (!entry) return { x: 0, z: 0 };
    const duration = Math.max(0, entry.rootMotionPendingDuration || 0);
    const elapsed = Math.min(duration, Math.max(0, Number(deltaTime) || 0));
    if (duration <= 1e-8 || elapsed <= 0) return { x: 0, z: 0 };
    const fraction = elapsed / duration;
    const delta = { x: entry.rootMotionPendingDelta.x * fraction, z: entry.rootMotionPendingDelta.z * fraction };
    entry.rootMotionPendingDelta.x -= delta.x;
    entry.rootMotionPendingDelta.z -= delta.z;
    entry.rootMotionPendingDuration = Math.max(0, duration - elapsed);
    if (entry.rootMotionPendingDuration <= 1e-8) {
      entry.rootMotionPendingDuration = 0;
      entry.rootMotionPendingDelta = { x: 0, z: 0 };
    }
    return delta;
  }

  getRootMotionWorldDisplacement(file, playerId = 0) {
    const clip = this.clipCache.get(file);
    const entry = this.players.get(playerId);
    if (!clip?.userData?.rootMotionExtracted || !entry) return null;
    const local = getHorizontalRootMotionDisplacement(clip);
    const world = new THREE.Vector3(local.x * entry.model.scale.x, 0, local.z * entry.model.scale.z).applyQuaternion(entry.group.quaternion);
    return { x: world.x, z: world.z };
  }

  get ready() { return this.status === "ready" && !!this.template; }
  get loadedClipNames() { return [...this.clipCache.keys()].map(file => file.replace(/\.fbx$/i, "")).sort(); }
  get failedClipNames() { return [...this.failedClips.entries()].map(([file, error]) => ({ file, error })); }
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
