import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("Three.js runtime is loaded from the same origin in every 3D entry point", () => {
  const lab = read("./simulation-lab.mjs");
  const stadium = read("../stadium-runtime.js");
  const graphics = read("../graphics3d.html");
  const index = read("../index.html");

  assert.match(lab, /from ["']\.\.\/vendor\/three\/build\/three\.module\.js["']/);
  assert.match(stadium, /from ["']\.\/vendor\/three\/build\/three\.module\.js["']/);
  assert.match(stadium, /from ["']\.\/vendor\/three\/examples\/jsm\/loaders\/GLTFLoader\.js["']/);
  assert.match(lab, /SkeletonUtils\.js/);
  assert.match(lab, /assets\/players\/player\.glb/);
  assert.match(graphics, /"three":"\.\/vendor\/three\/build\/three\.module\.js"/);
  assert.match(graphics, /\.\/vendor\/three\/examples\/jsm\//);
  assert.match(index, /"three":"\.\/vendor\/three\/build\/three\.module\.js"/);

  for (const [name, source] of [["simulation lab", lab], ["stadium runtime", stadium], ["Graphics 3.0", graphics], ["main page", index]]) {
    assert.doesNotMatch(source, /cdn\.jsdelivr\.net\/npm\/three/i, name + " must not load Three.js from a CDN");
  }
});

test("Pages build vendors the pinned Three.js package and checks its license", () => {
  const workflow = read("../.github/workflows/static.yml");
  assert.match(workflow, /npm pack three@0\.170\.0/);
  assert.match(workflow, /vendor\/three\/build\/three\.module\.js/);
  assert.match(workflow, /vendor\/three\/LICENSE/);
  assert.match(workflow, /vendor\/three\/examples\/jsm\/utils\/SkeletonUtils\.js/);
});
