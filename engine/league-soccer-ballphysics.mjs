/*
 * Adapted from League-Soccer / GameplayFootball ballphysics.hpp and ballphysics.cpp.
 * Copyright 2019 Google LLC & Bastiaan Konings.
 * Licensed under the Apache License, Version 2.0.
 * Upstream: https://github.com/awest813/League-Soccer
 *
 * Coordinate adaptation for PITCH 11:
 * upstream Z remains vertical; X/Y are the ground plane.
 */
export const LEAGUE_BALL_DEFAULTS = Object.freeze({
  ballRadius: 0.11, bounce: 0.64, linearBounce: 0.05,
  drag: 0.017, friction: 0.06, linearFriction: 1.55,
  gravity: -9.81, grassHeight: 0.025,
  windX: 0, windY: 0, wetness: 0
});
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function applyLeagueSoccerBallPhysics(ball, dt, overrides = {}) {
  const c = { ...LEAGUE_BALL_DEFAULTS, ...overrides };
  const result = { frictionFactor: 0, grassInfluenceBias: 0 };

  // Gravity is applied before aerodynamic drag, matching upstream order.
  ball.vz += c.gravity * dt;
  const speed = Math.hypot(ball.vx, ball.vy, ball.vz);
  const draggedSpeed = speed - c.drag * speed * speed * dt;
  if (speed > 1e-12) {
    const scale = draggedSpeed / speed;
    ball.vx *= scale; ball.vy *= scale; ball.vz *= scale;
  }

  const ballBottom = ball.z - c.ballRadius;
  result.grassInfluenceBias = Math.pow(clamp(1 - ballBottom / c.grassHeight, 0, 1), 0.7);
  const airborneFactor = 1 - result.grassInfluenceBias;
  ball.vx += c.windX * airborneFactor * dt;
  ball.vy += c.windY * airborneFactor * dt;

  if (ball.z < c.ballRadius) {
    if (ball.vz < 0) {
      result.frictionFactor = clamp(-ball.vz - 0.5, 0, 12) / 12;
      ball.vz = -ball.vz * c.bounce;
      ball.vz = Math.max(ball.vz - c.linearBounce, 0);
    }
    ball.z = c.ballRadius;
  }

  if (ball.z < c.ballRadius + c.grassHeight) {
    const wetScale = 1 - clamp(c.wetness, 0, 1) * 0.5;
    const adaptedFriction = c.friction * result.grassInfluenceBias * wetScale;
    const groundSpeed = Math.hypot(ball.vx, ball.vy);
    let nextSpeed = groundSpeed - adaptedFriction * groundSpeed * groundSpeed * dt;
    nextSpeed = clamp(nextSpeed - c.linearFriction * result.grassInfluenceBias * wetScale * dt, 0, 100000);
    if (groundSpeed > 1e-12) {
      const scale = nextSpeed / groundSpeed;
      ball.vx *= scale; ball.vy *= scale;
    } else {
      ball.vx = 0; ball.vy = 0;
    }
  }
  return result;
}
