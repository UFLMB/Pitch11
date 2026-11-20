PITCH 11 — Goalkeeper Animation Review

The original uploaded goalkeeper FBX sources are retained in this review folder as source copies. The active runtime copies are in input/player-package/ and are registered in engine/mixamo-animation-catalog.mjs.

Naming and direction rules:
- LEFT and RIGHT are defined from the viewpoint of a camera/viewer facing the goalkeeper: LEFT = screen-left, RIGHT = screen-right. They do NOT refer to the goalkeeper's own anatomical sides.
- All four low-shot source takes are treated as no-possession saves. The two takes originally uploaded with a ball_in_hand suffix are renamed in the active package to ball_not_in_hand-variant_2 so the runtime filenames describe the actual motion without conflating distinct takes.
- gk_catch-middle-fingertip_save.fbx is a separate candidate. It must pass the dedicated in-goal distal fingertip-bone-to-ball contact check before it is considered a confirmed fingertip save.
- slow_dribble_run.fbx is not a goalkeeper clip and remains outside the active goalkeeper mapping pending its separate review.

The active runtime uses input/player-package/ only. This review folder is not loaded by the game.
