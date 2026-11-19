# Goalkeeper contact v2

## Contract
`resolveGoalkeeperContact` consumes a v2 goalkeeper decision and a ball state (x lateral, y vertical, z toward field). It returns a contact event and new ball velocity without mutating the input.

- `catch`: secures the ball and marks it held.
- `parry`: reflects incoming normal velocity with bounded restitution.
- `fingertip`: distinct higher-restitution deflection with an upward component.
- `miss`: no contact; preserves live ball velocity.

The surface normal points away from the keeper. A bounded contact offset can alter deflection direction.

## Limitations
This is a deterministic contact-response primitive, not a complete rigid-body solver. Collision timing, hand/body collider geometry, spin, turf friction, post-contact aerodynamic flight, and animation timing remain for integration. This isolated module does not change the match or Goalkeeper Lab.

## Validation
Tests cover catch, miss, parry, fingertip, normal orientation, unsupported techniques, and invalid numeric inputs.
