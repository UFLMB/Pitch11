import * as THREE from "../vendor/three/build/three.module.js";
import { GLTFLoader } from "../vendor/three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "../vendor/three/examples/jsm/utils/SkeletonUtils.js";
import { MeshoptDecoder } from "../vendor/three/examples/jsm/libs/meshopt_decoder.module.js";
import { resolvePlayerAnimationState, resolvePlayerClip } from "./player-animation-map.mjs";
import { mapLegacyPlayers } from "./player-model-state.mjs";

const ONE_SHOT_STATES = new Set([
  "pass", "shot", "tackle", "slide", "jump", "fall", "getUp", "celebrate",
  "keeperDiveLeft", "keeperDiveRight", "keeperCatch", "keeperParry"
]);
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

export class MatchPlayerRenderer {
  constructor(scene, { mobile = false, modelUrl = new URL("../assets/players/player.glb", import.meta.url).href } = {}) {
    this.scene = scene;
    this.mobile = !!mobile;
    this.modelUrl = modelUrl;
    this.loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    this.template = null;
    this.animations = [];
    this.players = new Map();
    this.status = "loading";
    this.error = "";
    this.clipCount = 0;
    this.lastAnimationUpdate = 0;
    this.animationAccumulator = 0;
    this.animationHz = this.mobile ? 20 : 30;
    this.materialVariants = new Map();
    this.ringGeometry = new THREE.TorusGeometry(0.62, 0.035, 6, 32);
    this.ringMaterial = new THREE.MeshBasicMaterial({ color: 0xa3e635, transparent: true, opacity: 0.9, depthWrite: false });
    this.modelTriangleCount = 0;
    this.inputPlayerCount = 0;
    this.visiblePlayerCount = 0;
  }

  async load() {
    this.status = "loading-model";
    this.error = "";
    try {
      const gltf = await this.loader.loadAsync(this.modelUrl);
      const template = gltf.scene;
      template.updateMatrixWorld(true);
      let skinnedMeshes = 0;
      let triangleCount = 0;
      template.traverse(node => {
        if (node.isSkinnedMesh) skinnedMeshes++;
        if (node.isMesh && node.geometry) {
          const geometry = node.geometry;
          const indexCount = geometry.index ? geometry.index.count : geometry.attributes.position?.count || 0;
          triangleCount += Math.floor(indexCount / 3);
        }
      });
      if (!skinnedMeshes) throw new Error("player.glb contains no skinned mesh");
      this.template = template;
      this.modelTriangleCount = triangleCount;

      // The skinned player body is the required asset. Animation clips are
      // optional: a missing or incompatible clip must never hide all players.
      this.status = "loading-animations";
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
      this.error = animationErrors.join("; ");
      this.status = "ready";
    } catch (error) {
      this.template = null;
      this.animations = [];
      this.clipCount = 0;
      this.status = "asset-error";
      this.error = error && error.message ? error.message : String(error || "Player model unavailable");
    }
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
    model.position.y = -bounds.min.y * scale;
    model.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = false;
      node.receiveShadow = false;
      node.frustumCulled = true;
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

  update(legacyPlayers, selectedPlayer, alpha = 1, delta = 1 / 60) {
    const states = mapLegacyPlayers(legacyPlayers, alpha, selectedPlayer);
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
      group.position.set(state.x, 0, state.z);
      const targetYaw = -state.facing - Math.PI / 2;
      const angleDelta = Math.atan2(Math.sin(targetYaw - group.rotation.y), Math.cos(targetYaw - group.rotation.y));
      group.rotation.y += angleDelta * (1 - Math.exp(-12 * Math.max(dt, 1 / 120)));
      ring.visible = state.selected;

      const animationState = resolvePlayerAnimationState({ role: state.role, action: state.action }, state.speed);
      const clip = resolvePlayerClip(this.animations, animationState);
      if (clip && entry.activeClipName !== clip.name) {
        const nextAction = mixer.clipAction(clip);
        nextAction.reset();
        const isLocomotionFallback = ["Idle", "Walk", "Run"].includes(clip.name);
        if (ONE_SHOT_STATES.has(animationState) && !isLocomotionFallback) {
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
