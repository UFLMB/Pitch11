import test from "node:test";
import assert from "node:assert/strict";
import { buildGoalkeeperContactColliders, findSweptBallContact } from "./goalkeeper-contact-geometry.mjs";

const p = (x, y, z) => ({ x, y, z });

test("builds hand, arm and torso colliders from Mixamo rig bones", () => {
  const colliders = buildGoalkeeperContactColliders({
    "mixamorig5:LeftArm_$AssimpFbx$_Translation": p(-0.25, 1.4, 0),
    "mixamorig5:LeftForeArm_$AssimpFbx$_Translation": p(-0.45, 1.15, 0),
    "mixamorig5:LeftHand_$AssimpFbx$_Translation": p(-0.55, 0.95, 0),
    "mixamorig5:RightArm_$AssimpFbx$_Translation": p(0.25, 1.4, 0),
    "mixamorig5:RightForeArm_$AssimpFbx$_Translation": p(0.45, 1.15, 0),
    "mixamorig5:RightHand_$AssimpFbx$_Translation": p(0.55, 0.95, 0),
    "mixamorig5:Hips_$AssimpFbx$_Translation": p(0, 0.9, 0),
    "mixamorig5:Spine_$AssimpFbx$_Translation": p(0, 1.1, 0),
    "mixamorig5:Spine1_$AssimpFbx$_Translation": p(0, 1.3, 0),
    "mixamorig5:Spine2_$AssimpFbx$_Translation": p(0, 1.5, 0),
    "mixamorig5:Neck_$AssimpFbx$_Translation": p(0, 1.65, 0),
    "mixamorig5:LeftUpLeg_$AssimpFbx$_Translation": p(-0.12, 0.82, 0),
    "mixamorig5:LeftLeg_$AssimpFbx$_Translation": p(-0.12, 0.42, 0),
    "mixamorig5:LeftFoot_$AssimpFbx$_Translation": p(-0.12, 0.08, 0.1),
    "mixamorig5:RightUpLeg_$AssimpFbx$_Translation": p(0.12, 0.82, 0),
    "mixamorig5:RightLeg_$AssimpFbx$_Translation": p(0.12, 0.42, 0),
    "mixamorig5:RightFoot_$AssimpFbx$_Translation": p(0.12, 0.08, 0.1)
  });
  assert.deepEqual(colliders.map(item => item.id), [
    "left-upper-arm", "left-forearm", "left-hand",
    "left-upper-leg", "left-lower-leg", "left-foot",
    "right-upper-arm", "right-forearm", "right-hand",
    "right-upper-leg", "right-lower-leg", "right-foot",
    "pelvis-core", "chest-core", "upper-chest"
  ]);
  assert.equal(colliders.find(item => item.id === "left-hand").radius, 0.145);
});

test("detects a swept ball crossing a stationary hand collider between frames", () => {
  const collider = { id: "right-hand", part: "hand", side: "right", start: p(0, 1, 0), end: p(0, 1, 0), radius: 0.14 };
  const hit = findSweptBallContact({
    previousBall: p(-1, 1, 0),
    currentBall: p(1, 1, 0),
    previousColliders: [collider],
    currentColliders: [collider],
    ballRadius: 0.11
  });
  assert.ok(hit);
  assert.equal(hit.colliderId, "right-hand");
  assert.ok(hit.time > 0 && hit.time < 1);
});

test("detects a low shot against a goalkeeper lower-leg collider", () => {
  const collider = { id: "right-lower-leg", part: "leg", side: "right", start: p(0.12, 0.42, 0), end: p(0.12, 0.08, 0.1), radius: 0.105 };
  const hit = findSweptBallContact({
    previousBall: p(0.12, 0.3, -0.5),
    currentBall: p(0.12, 0.3, 0.5),
    previousColliders: [collider],
    currentColliders: [collider],
    ballRadius: 0.11
  });
  assert.ok(hit);
  assert.equal(hit.colliderId, "right-lower-leg");
});

test("interpolates a moving arm collider between animation frames", () => {
  const previous = { id: "left-forearm", part: "arm", side: "left", start: p(-1, 1, 0), end: p(-1, 1.4, 0), radius: 0.09 };
  const current = { ...previous, start: p(1, 1, 0), end: p(1, 1.4, 0) };
  const hit = findSweptBallContact({
    previousBall: p(0, 1.2, -0.5),
    currentBall: p(0, 1.2, 0.5),
    previousColliders: [previous],
    currentColliders: [current]
  });
  assert.ok(hit);
  assert.equal(hit.colliderId, "left-forearm");
});

test("does not report contact when the ball misses every collider", () => {
  const collider = { id: "chest-core", part: "torso", side: "center", start: p(0, 1, 0), end: p(0, 1.5, 0), radius: 0.2 };
  const hit = findSweptBallContact({
    previousBall: p(2, 1.2, -1),
    currentBall: p(2, 1.2, 1),
    previousColliders: [collider],
    currentColliders: [collider]
  });
  assert.equal(hit, null);
});

test("rejects invalid vectors and radii", () => {
  assert.throws(() => buildGoalkeeperContactColliders({ LeftHand: p(NaN, 0, 0) }), /finite/);
  assert.throws(() => findSweptBallContact({ previousBall: p(0, 0, 0), currentBall: p(0, 0, 0), ballRadius: -1 }), /non-negative/);
});
