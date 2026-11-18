# PITCH 11 — Player animation coverage audit

**Date:** 2026-11-18  
**Branch reviewed:** `main`  
**Scope:** current `input/player-package/` Mixamo FBX inventory, current match-render path, and animation requirements for replacing placeholder/legacy player presentation with fully animated 3D players.

## Executive result

- **54/54 FBX files are present** in `input/player-package/`.
- The isolated Mixamo direct-binding audit previously reported **54 PASS / 0 FAIL** against the uploaded `character.fbx`.
- The passing audit proves that the clips can bind to that character skeleton in the diagnostic player. It does **not** prove that every football gameplay action has a dedicated clip, or that the clips are already wired into the live match state machine.
- The current match players are still drawn by the procedural Canvas 2D player renderer (`drawPlayer3`; the legacy `drawPlayer` functions are disabled). Despite its name, `drawPlayer3` is not a skinned 3D character renderer. The Mixamo audit page remains a separate diagnostic; the FBX clips are not yet integrated into the live match.
- The existing set is a strong first animation pack, but **not yet complete for a full UFL/EA FC-style 11v11 animation system**.

## Current clip inventory

All entries below are present in the repository. Numbered variants are separate source files and should be preserved until their differences are reviewed.

### Locomotion and basic movement — 9 files

| Source clip | Coverage |
|---|---|
| `offensive idle.fbx` | Standing / attacking idle |
| `jog forward.fbx` | Forward jog |
| `jog backward.fbx` | Backward jog |
| `jog forward diagonal.fbx` | Forward diagonal jog |
| `jog forward diagonal (2).fbx` | Forward diagonal variant |
| `jog backward diagonal.fbx` | Backward diagonal jog |
| `jog backward diagonal (2).fbx` | Backward diagonal variant |
| `jog strafe left.fbx`, `jog strafe right.fbx` | Lateral movement |

**Gap:** no clearly identified walk cycle, sprint cycle, run-start/run-stop, turn-in-place, sharp pivot, or dedicated ball-carrying locomotion cycle.

### Outfield ball actions — 16 files

| Source clip(s) | Coverage |
|---|---|
| `receive soccerball.fbx` | Receiving / first touch |
| `stall soccerball.fbx`, `stall soccerball (2).fbx`, `stall soccerball (3).fbx`, `stall soccerball (4).fbx` | Ball control / stall variants |
| `kick soccerball.fbx`, `kick soccerball (2).fbx` | General kick / strike variants |
| `kick up soccerball.fbx` | Lifting the ball |
| `kneeing soccerball.fbx`, `kneeing soccerball (2).fbx` | Knee touch / aerial control |
| `header soccerball.fbx`, `header soccerball (2).fbx` | Header variants |
| `soccer penalty kick.fbx` | Penalty-style kick |
| `scissor kick.fbx` | Acrobatic / scissor kick |
| `strike foward jog.fbx` | Strike while moving |
| `throw in.fbx` | Throw-in |

**Gap:** no clearly identified dedicated short pass, driven pass, long pass, through-ball pass, cross, volley, controlled shot, finesse shot, power shot, or distinct weak-foot action. Some may be approximated with the general kick clips, but that is a gameplay mapping decision—not proof of a dedicated animation.

### Defending, falls and recovery — 7 files

| Source clip(s) | Coverage |
|---|---|
| `soccer tackle.fbx`, `soccer tackle (2).fbx`, `soccer tackle (3).fbx` | Tackle variants |
| `soccer trip.fbx` | Trip / loss of balance |
| `fallen idle.fbx` | Downed idle |
| `standing up.fbx` | Get-up recovery |
| `transition.fbx` | General transition; exact gameplay use needs visual classification |

**Gap:** no clearly identified jockey / defensive side-shuffle, standing block, shoulder challenge, push-off, stumble recovery, or separate left/right fall and get-up variants.

### Goalkeeper — 22 files

