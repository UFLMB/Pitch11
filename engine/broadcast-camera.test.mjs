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

test("camera is positioned on the stadium broadcast side, not beyond a goal", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera);
  assert.equal(camera.fov, 44);
  assert.equal(camera.position.x, 0);
  assert.equal(camera.position.y, 27);
  assert.equal(camera.position.z, 68);
  assert.deepEqual(camera.target, {x:0,y:.6,z:0});
  assert.equal(camera.projectionUpdated, true);
  assert.equal(state.mobile, false);
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
  assert.ok(camera.position.z > 50 && camera.position.z < 70);
});

test("camera stays on the same side of the pitch at both goal lines and touchlines", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera, {mobile:true});
  updateBroadcastCamera(camera, state, snapshot({
    x: 105, y: 68, z: .11, vx: 40, vy: 0, owner: -1, lastTouchTeam: 0
  }), .08);
  assert.ok(state.targetX <= 46 && state.targetX >= -46);
  assert.ok(state.sideZ > 50 && state.sideZ < 71);
  assert.ok(state.height > 20 && state.height <= 28);
  assert.ok(camera.position.z > 0);
  assert.equal(camera.fov, 46);
});

test("camera converts left-side and right-side play into the pitch's centred coordinates", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera);
  updateBroadcastCamera(camera, state, snapshot({
    x: 0, y: 0, z: .11, vx: 0, vy: 0, owner: -1, lastTouchTeam: 1
  }), .08);
  assert.ok(state.targetX < 0);
  assert.ok(state.targetZ < 0);
  assert.ok(state.sideZ > 0);
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
