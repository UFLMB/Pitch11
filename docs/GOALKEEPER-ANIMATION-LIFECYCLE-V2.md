# Goalkeeper animation lifecycle v2

## Lifecycle contract
The renderer owns clip loading, mixer playback, and delta-time delivery. `GoalkeeperAnimationLifecycle` owns legal goalkeeper action transitions and ignores stale events by generation token.

- A save clip is played to its actual end. If it contains embedded recovery, no extra get-up clip is appended.
- The `goalkeeper diving safe` exception may finish its embedded get-up and then request repositioning only; it must not play a second get-up.
- A miss requests get-up only when the caller confirms the keeper is actually down.
- A failed or timed-out clip enters a terminal `failed` state rather than waiting indefinitely.
- New shots cannot interrupt an active save; queued shots start only after a terminal state.
- Fingertip is explicitly a one-shot state.

## Integration boundary
This module is an isolated lifecycle controller. The live Goalkeeper Lab and 11v11 renderer are not yet wired to it in this PR. Integration must map actual FBX clips, listen to mixer `finished` events, pass real clip-load outcomes, and synchronize repositioning with model/world coordinates. The controller intentionally does not guess clip durations or perform root-motion correction.

## Tests
Covers embedded recovery, diving-safe reposition-only exception, upright/down miss, load timeout, stale events after reset, interruption lock, serialized queue, fingertip one-shot, and invalid clip duration.
