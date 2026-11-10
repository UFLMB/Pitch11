import test from "node:test";
import assert from "node:assert/strict";
import { createBroadcastCamera, updateBroadcastCamera } from "./broadcast-camera.mjs";

function fakeCamera() {
  return {
    fov: 0, near: 0, far: 0,
    position: { set(x, y, z) { this.x=x; this.y=y; this.z=z; } },
    lookAt(x, y, z) { this.target={x,y,z}; },
    updateProjectionMatrix() { this.projectionUpdated=true; }
  };
}
const snapshot = (ball, players=[]) => ({ ball, players });

test("camera is in the clear pitch-side lane, under the roof and before the first stand", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera);
  assert.equal(camera.fov, 63);
  assert.equal(camera.position.x, 0);
  assert.equal(camera.position.y, 13.5);
  assert.equal(camera.position.z, 45);
  assert.deepEqual(camera.target, {x:0,y:.6,z:22.5});
  // Roof spans Z=44..74 and Y=21.7..23.9; first stand starts at Z=47.
  assert.ok(camera.position.z >= 44 && camera.position.z < 47);
  assert.ok(camera.position.y < 21.7);
  assert.equal(camera.projectionUpdated, true);
  assert.equal(state.mobile, false);
});

test("camera vertical field of view contains both touchlines", () => {
  const camera = fakeCamera();
  createBroadcastCamera(camera);
  const cameraAngle = Math.atan2(camera.position.y-camera.target.y, camera.position.z-camera.target.z);
  const nearAngle = Math.atan2(camera.position.y, camera.position.z-34);
  const farAngle = Math.atan2(camera.position.y, camera.position.z+34);
  const halfFov = camera.fov * Math.PI / 360;
  assert.ok(Math.abs(nearAngle-cameraAngle) < halfFov);
  assert.ok(Math.abs(farAngle-cameraAngle) < halfFov);
});

test("simulation X is converted to centred Three.js world X before tracking", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera);
  updateBroadcastCamera(camera, state, snapshot({
    x: 80, y: 34, z: .11, vx: 12, vy: 0, owner: -1, lastTouchTeam: 0
  }), .08);
  assert.ok(state.targetX > 0 && state.targetX < 40);
  assert.equal(camera.position.x, state.x);
  assert.ok(camera.target.x > 0);
  assert.equal(camera.position.z, 45);
  assert.equal(camera.target.z, 22.5);
});

test("camera stays under the canopy and in front of the stand at both goal lines", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera, {mobile:true});
  updateBroadcastCamera(camera, state, snapshot({
    x: 105, y: 68, z: .11, vx: 40, vy: 0, owner: -1, lastTouchTeam: 0
  }), .08);
  assert.ok(state.targetX <= 45 && state.targetX >= -45);
  assert.equal(state.sideZ, 45);
  assert.equal(state.height, 13.5);
  assert.ok(camera.position.z < 47);
  assert.ok(camera.position.y < 21.7);
  assert.equal(camera.fov, 63);
});

test("camera tracks play at both ends without changing its broadcast lane", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera);
  updateBroadcastCamera(camera, state, snapshot({
    x: 0, y: 0, z: .11, vx: 0, vy: 0, owner: -1, lastTouchTeam: 1
  }), .08);
  assert.ok(state.targetX < 0);
  assert.equal(state.targetZ, 22.5);
  assert.equal(state.sideZ, 45);
});

test("camera handles missing owner and invalid delta without NaN", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera);
  updateBroadcastCamera(camera, state, snapshot({
    x: 0, y: 0, z: .11, vx: 0, vy: 0, owner: -1, lastTouchTeam: 1
  }), NaN);
  for (const value of [state.x,state.height,state.sideZ,state.targetX,state.targetZ]) {
    assert.ok(Number.isFinite(value));
  }
});
