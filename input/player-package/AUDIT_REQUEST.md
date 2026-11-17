# PITCH 11 — FBX animation package audit

This marker intentionally triggers the existing GitHub Actions FBX audit.

Scope:
- Inventory all uploaded FBX clips.
- Inspect each clip's animation channels and hierarchy.
- Group clips by skeleton signature.
- Preserve all original FBX files unchanged.
- Do not integrate or replace the canonical player model or gameplay assets.

Priority clips for the first compatibility review:
1. jog forward.fbx
2. offensive idle.fbx
3. kick soccerball.fbx

The audit report is uploaded as the `player-fbx-audit` workflow artifact. Conversion to GLB is a separate step and must only happen after the FBX import structure and rig compatibility are confirmed.
