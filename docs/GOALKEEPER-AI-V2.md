# Goalkeeper AI v2 — design and integration contract

## Why v1 is being replaced
The previous evaluator accepted a preselected goal-line target and flight time. It did not derive the target from live ball state, model perception/occlusion, or calculate a physically constrained movement envelope.

## Coordinates
- x: lateral position in metres, viewed from the goalkeeper.
- y: ball height in metres above the pitch.
- z: distance in front of the goal line; goal plane is z=0.
- vx/vy/vz: metres per second. A shot toward goal has vz<0.
- Gravity acts on y. The predictor also accepts instantaneous acceleration components (`ax`, `ay`, `az`) and solves the first positive goal-plane crossing under a constant-acceleration approximation. A live controller may supply aerodynamic/Magnus acceleration estimates; this is not yet a full drag/spin integration.

## Decision model
predictGoalPlaneCrossing(ball) derives the first goal-plane crossing from current position and velocity. evaluateGoalkeeperThreat compares it with reaction time, lateral acceleration/top speed, dive preparation, and bounded reach envelopes.

Reflexes, positioning, diving, handling, and reach scale capabilities within bounded ranges. They do not create random save percentages or unlimited reach.

Possible decisions: catch, parry, fingertip, or miss. A miss means the ball is outside the modelled physical/reaction envelope; it is not forcibly converted into a save.

## Goalkeeper Lab integration
The Goalkeeper Lab now creates ballistic shots from world-space start/target coordinates, converts the live ball state into this evaluator's goal-line coordinate frame, waits through the keeper's reaction interval, then re-evaluates the current ball state with the consumed reaction delay. The resulting reachability/technique decision selects the matching catch, parry, fingertip, or directional dive animation. The predicted crossing is used for the AI's reach estimate only; it is no longer treated as proof of physical contact. No future target is supplied to the evaluator.

The contact adapter converts the actual ball state at the rig collision into the contact module's coordinates. Catches secure the ball; parries and fingertip saves return a live rebound into the field. If the ball crosses the goal plane without intersecting an animated keeper collider, it counts as a goal. Shot sequencing waits for both the animation lifecycle and any live rebound to finish.

## Known limitations
This remains a deterministic first-stage model, not a complete rigid-body/controller stack. Ball flight currently uses constant gravity and straight-line horizontal motion; aerodynamic drag, Magnus/spin, and variable surface effects are not modelled. The Goalkeeper Lab now samples rig-bound hand, arm, pelvis, and chest capsules from the live Three.js skeleton and checks the ball's swept path against their animated world-space positions. Contact is therefore tied to the rendered animation pose rather than a predicted goal-plane timestamp. The colliders are conservative capsule approximations, not a full skinned-mesh collision solve; fingertip-level precision, contact impulse from surface orientation, and exact animation authoring alignment still need visual calibration. The Lab's baseline goalkeeper attributes are fixed test values. Root-motion correction is not assumed.

## Integration safety
The v2 evaluator/contact/lifecycle pipeline is integrated into Goalkeeper Lab only. The main 11v11 match remains on its existing goalkeeper path. Passing unit tests and CI syntax checks are not visual/gameplay validation.
