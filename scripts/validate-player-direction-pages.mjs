import assert from "node:assert/strict";
import fs from "node:fs";

const diagnostic = fs.readFileSync("player-direction-diagnostic.html", "utf8");
const legacy = fs.readFileSync("player-direction-test.html", "utf8");
const moduleSource = fs.readFileSync("player-direction-test.js", "utf8");

assert.match(diagnostic, /id=["']view["']/i, "Canonical direction page must expose the 3D view host.");
assert.match(diagnostic, /id=["']status["']/i, "Canonical direction page must expose diagnostic status.");
assert.match(diagnostic, /player-direction-test\.bundle\.js/, "Canonical page must load the bundled Three.js entry.");
assert.match(diagnostic, /__p11ModuleStarted/, "Canonical page must retain module-start diagnostics.");
assert.match(legacy, /location\.replace\(["']\.\/player-direction-diagnostic\.html["']\)/, "Legacy URL must redirect to the canonical diagnostic page.");
assert.match(legacy, /http-equiv=["']refresh["']/, "Legacy URL must retain a no-script redirect fallback.");
assert.match(moduleSource, /GLTFLoader/, "Direction test module must load GLTF models.");
assert.match(moduleSource, /SkeletonUtils/, "Direction test module must clone skinned player rigs safely.");
assert.match(moduleSource, /\.\/assets\/players\/player\.glb/, "Direction test module must load the canonical player model.");
assert.match(moduleSource, /\.\/assets\/players\/run\.glb/, "Direction test module must load the run animation.");

const workflow = fs.readFileSync(".github/workflows/static.yml", "utf8");
assert.match(workflow, /Bundle player direction diagnostic modules/, "Pages deploy must continue to generate the browser bundle.");
assert.match(workflow, /player-direction-test\.bundle\.js/, "Pages deploy must emit the exact bundle path used by the canonical page.");

console.log("Player direction page consolidation checks passed.");
