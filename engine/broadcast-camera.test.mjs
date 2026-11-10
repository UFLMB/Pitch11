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

test("camera starts in the unobstructed pitch-side gantry, before the roof and stands", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera);
  assert.equal(camera.fov, 54);
  assert.equal(camera.position.x, 0);
  assert.equal(camera.position.y, 25);
  assert.equal(camera.position.z, 42);
  assert.deepEqual(camera.target, {x:0,y:.6,z:-34});
  // Stadium geometry: roof begins at Z=44; first stand begins at Z=47.
  assert.ok(camera.position.z < 44);
  assert.ok(camera.position.y > 23.9);
  assert.equal(camera.projectionUpdated, true);
  assert.equal(state.mobile, false);
});

test("camera aim crosses the full pitch toward the far touchline", () => {
  const camera = fakeCamera();
  createBroadcastCamera(camera);
  const nearEdgeRayY = camera.position.y +
    (camera.target.y-camera.position.y) *
    ((42-34)/(42-(-34)));
  assert.ok(nearEdgeRayY > 20 && nearEdgeRayY < 26);
  assert.equal(camera.target.z, -34);
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
  assert.equal(camera.position.z, 42);
  assert.equal(camera.target.z, -34);
});

test("camera stays pitch-side of the roof at both goal lines and touchlines", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera, {mobile:true});
  updateBroadcastCamera(camera, state, snapshot({
    x: 105, y: 68, z: .11, vx: 40, vy: 0, owner: -1, lastTouchTeam: 0
  }), .08);
  assert.ok(state.targetX <= 45 && state.targetX >= -45);
  assert.equal(state.sideZ, 42);
  assert.equal(state.height, 26);
  assert.ok(camera.position.z < 44);
  assert.equal(camera.fov, 56);
});

test("camera tracks play at the left and right ends without changing its gantry side", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera);
  updateBroadcastCamera(camera, state, snapshot({
    x: 0, y: 0, z: .11, vx: 0, vy: 0, owner: -1, lastTouchTeam: 1
  }), .08);
  assert.ok(state.targetX < 0);
  assert.equal(state.targetZ, -34);
  assert.equal(state.sideZ, 42);
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
