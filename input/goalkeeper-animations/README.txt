PITCH 11 — Goalkeeper Animation Review

The original uploaded goalkeeper FBX sources are retained in this review folder as source copies. The active runtime copies are in input/player-package/ and are registered in engine/mixamo-animation-catalog.mjs.

Naming and direction rules:
- LEFT and RIGHT are defined from the viewpoint of a camera/viewer facing the goalkeeper: LEFT = screen-left, RIGHT = screen-right. They do NOT refer to the goalkeeper's own anatomical sides.
- Exactly two low-shot saves remain, one screen-left and one screen-right. Their precise filenames are gk_dive-low_shot-left-ball_not_in_hand.fbx and gk_dive-low_shot-right-ball_not_in_hand.fbx. The older duplicate takes carrying the misleading ball_in_hand suffix were removed.
- gk_catch-middle-fingertip_save.fbx was rejected after the in-goal contact test showed no distal fingertip contact. The rejected FBX was deleted from this branch; it is not part of the active runtime.
- slow_dribble_run.fbx is not a goalkeeper clip and remains outside the active goalkeeper mapping pending its separate review.

The active runtime uses input/player-package/ only. This review folder is not loaded by the game.
