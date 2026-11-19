# Goalkeeper animation lifecycle v2

## Lifecycle contract
The renderer owns clip loading, mixer playback, and delta-time delivery. `GoalkeeperAnimationLifecycle` owns legal goalkeeper action transitions and ignores stale events by generation token.

- A save clip is played to its actual end. If it contains embedded recovery, no extra get-up clip is appended.
- The `goalkeeper diving safe` exception may finish its embedded get-up and then request repositioning only; it must not play a second get-up.
- A miss requests get-up only when the caller confirms the keeper is actually down.
- A failed or timed-out clip enters a terminal `failed` state rather than waiting indefinitely.
- Reposition completion is driven by the world-position controller reaching the configured center tolerance, not by a looping locomotion clip timer.
- New shots cannot interrupt an active save; queued shots start only after a terminal state.
- Fingertip is explicitly a one-shot state.

## Goalkeeper Lab integration
The Goalkeeper Lab now uses this controller for catch/parry, directional saves, clip-load failures/timeouts, and clip-end transitions. It observes the active Three.js mixer action and its `finished` event, with an action-time boundary fallback. High diving saves request a separate reposition phase; the reposition clip loops while the world-space keeper position is damped back to center, and the lifecycle completes only when the position enters the configured tolerance. Low body-block clips retain their embedded recovery and do not receive a second get-up. An upright miss does not trigger `standing up.fbx`.

The main 11v11 match renderer is not yet wired to this lifecycle or to the v2 goalkeeper AI/contact pipeline. The controller does not guess clip durations or perform root-motion correction.

## Tests
Covers embedded recovery, diving-safe reposition-only exception, upright/down miss, load timeout, stale events after reset, interruption lock, serialized queue, fingertip one-shot, and invalid clip duration.
