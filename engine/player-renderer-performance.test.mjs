import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("player animation mixers are capped for mobile and desktop", () => {
  const renderer = read("./match-player-renderer.mjs");
  assert.ok(renderer.includes("this.animationHz = this.mobile ? 20 : 30"));
  assert.ok(renderer.includes("this.animationAccumulator += dt"));
  assert.ok(renderer.includes("if (updateAnimations) {"));
  assert.ok(renderer.includes("mixer.update(animationDelta)"));
  assert.ok(renderer.includes("entry.rootMotionPendingDelta.x += worldDelta.x * weight"));
  assert.ok(renderer.includes("entry.rootMotionPendingDuration += animationDelta"));
  assert.ok(renderer.includes("consumeRootMotionDelta(deltaTime, playerId = 0)"));
});

test("player material variants and selection ring resources are shared", () => {
  const renderer = read("./match-player-renderer.mjs");
  assert.ok(renderer.includes("this.materialVariants = new Map()"));
  assert.ok(renderer.includes("cache.get(key)"));
  assert.ok(renderer.includes("cache.set(key, copy)"));
  assert.ok(renderer.includes("/skin|body/.test(label)"));
  assert.ok(renderer.includes("function inspectModelGeometry(root)"));
  assert.ok(renderer.includes("async preloadGoalkeeperTestClips()"));
  assert.ok(renderer.includes("new THREE.Mesh(this.ringGeometry, this.ringMaterial)"));
  assert.equal((renderer.match(/new THREE\.TorusGeometry/g) || []).length, 1);
});

test("optimized GLB asset contract defines mobile-conscious geometry and texture budgets", () => {
  const readme = read("../assets/players/README.md");
  assert.ok(readme.includes("8,000–12,000 triangles"));
  assert.ok(readme.includes("80 named joints"));
  assert.ok(readme.includes("Four embedded 1024 px PBR textures"));
  assert.ok(readme.includes("20 Hz on mobile and 30 Hz on desktop"));
  const workflow = read("../.github/workflows/static.yml");
  assert.ok(workflow.includes("test -s assets/players/player.glb"));
  assert.ok(workflow.includes('test "$(head -c 4 assets/players/player.glb)" = "glTF"'));
  assert.ok(!workflow.includes("https://models.codelove.in/models/sports-male-02.glb"));
  assert.ok(workflow.includes("m_idle_neutral_01.glb"));
  assert.ok(workflow.includes("m_walk_neutral_01.glb"));
  assert.ok(workflow.includes("m_run_neutral_01.glb"));
  assert.ok(workflow.includes("node scripts/validate-player-assets.mjs"));
});


test("3D match runtime keeps goalkeepers facing the live ball and corrects the shared GLB forward axis", () => {
  const runtime = read("./simulation-lab.mjs");
  assert.ok(runtime.includes('p.role === "GK"'));
  assert.ok(runtime.includes("snapshot.ball.y - p.y"));
  assert.ok(runtime.includes("snapshot.ball.x - p.x"));
  assert.ok(runtime.includes("model.rotation.y = Math.PI"));
  assert.ok(runtime.includes("group.rotation.y += yawDelta"));
});

test("3D match runtime enables mobile antialiasing, higher resolution and player shadows", () => {
  const runtime = read("./simulation-lab.mjs");
  assert.ok(runtime.includes("antialias: true"));
  assert.ok(runtime.includes("mobile ? 1.5 : 2"));
  assert.ok(runtime.includes("renderer.shadowMap.enabled = true"));
  assert.ok(runtime.includes("THREE.PCFSoftShadowMap"));
  assert.ok(runtime.includes("keyLight.castShadow = true"));
  assert.ok(runtime.includes("pitch.receiveShadow = true"));
  assert.ok(runtime.includes("node.castShadow = true"));
});
