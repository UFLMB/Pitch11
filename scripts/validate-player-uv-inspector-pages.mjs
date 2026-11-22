import assert from "node:assert/strict";
import fs from "node:fs";

const legacy = fs.readFileSync("player-uv-3d-inspector.html", "utf8");
const canonical = fs.readFileSync("uv-inspector.html", "utf8");

assert.match(legacy, /new URL\(['"]uv-inspector\.html['"], window\.location\.href\)/, "Legacy UV URL must resolve to the canonical inspector.");
assert.match(legacy, /location\.replace\(destination\.href\)/, "Legacy UV URL must use a replace redirect.");
assert.match(legacy, /http-equiv=["']refresh["']/, "Legacy UV URL must retain a no-script redirect fallback.");
assert.match(legacy, /canonical["'] href=["']uv-inspector\.html/, "Legacy UV URL must declare the canonical destination.");
assert.match(canonical, /id=["']headBtn["']/, "Canonical inspector must retain HEAD inspection.");
assert.match(canonical, /id=["']bodyBtn["']/, "Canonical inspector must retain BODY inspection.");
assert.match(canonical, /Copy full anatomical analysis/, "Canonical inspector must retain anatomical analysis export.");
assert.match(canonical, /boneInfluences/, "Canonical inspector must retain bone-influence analysis.");
assert.match(canonical, /assets\/players\/player\.glb/, "Canonical inspector must load the canonical player model.");

console.log("Player UV inspector consolidation checks passed.");
