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

test("broadcast camera starts at a side-line Tele Broadcast angle", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera);
  assert.equal(camera.fov, 41);
  assert.equal(camera.position.x, 52.5);
  assert.equal(camera.position.y, 40);
  assert.equal(camera.position.z, 98);
  assert.equal(camera.target.z, 0);
  assert.equal(camera.projectionUpdated, true);
  assert.equal(state.mobile, false);
});

test("camera smoothly tracks the ball and predicts its travel", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera);
  updateBroadcastCamera(camera, state, snapshot({
    x: 80, y: 34, z: .11, vx: 12, vy: 0, owner: -1, lastTouchTeam: 0
  }), 1/30);
  assert.ok(state.targetX > 52.5 && state.targetX < 80 + 7 + 2.5);
  assert.equal(camera.position.x, state.x);
  assert.ok(camera.target.x > 52.5);
});

test("camera framing remains bounded at both goal lines and touchlines", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera, {mobile:true});
  updateBroadcastCamera(camera, state, snapshot({
    x: 105, y: 68, z: .11, vx: 40, vy: 0, owner: -1, lastTouchTeam: 0
  }), .05);
  assert.ok(state.targetX <= 98 && state.targetX >= 7);
  assert.ok(state.targetZ <= 5.2 && state.targetZ >= -5.2);
  assert.ok(state.z < 104);
  assert.ok(state.y < 43);
  assert.equal(camera.fov, 43);
});

test("camera handles missing owner and invalid delta without NaN", () => {
  const camera = fakeCamera();
  const state = createBroadcastCamera(camera);
  updateBroadcastCamera(camera, state, snapshot({
    x: 0, y: 0, z: .11, vx: 0, vy: 0, owner: -1, lastTouchTeam: 1
  }), NaN);
  for (const value of [state.x,state.y,state.z,state.targetX,state.targetY,state.targetZ]) {
    assert.ok(Number.isFinite(value));
  }
});
