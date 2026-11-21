# Goalkeeper AI v2 — design and integration contract

## Why v1 is being replaced
The previous evaluator accepted a preselected goal-line target and flight time. It did not derive the target from live ball state, model perception/occlusion, or calculate a physically constrained movement envelope.

## Coordinates
- x: lateral position in metres, viewed from the goalkeeper.
- y: ball height in metres above the pitch.
- z: distance in front of the goal line; goal plane is z=0.
- vx/vy/vz: metres per second. A shot toward goal has vz<0.
- Gravity acts on y. This first implementation does not yet model drag, spin, or Magnus force.

## Decision model
predictGoalPlaneCrossing(ball) derives the first goal-plane crossing from current position and velocity. evaluateGoalkeeperThreat compares it with reaction time, lateral acceleration/top speed, dive preparation, and bounded reach envelopes.

Reflexes, positioning, diving, handling, and reach scale capabilities within bounded ranges. They do not create random save percentages or unlimited reach.

Possible decisions: catch, parry, fingertip, or miss. A miss means the ball is outside the modelled physical/reaction envelope; it is not forcibly converted into a save.

## Known limitations
This is a deterministic first-stage physics model, not a complete controller. Spin, aerodynamic drag, occlusion, deflections, detailed contact geometry, rebound impulses, goalkeeper anticipation, animation root motion, and lifecycle integration remain to be implemented and tested.

## Integration safety
The v2 evaluator is isolated and is not wired into the live 11v11 match in this change. Existing match and Goalkeeper Lab behavior remain unchanged until controller, animation lifecycle, and coordinate mapping are verified together. Passing unit tests are not visual/gameplay validation.
