import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { predictBallAtGoalPlane, evaluateKeeperInterception } = require("./goalkeeper-physics.js");

test("predicts the ball at the goal plane with drag and gravity", () => {
  const hit = predictBallAtGoalPlane({ x: 0, y: 0, z: 0.3, vx: 20, vy: 3, vz: 2, goalX: 8, drag: 0.08 });
  assert.ok(hit);
  assert.ok(hit.time > 0.4 && hit.time < 0.5);
  assert.ok(hit.lateral > 1);
  assert.ok(hit.height < 0.3 + 2 * hit.time);
});

test("rejects a ball moving away from the goal or a trajectory that cannot reach it", () => {
  assert.equal(predictBallAtGoalPlane({ x: 0, y: 0, z: 0, vx: -10, vy: 0, vz: 0, goalX: 8 }), null);
  assert.equal(predictBallAtGoalPlane({ x: 0, y: 0, z: 0, vx: 1, vy: 0, vz: 0, goalX: 8, drag: 1 }), null);
});

test("elite keeper cannot react instantly and cannot cover an impossible corner", () => {
  const result = evaluateKeeperInterception({
    targetLateral: 3.55, targetHeight: 1.2, timeToGoal: 0.28,
    keeperLateral: 0, keeperDepth: 0, goalDepth: 0,
    stats: { reflex: 0.98, agility: 0.98, reach: 0.98, handling: 0.98 }
  });
  assert.ok(result.reactionTime >= 0.155);
  assert.equal(result.reachable, false);
  assert.equal(result.saveType, "miss");
});

test("longer flight time increases physical reach without guaranteeing a save", () => {
  const short = evaluateKeeperInterception({ targetLateral: 2.8, targetHeight: 1, timeToGoal: 0.3 });
  const long = evaluateKeeperInterception({ targetLateral: 2.8, targetHeight: 1, timeToGoal: 0.9 });
  assert.ok(long.horizontalReach > short.horizontalReach);
  assert.ok(long.reachable || !short.reachable);
});

test("central low shots can be caught, while hard shots are parried", () => {
  const soft = evaluateKeeperInterception({ targetLateral: 0.1, targetHeight: 0.25, timeToGoal: 0.8, incomingSpeed: 8, stats: { handling: 0.9, reflex: 0.8, agility: 0.8 } });
  const hard = evaluateKeeperInterception({ targetLateral: 0.1, targetHeight: 0.25, timeToGoal: 0.8, incomingSpeed: 24, stats: { handling: 0.9, reflex: 0.8, agility: 0.8 } });
  assert.equal(soft.saveType, "catch");
  assert.equal(hard.saveType, "parry");
});

test("height, post, and crossbar boundaries are enforced", () => {
  assert.equal(evaluateKeeperInterception({ targetLateral: 3.8, targetHeight: 1, timeToGoal: 1 }).insideMouth, false);
  assert.equal(evaluateKeeperInterception({ targetLateral: 0, targetHeight: 2.5, timeToGoal: 1 }).reachable, false);
});

test("invalid timing and non-finite inputs are rejected", () => {
  assert.throws(() => evaluateKeeperInterception({ targetLateral: 0, targetHeight: 1, timeToGoal: 0 }), RangeError);
  assert.throws(() => predictBallAtGoalPlane({ x: NaN, y: 0, z: 0, vx: 1, vy: 0, vz: 0, goalX: 2 }), TypeError);
});

test("one-on-one smother is based on arrival time and ball protection, not a random roll", () => {
  const reachable = evaluateOneOnOne({ keeperDistance: 0.8, keeperAgility: 0.9, attackerBallControl: 0.2 });
  const protectedBall = evaluateOneOnOne({ keeperDistance: 0.8, keeperAgility: 0.9, attackerBallControl: 0.2, ballProtected: true });
  const tooFar = evaluateOneOnOne({ keeperDistance: 2.8, keeperAgility: 0.9, attackerBallControl: 0.2 });
  assert.equal(reachable.action, "smother");
  assert.equal(protectedBall.action, "contain");
  assert.equal(tooFar.action, "contain");
});
