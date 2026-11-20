# PITCH 11 — Active player and goalkeeper animation package

This folder contains the FBX animation sources loaded by engine/match-player-renderer.mjs.

## Goalkeeper animation replacement

The old generic goalkeeper catch, body-block, diving-save, miss and scoop FBXs have been retired from the active package and replaced by individually named gk_*.fbx sources. engine/mixamo-animation-catalog.mjs is the runtime source of truth.

- Catch clips distinguish head height, stomach height, jump reach and forward-jump reach.
- Rolling-ball pickup is registered as goalkeeper scoop.
- High and middle dives are paired by screen-left/screen-right as seen by a viewer facing the goalkeeper.
- All low-shot source takes are labeled ball_not_in_hand. The two alternate takes are marked variant_2; they remain distinct.
- The fingertip-save candidate was tested against 54 in-goal ball trajectories and made no distal fingertip contact. It is rejected and is not included in the active runtime package; its source copy remains only in the review folder.

## Runtime rules

- Keep the player model and animation rigs on the same Mixamo skeleton.
- Any source filename change must also update engine/mixamo-animation-catalog.mjs and its tests.
- LEFT/RIGHT always means screen-left/screen-right from the viewer facing the goalkeeper, never the goalkeeper's anatomical sides.
- Save clips include their authored landing/recovery motion; do not append a generic get-up clip unless a specific animation is verified to require one.
