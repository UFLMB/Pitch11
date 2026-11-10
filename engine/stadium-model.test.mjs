import test from "node:test";
import assert from "node:assert/strict";
import { computeStadiumPlacement } from "./stadium-model.mjs";

test("centres stadium horizontally and places its base at ground level", () => {
  const result = computeStadiumPlacement({ min: { x: -150, y: -4, z: -100 }, max: { x: 150, y: 46, z: 100 } });
  assert.equal(result.scale, 1);
  assert.deepEqual(result.position, { x: 0, y: 4, z: 0 });
  assert.deepEqual(result.dimensions, { width: 300, height: 50, depth: 200 });
});

test("scales oversized stadiums down without distorting proportions", () => {
  const result = computeStadiumPlacement({ min: { x: 0, y: 0, z: 0 }, max: { x: 440, y: 80, z: 220 } });
  assert.equal(result.scale, 0.5);
  assert.deepEqual(result.dimensions, { width: 220, height: 40, depth: 110 });
  assert.deepEqual(result.position, { x: -110, y: 0, z: -55 });
});

test("rejects invalid and degenerate bounds", () => {
  assert.throws(() => computeStadiumPlacement(null), /Finite stadium bounds/);
  assert.throws(() => computeStadiumPlacement({ min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 10 } }), /positive dimensions/);
});
