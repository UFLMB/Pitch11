# Goalkeeper contact v2

## Contract
`resolveGoalkeeperContact` consumes a v2 goalkeeper decision and a ball state (x lateral, y vertical, z toward field). It returns a contact event and new ball velocity without mutating the input.

- `catch`: secures the ball and marks it held.
- `parry`: reflects incoming normal velocity with bounded restitution.
- `fingertip`: distinct higher-restitution deflection with an upward component.
- `miss`: no contact; preserves live ball velocity.

The surface normal points away from the keeper. A bounded contact offset can alter deflection direction.

## Goalkeeper Lab adapter
`engine/goalkeeper-v2-adapter.mjs` converts between the Lab's world coordinates (world z increases toward goal) and the AI/contact coordinates (z is distance in front of the goal line, positive toward the field). It advances ballistic shots under gravity and converts the actual rig-contact ball state into this resolver's coordinates. Catch holds the ball; parry/fingertip produces a live rebound.

## Limitations
This is a deterministic contact-response primitive, not a complete rigid-body solver. `engine/goalkeeper-contact-geometry.mjs` builds conservative hand, upper-arm, forearm, pelvis, and chest capsules from the active Mixamo skeleton. The renderer samples their world-space positions after mixer updates; the Lab tests the ball's swept segment against interpolated collider poses and resolves contact only on an actual overlap. The colliders are not a triangle-level skinned-mesh solve. Spin, turf friction, aerodynamic rebound flight, and visual calibration of the capsule radii remain future work. This integration is for Goalkeeper Lab only; the main 11v11 match is unchanged.

## Validation
Tests cover catch, miss, parry, fingertip, normal orientation, unsupported techniques, and invalid numeric inputs.
