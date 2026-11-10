import test from "node:test";
import assert from "node:assert/strict";
import { applyLeagueSoccerBallPhysics, LEAGUE_BALL_DEFAULTS } from "./league-soccer-ballphysics.mjs";

const eps = 1e-4;
const state = (z, vx, vy, vz) => ({ x:0, y:0, z, vx, vy, vz });

test("upstream gravity is applied before drag", () => {
  const b=state(1,10,0,10);
  applyLeagueSoccerBallPhysics(b,.1,{drag:0,friction:0,linearFriction:0});
  assert.ok(Math.abs(b.vx-10)<eps);
  assert.ok(Math.abs(b.vz-9.019)<eps);
});
test("upstream aerodynamic drag reduces airborne speed", () => {
  const b=state(1,10,0,0);
  applyLeagueSoccerBallPhysics(b,.1,{gravity:0,friction:0,linearFriction:0});
  assert.ok(Math.abs(Math.hypot(b.vx,b.vy,b.vz)-9.83)<eps);
});
test("upstream bounce clamps the ball and returns impact strength", () => {
  const b=state(.05,0,0,-10);
  const hit=applyLeagueSoccerBallPhysics(b,.1,{gravity:0,drag:0,friction:0,linearFriction:0});
  assert.ok(Math.abs(b.z-LEAGUE_BALL_DEFAULTS.ballRadius)<eps);
  assert.ok(Math.abs(b.vz-6.35)<eps);
  assert.ok(Math.abs(hit.frictionFactor-9.5/12)<eps);
});
test("upstream grass friction slows a rolling ball", () => {
  const b=state(LEAGUE_BALL_DEFAULTS.ballRadius,5,0,0);
  const hit=applyLeagueSoccerBallPhysics(b,.1,{gravity:0,drag:0});
  assert.ok(Math.abs(b.vx-4.695)<eps);
  assert.ok(Math.abs(hit.grassInfluenceBias-1)<eps);
});
test("airborne ball avoids grass friction", () => {
  const b=state(.11+.025+.05,5,1,0);
  const hit=applyLeagueSoccerBallPhysics(b,.1,{gravity:0,drag:0});
  assert.ok(Math.abs(b.vx-5)<eps);
  assert.ok(Math.abs(b.vy-1)<eps);
  assert.ok(Math.abs(hit.grassInfluenceBias)<eps);
});
test("wind bends an airborne ball", () => {
  const b=state(1,10,0,0);
  applyLeagueSoccerBallPhysics(b,.1,{gravity:0,drag:0,friction:0,linearFriction:0,windX:5});
  assert.ok(Math.abs(b.vx-10.5)<eps);
});
test("wind does not push a grounded ball", () => {
  const b=state(.11,5,0,0);
  applyLeagueSoccerBallPhysics(b,.1,{gravity:0,drag:0,windX:5});
  assert.ok(Math.abs(b.vx-4.695)<eps);
});
test("wet pitch reduces ground friction", () => {
  const b=state(.11,5,0,0);
  applyLeagueSoccerBallPhysics(b,.1,{gravity:0,drag:0,wetness:1});
  assert.ok(Math.abs(b.vx-4.8475)<eps);
});