| Source clip(s) | Coverage |
|---|---|
| `goalkeeper idle.fbx`, `goalkeeper idle (2).fbx` | Keeper idle variants |
| `goalkeeper sidestep.fbx`, `goalkeeper sidestep (2).fbx` | Lateral positioning |
| `goalkeeper directing.fbx`, `goalkeeper directing (2).fbx` | Organising / directing |
| `goalkeeper catch.fbx`, `goalkeeper catch (2).fbx`, `goalkeeper catch (3).fbx`, `goalkeeper catch (4).fbx` | Catch variants |
| `goalkeeper scoop.fbx` | Low collection |
| `goalkeeper body block.fbx`, `goalkeeper body block (2).fbx`, `goalkeeper body block (3).fbx` | Body-block variants |
| `goalkeeper diving save.fbx`, `goalkeeper diving save (2).fbx` | Diving-save variants |
| `goalkeeper miss.fbx` | Miss / failed save reaction |
| `goalkeeper pass.fbx` | Distribution pass |
| `goalkeeper drop kick.fbx` | Drop-kick distribution |
| `goalkeeper overhand throw.fbx` | Overarm distribution |
| `goalkeeper placing ball.fbx`, `goalkeeper placing ball (2).fbx` | Ball placement / restart |

**Gap:** no clearly identified high claim / jumping catch, punch clearance, one-handed fingertip save, post-save recovery/get-up, goalkeeper sprint/run, or dedicated penalty-ready stance. Confirm whether the current catch and dive variants cover these before sourcing more clips.

> Inventory note: the 54-file total is the repository's actual file count. This document groups clips by gameplay role; a source file may support more than one gameplay situation.

## Required coverage before calling the animation set complete

| System | Required states / transitions | Current assessment |
|---|---|---|
| Locomotion | idle, walk, jog, sprint, accelerate, decelerate, stop, turn, pivot, lateral shuffle | Partial |
| Ball carry | close dribble, running dribble, sprint dribble, turn with ball, shield, stop/control | Partial |
| Passing | short, driven, long, through ball, cross, one-touch pass | Partial; general kicks only |
| Shooting | normal, power, finesse, first-time, volley, header, weak-foot variants | Partial |
| Receiving | ground control, cushioned touch, aerial control, awkward reception | Partial |
| Defending | jockey, contain, tackle, standing block, shoulder challenge, interception | Partial |
| Contact / falls | stumble, trip, fall, downed idle, get up, collision recovery | Partial |
| Set pieces | throw-in, penalty, free-kick stance/run-up, corner delivery, wall jump | Partial |
| Goalkeeper | set stance, shuffle, dive both sides, catch, parry, punch, claim, recover, distribute | Partial |
| Reactions | goal celebration, disappointment, appeal, referee interaction, teammate interaction | Missing / not identified |
| Team moments | group celebration, high-five, handshake, huddle, walkout | Missing / not identified |

## Integration and validation requirements

1. Keep the original FBX files unchanged as source assets.
2. Use the tested Mixamo `character.fbx` rig as the compatibility reference; do not route these clips through the legacy Bip01 rig.
3. Build a production animation state map from actual gameplay events (movement speed, ball possession, pass/shot type, tackle/fall state, keeper action).
4. Add blend transitions between idle, locomotion, ball-carrying and action clips; avoid abrupt one-frame cuts.
5. Root motion must be handled deliberately: gameplay position/velocity remains authoritative unless a specific action is explicitly designed to own root motion.
6. Validate foot contact, facing direction, clip duration, ball-contact frame, left/right mirroring and end pose in the live match camera.
7. Keep the diagnostic audit isolated. Do not replace the live player model, alter match physics, or change the production renderer as part of this inventory task.
8. Before sourcing more assets, visually classify the existing numbered variants. Several may already cover more than their filenames suggest.

## Bottom line

The current pack is sufficient to prototype a convincing animated footballer and a useful first goalkeeper. It is **not yet a complete animation library** for all 11v11 match situations. The highest-value missing additions are:

1. walk + sprint + start/stop/pivot locomotion;
2. dedicated dribbling locomotion with the ball;
3. short/long/driven pass and cross;
4. shot variants and volley;
5. jockey / block / contact recovery;
6. celebration and team reactions;
7. goalkeeper punch, high claim and recovery.

This is a coverage assessment, not an instruction to integrate or replace production assets yet. The next engineering phase must replace the procedural Canvas player-body renderer with the skinned Mixamo character renderer, while retaining the existing match simulation, player coordinates, ball physics, camera and HUD. The next engineering phase must replace the procedural Canvas player-body renderer with the skinned Mixamo character renderer, while retaining the existing match simulation, player coordinates, ball physics, camera and HUD.
