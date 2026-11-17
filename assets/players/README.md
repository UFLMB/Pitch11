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

## Canonical UV mapping reference

The accepted diagnostic UV mapping is fixed to the visually verified GitHub Actions run 18 baseline (re-generated successfully in run 19):
- Project UVs directly into image space: `x = u × (image_width − 1)`, `y = v × image_height`.
- Do not mirror horizontally or vertically and do not rotate the source texture.
- Island outlines and numbered marker centers use the same projection; marker labels remain upright.
- Keep the original embedded player textures and model UV attributes unchanged.
- The diagnostic atlas is a reference/inspection output, not a replacement player texture and not a gameplay asset.

See [the anatomical mapping specification](../../docs/PLAYER-UV-ANATOMICAL-MAPPING.md) and [the UV Inspector](../../uv-inspector.html).

## Integration rules

- Do not replace gameplay player objects with visual models.
- Each visual rig follows the existing simulation player's position, facing, speed, and action state.
- Physics, AI, collision, and match rules remain authoritative in the existing simulation.
- The existing 2D players remain visible until the model **and all required base animation clips** load and validate successfully.


## Model-specific neutral kit base texture

- Player Kit Studio generates the neutral base-colour atlas directly from the embedded Male Athlete 02 body texture when no saved kit exists.
- It applies the already accepted garment masks: jersey BODY islands 1, 8, 9, 16, 17; shorts 6, 7, 14, 15; socks 4, 5; boots 12–13 and 18–27.
- The default base is a clean light jersey, light shorts, light socks and charcoal boots. The original skin pixels and head texture are preserved.
- The generated 1024 × 1024 texture can be exported as PNG from the existing Kit Studio. No duplicate clothing system or altered UV layout is introduced.
- The model mesh, UVs, skeleton, skin weights, animation clips and gameplay data remain unchanged.
