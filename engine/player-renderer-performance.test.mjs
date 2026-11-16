import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("player animation mixers are capped for mobile and desktop", () => {
  const renderer = read("./match-player-renderer.mjs");
  assert.ok(renderer.includes("this.animationHz = this.mobile ? 20 : 30"));
  assert.ok(renderer.includes("this.animationAccumulator += dt"));
  assert.ok(renderer.includes("if (updateAnimations) mixer.update(animationDelta)"));
});

test("player material variants and selection ring resources are shared", () => {
  const renderer = read("./match-player-renderer.mjs");
  assert.ok(renderer.includes("this.materialVariants = new Map()"));
  assert.ok(renderer.includes("cache.get(key)"));
  assert.ok(renderer.includes("cache.set(key, copy)"));
  assert.ok(renderer.includes("new THREE.Mesh(this.ringGeometry, this.ringMaterial)"));
  assert.equal((renderer.match(/new THREE\.TorusGeometry/g) || []).length, 1);
});

test("optimized GLB asset contract defines mobile-conscious geometry and texture budgets", () => {
  const readme = read("../assets/players/README.md");
  assert.ok(readme.includes("8,000–12,000 triangles"));
  assert.ok(readme.includes("80 named joints"));
  assert.ok(readme.includes("1024×1024 texture atlas"));
  assert.ok(readme.includes("20 Hz on mobile and 30 Hz on desktop"));
  const workflow = read("../.github/workflows/static.yml");
  assert.ok(workflow.includes("https://models.codelove.in/models/sports-male-02.glb"));
  assert.ok(workflow.includes("m_idle_neutral_01.glb"));
  assert.ok(workflow.includes("m_walk_neutral_01.glb"));
  assert.ok(workflow.includes("m_run_neutral_01.glb"));
  assert.ok(workflow.includes("node scripts/validate-player-assets.mjs"));
});
