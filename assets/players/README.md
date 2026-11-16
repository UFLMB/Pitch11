# PITCH 11 — Player model asset contract

## First integrated prototype

The first prototype uses **Male Athlete 02** from CodeLove 3D Models:
- Source: https://models.codelove.in/models/sports-male-02/
- License: MIT (the model and animation clips carry embedded copyright metadata)
- 8,146 triangles, approximately 1.82 m tall, 80 named Biped joints
- Four embedded 1024 px PBR textures and two materials
- The model is a footballer in a neutral reference pose

The GitHub Pages build downloads the model and its shared-skeleton animation clips into this folder at build time. The binary files are intentionally not committed as opaque files; their source URLs and validation are tracked in `.github/workflows/static.yml` and `scripts/validate-player-assets.mjs`. The build preserves the embedded copyright notices in `THIRD_PARTY_NOTICES.txt`.

The initial animation set is deliberately limited to:
- `idle.glb` — Idle
- `walk.glb` — Walk
- `run.glb` — Run

All three clips are separate skeleton-only GLBs. The build validates that their animation tracks target node names present in the player model before the site is deployed. The runtime uses the Three.js Meshopt decoder required by the source GLBs.

This is a **first integration/prototype asset**, not the final UFL/PITCH 11 player identity or final team kit. Dedicated football actions (pass, shot, tackle, slide, header, goalkeeper actions), custom neutral kits, and additional player appearance variants remain later steps.

## Performance target

- Keep the current model at approximately 8,000–12,000 triangles.
- This prototype uses 80 named joints; retain this as the current upper bound until mobile profiling supports a different rig.
- Prefer one 1024 px texture set and a small number of materials.
- Keep the same optimized model on mobile and desktop initially.
- Reuse material variants and selection-ring geometry across players; keep player shadows disabled.
- Cap animation mixer updates at 20 Hz on mobile and 30 Hz on desktop while keeping player transforms responsive.

## Integration rules

- Do not replace gameplay player objects with visual models.
- Each visual rig follows the existing simulation player's position, facing, speed, and action state.
- Physics, AI, collision, and match rules remain authoritative in the existing simulation.
- The existing 2D players remain visible until the model **and all required base animation clips** load and validate successfully.
