import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runtime = readFileSync(new URL("../stadium-runtime.js", import.meta.url), "utf8");

test("procedural turf waits until all Meshy PBR maps have settled", () => {
  const pbrCompletion = runtime.indexOf("pitchGrassPbrDiagnostics.completedAt=new Date().toISOString()");
  const pbrSchedule = runtime.indexOf("scheduleDetailedPitchTexture();", pbrCompletion);
  const stadiumSchedule = runtime.indexOf("scheduleDetailedPitchTexture();", pbrSchedule + 1);
  assert.notEqual(pbrCompletion, -1, "PBR completion marker exists");
  assert.ok(pbrSchedule > pbrCompletion, "PBR completion schedules the turf decision");
  assert.ok(stadiumSchedule > pbrSchedule, "stadium-ready path also requests the same guarded decision");
  assert.match(runtime, /detailedTurfTextureStarted=false/);
  assert.match(runtime, /pitchGrassPbrDiagnostics\.status==='loading'[\s\S]*?waiting-for-pbr/);
});

test("successful Meshy albedo is preserved instead of being overwritten by procedural grass", () => {
  const start = runtime.indexOf("function scheduleDetailedPitchTexture()");
  const end = runtime.indexOf("\n }\n function setStadiumLoadState", start);
  assert.ok(start >= 0 && end > start, "turf scheduling function exists");
  const scheduler = runtime.slice(start, end);
  assert.match(scheduler, /pitchGrassPbrDiagnostics\.baseColorApplied/);
  assert.match(scheduler, /skipped-meshy-pbr/);
  assert.match(scheduler, /drawProceduralGrassProgressive/);
  assert.match(scheduler, /procedural-hd-local-fallback/);
  assert.ok(scheduler.indexOf("baseColorApplied") < scheduler.indexOf("drawProceduralGrassProgressive"),
    "procedural fallback is only considered after the successful-PBR branch");
});
