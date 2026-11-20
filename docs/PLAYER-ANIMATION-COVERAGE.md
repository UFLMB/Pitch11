# PITCH 11 — Live player animation coverage audit

**Updated:** 2026-11-20  
**Branch baseline:** `main` at `1c27571a4b3a738d52e5bfc01a8d528c071fb378`  
**Implementation branch:** `feature/complete-outfield-animation-mapping`  
**Inventory:** 54 FBX files in `input/player-package/`

## Architecture — production, not diagnostic-only

The live match uses the skinned 3D player renderer:

`index.html` → `stadium-runtime.js` → `MatchPlayerRenderer` → Three.js `FBXLoader`.

The renderer loads `input/player-model-candidate/character.fbx`, clones its skeleton for each player, and binds source animation tracks directly after validating the bone targets. Seven core clips are preloaded; other clips are loaded lazily when the match state requests them. The standalone Mixamo audit pages are diagnostics, not the production renderer.

The old statement that live players are still exclusively Canvas 2D was incorrect. Canvas 2D retains lightweight selection/stamina overlays and HUD elements; player bodies are rendered by the 3D skinned-model renderer.

## Outfield inventory and live mapping

| FBX source | Intended state / status |
|---|---|
| `offensive idle.fbx` | Active idle |
| `jog forward.fbx` | Active forward locomotion; currently reused for walk, run and sprint speed bands |
| `jog backward.fbx` | Active backward locomotion (direction resolver fixed in this audit) |
| `jog forward diagonal.fbx` | Active screen-left forward diagonal |
| `jog forward diagonal (2).fbx` | Active screen-right forward diagonal |
| `jog backward diagonal.fbx` | Active screen-left backward diagonal |
| `jog backward diagonal (2).fbx` | Active screen-right backward diagonal |
| `jog strafe left.fbx` | Active screen-left strafe (direction resolver fixed in this audit) |
| `jog strafe right.fbx` | Active screen-right strafe (direction resolver fixed in this audit) |
| `receive soccerball.fbx` | Registered receive state; no reliable one-shot receive event is currently emitted by the legacy match state |
| `stall soccerball.fbx`, `stall soccerball (2).fbx`, `stall soccerball (3).fbx`, `stall soccerball (4).fbx` | Active close-control/dribble variants |
| `kneeing soccerball.fbx`, `kneeing soccerball (2).fbx` | Active close-control/dribble variants |
| `kick soccerball.fbx`, `kick soccerball (2).fbx` | Active general pass/kick variants |
| `strike foward jog.fbx` | Active ordinary moving shot |
| `soccer penalty kick.fbx` | Active dedicated penalty-shot state (added in this audit; only selected for a penalty restart) |
| `kick up soccerball.fbx` | Registered high-kick state; no distinct live simulation event currently selects it |
| `header soccerball.fbx`, `header soccerball (2).fbx` | Active header variants |
| `throw in.fbx` | Active throw-in |
| `soccer tackle.fbx`, `soccer tackle (2).fbx`, `soccer tackle (3).fbx` | Active tackle variants; also used for slide-tackle state because no separate slide FBX exists |
| `soccer trip.fbx` | Registered fall/trip state |
| `fallen idle.fbx` | Active downed-idle state |
| `standing up.fbx` | Active get-up state |
| `scissor kick.fbx` | Deliberately untouched; not mapped or reassigned so existing skill-move behavior is not changed |

## Goalkeeper inventory

The 22 goalkeeper-related files remain on their existing mappings. This audit does not change goalkeeper AI, dive selection, recovery, or goalkeeper animation routing; that subsystem is intentionally parked.

- Keeper idle, sidestep and directing variants
- Catch variants (head, stomach, jumping and rolling-ball pickup)
- High, middle and low dive pairs
- Keeper pass, drop kick, overhand throw and ball placement
- `transition.fbx` as the existing penalty-ready state

The user's viewer-facing left/right convention remains in force: file 1 is screen-left and file 2 is screen-right when viewing the player from the front.

## Fixes in this audit

1. Backward and lateral movement actions now resolve to their dedicated FBX states instead of falling through to generic speed-based forward jogging.
2. Slide-tackle action now resolves to the available soccer-tackle source clips rather than requesting a nonexistent `slide` catalog state.
3. Penalty restart shots now select `soccer penalty kick.fbx`; ordinary shots continue to use `strike foward jog.fbx`.
4. Regression tests cover these mappings and preserve the previously established diagonal screen-side convention.
5. Skill-move logic and `scissor kick.fbx` remain untouched.

## Honest remaining gaps

- No dedicated walk, sprint, acceleration, deceleration, turn-in-place or pivot FBX is present; the forward jog is time-scaled across speed bands.
- There is no dedicated celebration clip in the 54-file package. The simulation requests a celebration state, but the package has no genuine celebration motion. Do not disguise idle or another unrelated clip as a celebration.
- Receive and high-kick clips are in the package and have resolver/catalog support, but the legacy match state does not yet provide a sufficiently explicit, correctly timed gameplay event for them. They should not be triggered by a guessed timer or by treating every possession as a reception.
- No separate slide-tackle FBX exists; the three soccer-tackle variants are reused for the slide state.
- `scissor kick.fbx` remains intentionally unused by this pass to avoid changing skill-move behavior.
- The keeper subsystem remains unchanged by design.

## Validation boundary

Automated tests can verify state routing, catalog membership and direct skeleton-track compatibility. They cannot prove that every clip looks correct in the live camera, that foot contacts align perfectly with ball contact, or that all 22 players animate smoothly on the target phone. Those require an in-game visual test.

**Conclusion:** the 3D player-animation system is already in the live match. This pass closes concrete outfield routing holes and documents the remaining source-asset/event gaps; it does not claim that all 54 clips are active or that the animation library is complete.
