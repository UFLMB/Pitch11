import * as THREE from "../vendor/three/build/three.module.js";
import { GLTFLoader } from "../vendor/three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "../vendor/three/examples/jsm/utils/SkeletonUtils.js";
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

function kitMaterial(material, meshName, player) {
  const copy = material.clone();
  const label = (String(meshName || "") + " " + String(material.name || "")).toLowerCase();
  const kit = TEAM_KITS[player.team] || TEAM_KITS[0];
  if (!copy.color) return copy;
  if (/jersey|shirt|kit|top/.test(label)) copy.color.setHex(player.role === "GK" ? kit.keeper : kit.shirt);
  else if (/short/.test(label)) copy.color.setHex(kit.shorts);
  else if (/sock/.test(label)) copy.color.setHex(kit.socks);
  else if (/skin|body/.test(label)) copy.color.setHex(player.skinTone);
  else if (/hair/.test(label)) copy.color.setHex(player.hairTone);
  return copy;
}

export class MatchPlayerRenderer {
  constructor(scene, { mobile = false, modelUrl = new URL("../assets/players/player.glb", import.meta.url).href } = {}) {
    this.scene = scene;
    this.mobile = !!mobile;
    this.modelUrl = modelUrl;
    this.loader = new GLTFLoader();
    this.template = null;
    this.animations = [];
    this.players = new Map();
    this.status = "loading";
    this.error = "";
    this.clipCount = 0;
    this.lastAnimationUpdate = 0;
  }

  load() {
    this.status = "loading";
    this.loader.load(this.modelUrl, gltf => {
      const template = gltf.scene;
      template.updateMatrixWorld(true);
      let skinnedMeshes = 0;
      template.traverse(node => { if (node.isSkinnedMesh) skinnedMeshes++; });
      if (!skinnedMeshes) {
        this.status = "invalid-model";
        this.error = "player.glb contains no skinned mesh";
        return;
      }
      this.template = template;
      this.animations = Array.isArray(gltf.animations) ? gltf.animations : [];
      this.clipCount = this.animations.length;
      this.status = "ready";
      this.error = "";
    }, undefined, error => {
      this.status = "missing";
      this.error = error && error.message ? error.message : String(error || "player.glb unavailable");
    });
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
      if (Array.isArray(node.material)) node.material = node.material.map(material => kitMaterial(material, node.name, state));
      else if (node.material) node.material = kitMaterial(node.material, node.name, state);
    });
    group.add(model);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.035, 6, 32),
      new THREE.MeshBasicMaterial({ color: 0xa3e635, transparent: true, opacity: 0.9, depthWrite: false })
    );
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
    if (!this.template || this.status !== "ready") return false;
    const states = mapLegacyPlayers(legacyPlayers, alpha, selectedPlayer);
    const dt = Math.max(0, Math.min(0.05, Number(delta) || 0));
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
      mixer.update(dt);
    }
    return true;
  }

  get ready() { return this.status === "ready" && !!this.template; }
  get count() { return this.players.size; }
  get animatedCount() {
    let count = 0;
    for (const entry of this.players.values()) if (entry.activeAction) count++;
    return count;
  }
}
