# PITCH 11 — Player model asset contract

This folder is reserved for production player and goalkeeper GLB assets used by the Graphics 2.0 renderer.

## Required delivery format
- GLB preferred; textures embedded in the GLB.
- One consistent humanoid skeleton and bone naming convention across player models and animation clips.
- Realistic human proportions; target standing height approximately 1.7–1.95 m.
- Apply transforms before export; no missing skin, external texture paths, or zero-scale bones.
- Include a neutral idle pose and a clear forward-facing reference pose.

## Animation clips
The renderer integration will map clips for: Idle, Walk, Run, Sprint, Turn, Pass, Shot, Tackle, Slide, Jump, Fall, GetUp, Header, Celebrate, GK_Set, GK_Dive_Left, GK_Dive_Right, GK_Catch, and GK_Parry.

Clip names can differ in source files; the import/retarget map will normalize them. The important requirement is a compatible humanoid skeleton and consistent bind pose.

## Integration rules
- Do not replace current gameplay player objects with visual models.
- Each visual rig follows the existing simulation player position, facing, speed, and action state.
- Physics, AI, collision, and match rules remain authoritative in the existing simulation.
- Use LODs, shared materials, instancing where appropriate, and capped animation updates for mobile performance.

No player models are committed yet. Add licensed, final GLB files here when available; do not use placeholder mannequins as final player visuals.
