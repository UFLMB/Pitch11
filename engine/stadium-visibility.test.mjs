import test from "node:test";
import assert from "node:assert/strict";
import {
  STADIUM_ROOF_LAYER,
  markRoofForCameraExclusion,
  configureStadiumCameraLayers
} from "./stadium-visibility.mjs";

function layers() {
  return {
    mask: 1,
    set(layer) { this.mask = 1 << layer; },
    enable(layer) { this.mask |= 1 << layer; },
    test(other) { return (this.mask & other.mask) !== 0; }
  };
}
const fakeMesh = () => ({ layers: layers() });
const fakeCamera = () => ({ layers: layers() });

test("roof geometry is assigned exclusively to the roof layer", () => {
  const roof = fakeMesh();
  assert.equal(markRoofForCameraExclusion(roof), roof);
  assert.equal(roof.layers.mask, 1 << STADIUM_ROOF_LAYER);
});

test("broadcast camera cannot render roof meshes", () => {
  const roof = fakeMesh();
  markRoofForCameraExclusion(roof);
  const broadcast = fakeCamera();
  configureStadiumCameraLayers(broadcast, { hideRoof: true });
  assert.equal(broadcast.layers.test(roof.layers), false);
});

test("alternate camera can render roof while also rendering the normal scene", () => {
  const roof = fakeMesh();
  markRoofForCameraExclusion(roof);
  const replay = fakeCamera();
  configureStadiumCameraLayers(replay, { hideRoof: false });
  assert.equal(replay.layers.test(roof.layers), true);
  assert.equal(replay.layers.mask, (1 << 0) | (1 << STADIUM_ROOF_LAYER));
});

test("invalid objects fail loudly instead of silently breaking visibility", () => {
  assert.throws(() => markRoofForCameraExclusion({}), /Three.js layers/);
  assert.throws(() => configureStadiumCameraLayers({}), /Three.js layers/);
});
