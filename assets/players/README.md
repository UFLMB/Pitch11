# PITCH 11 — Player model asset contract

This folder is reserved for production player and goalkeeper GLB assets used by the 3D Simulation Lab and the future unified match renderer. The Simulation Lab automatically looks for `assets/players/player.glb` and falls back to the articulated procedural rig if it is absent.

## Required delivery format
- Main integration path: `assets/players/player.glb` (one reusable skinned outfield/keeper source model initially).
- GLB preferred; textures embedded in the GLB.
- One consistent humanoid skeleton and bone naming convention across player models and animation clips.
- Face the model forward along local -Z; the runtime rotates the player to match the match simulation.
- Name kit materials clearly (`Jersey`/`Shirt`, `Shorts`, `Socks`, `Skin`, `Hair`) so the runtime can apply home/away and goalkeeper colours.
- Prefer one neutral/white kit texture; team colours are multiplied into the named kit materials.
- Realistic human proportions; target standing height approximately 1.7–1.95 m.
- Apply transforms before export; no missing skin, external texture paths, or zero-scale bones.
- Include a neutral idle pose and a clear forward-facing reference pose.
- Put animation clips inside the same GLB where possible. The runtime normalizes common names such as `Idle`, `Walk`, `Run`, `Sprint`, `Pass`, `Shot`, `Tackle`, `Slide`, `GK_Set`, `GK_Dive_Left`, `GK_Dive_Right`, `GK_Catch`, and `GK_Parry`.

## Animation clips
The renderer integration will map clips for: Idle, Walk, Run, Sprint, Turn, Pass, Shot, Tackle, Slide, Jump, Fall, GetUp, Header, Celebrate, GK_Set, GK_Dive_Left, GK_Dive_Right, GK_Catch, and GK_Parry.

Clip names can differ in source files; the import/retarget map will normalize them. The important requirement is a compatible humanoid skeleton and consistent bind pose.

## Integration rules
- Do not replace current gameplay player objects with visual models.
- Each visual rig follows the existing simulation player position, facing, speed, and action state.
- Physics, AI, collision, and match rules remain authoritative in the existing simulation.
- Optimized realism is the target: recognizable, proportionate 3D footballers with restrained mesh and texture budgets, not photorealistic hero models.
- Target one reusable model at approximately 8,000–12,000 triangles, no more than 65 deform bones, and four skin influences per vertex. Treat these as export budgets, not claims about an asset already supplied.
- Prefer one 1024×1024 texture atlas and one or two opaque materials; embed textures in the GLB. Avoid transparent hair cards, 4K maps, morph-target facial rigs, cloth simulation, and per-player unique materials in the first mobile version.
- Keep the same optimized model on mobile and desktop initially. Add higher-detail LOD/model variants only after profiling proves there is performance headroom.
- Reuse material variants and selection-ring geometry across players; keep player shadows disabled unless later profiling supports them.
- Cap animation mixer updates at 20 Hz on mobile and 30 Hz on desktop while keeping player transforms responsive to the match update.

No final player model is committed yet. The production match renderer now loads this same `player.glb` asset when it is supplied. Until a valid skinned GLB loads, the existing 2D match players remain visible; the renderer will not hide them prematurely. Add a licensed, final `player.glb` here when available; do not treat the fallback mannequin as final player visuals.
