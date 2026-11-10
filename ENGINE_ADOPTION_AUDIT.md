# PITCH 11 — Open-Source Football Engine Adoption Audit

**Status:** Technical audit in progress  
**Target branch:** `engine-adaptation`  
**Protected baseline:** `main` at `fbec72cbfe861b5c8cda16a86a01b90382fc66dc`  
**Primary target:** Mobile-first browser game (Android Chrome + desktop browser)

## Decision summary

League-Soccer is the strongest candidate found so far for a genuine 11v11 football simulation foundation. It is Apache-2.0 licensed and contains a substantial match simulation, player/team AI, ball physics, referee/rules, animation data, and tests.

It is **not** a drop-in browser engine. The application is a native C++17/SDL2/OpenGL/OpenAL desktop game. The current PITCH 11 runtime is a browser Canvas game with a separate stadium renderer. Replacing the PITCH 11 runtime wholesale with the upstream application would break the browser/mobile delivery target.

**Recommended direction:** extract/adapt the simulation layer, not the desktop application or renderer. Keep PITCH 11's menu, mobile controls, HUD, camera, stadium, and browser rendering. Put a deterministic simulation behind a narrow adapter so the renderer does not own football rules.

## Upstream project

- Repository: https://github.com/awest813/League-Soccer
- Upstream branch audited: `master`
- License reported by GitHub and included in repository: Apache License 2.0
- Language/build: C++17, CMake 3.14+
- Native dependencies in the game build: SDL2, SDL2_image, SDL2_ttf, SDL2_gfx, OpenGL, SQLite3, Boost; OpenAL is optional.
- Platforms documented upstream: Linux, macOS, Windows. No supported browser/WebAssembly or Android target was found in the build configuration or platform documentation.
- The repository is a fork of `vi3itor/GameplayFootball`; preserve upstream notices and attribution if code is adapted.

## What is reusable

### High-value simulation modules

- `src/onthepitch/ballphysics.*`: relatively isolated ball-force integration (gravity, drag, ground friction, bounce, wind, wetness).
- `src/onthepitch/player/controller/`: player controller abstractions and AI controller implementation.
- `src/onthepitch/player/controller/strategies/`: off-ball defensive, midfield, attacking, and goalkeeper strategies.
- `src/onthepitch/teamAIcontroller.*`: team shape, pressure, marking, attacking runs, keeper rush, and tactical role logic.
- `src/onthepitch/referee.*`, `officials.*`, and match-rule headers: candidate rule logic for offside, fouls, restarts, and officials.
- `tests/onthepitch/` and `tests/integration/`: useful behavioral references and regression cases.

### Important coupling

The match/player stack is not a clean headless library today:

- `Match` directly includes menu HUD/radar/scoreboard classes, scene objects, cameras, lights, audio, animation collections, and the scheduler.
- `Player` inherits from the existing player base and exposes a skeletal humanoid/animation representation.
- `Ball` owns scene geometry and audio resources even though its motion integration can be separated.
- The engine's player and team AI refer to the concrete `Match`, `Team`, and `Player` object graph.

This means the AI cannot simply be compiled to WebAssembly by switching one build flag. A proper headless simulation boundary has to be carved out first.

## PITCH 11 compatibility assessment

| Requirement | Assessment | Consequence |
|---|---|---|
| 11v11 simulation | Present upstream | Strong starting point |
| Player/team AI | Present upstream | Needs decoupling from scene/player presentation |
| Ball physics | Present upstream with tests | Good first extraction target |
| Browser runtime | Not supported upstream | Requires port or WASM target |
| Android browser | Not supported upstream | Must remain efficient under mobile CPU/memory limits |
| Existing PITCH 11 Canvas/HUD | Separate architecture | Preserve and connect through an adapter |
| Existing stadium runtime | Separate renderer | Keep it outside the simulation core |
| Licensing | Apache-2.0 | Keep LICENSE, notices, attribution, and change notices |

## Proposed target architecture

1. **PITCH 11 presentation layer** — existing menus, HUD, joystick/keyboard controls, cameras, stadium, player models, animation playback, sound.
2. **Simulation adapter** — stable data contract between the renderer and simulation; fixed-step updates; input commands; snapshots/events; no DOM or rendering dependencies.
3. **Football simulation core** — 22 players, teams/formations, possession, passing/shooting/tackling, player/team AI, ball physics, goalkeeper logic, referee/rules, match clock.
4. **Runtime implementation** — start with a pure TypeScript simulation module for browser compatibility; selectively consider a small C++/WASM module only after measuring the value and the build complexity.

The simulation should expose data, not draw anything. The renderer should interpolate snapshots and play animations without changing authoritative match state.

## Staged implementation plan

### Stage 0 — Safe baseline (completed for this audit)
- Create isolated `engine-adaptation` branch from current `main`.
- Do not edit `main`.
- Record compatibility and licensing constraints.

### Stage 1 — Simulation contract
- Define player, team, ball, match, input-command, event, and snapshot types.
- Define fixed timestep, deterministic update ordering, and coordinate conversion.
- Add automated tests for 22-player initialization, pitch bounds, possession, ball movement, and match-clock progression.

### Stage 2 — Physics extraction
- Reproduce the upstream ball-physics behavior in a standalone browser-safe module.
- Port the upstream ball-physics test cases as regression tests.
- Add PITCH 11-specific tests for long rolling balls, rebounds, posts/crossbar, net interactions, and goalkeeper saves.
- Do not remove the existing physics until parity tests pass.

### Stage 3 — Player and team AI
- Port/adapt movement intent, tactical positioning, support runs, pressure, marking, and goalkeeper decision-making.
- Keep AI independent of rendering and animation state.
- Validate 22 players, formation integrity, role switching, and stable frame-time budgets.

### Stage 4 — Match rules and actions
- Add pass, shot, tackle, possession transitions, offside, fouls, throw-ins, corners, goal kicks, penalties, substitutions, and match phases.
- Add replayable deterministic event logs and regression scenarios.

### Stage 5 — Presentation integration
- Connect the simulation snapshots to PITCH 11's current Canvas/stadium renderer.
- Preserve current controls and camera behavior.
- Add animation mapping only after simulation actions are reliable.

### Stage 6 — Device/performance gate
- Test Android Chrome and desktop browsers.
- Measure simulation update time separately from rendering.
- Require stable 60 FPS target on desktop and a practical mobile target before considering migration to `main`.

## Non-negotiable safety gates

- No direct edits to `main` during the prototype.
- No removal of current gameplay/physics as a shortcut.
- No upstream renderer/UI transplant into the browser app.
- No claim of Android/browser compatibility until actually tested.
- No merge until all regression tests pass and the prototype can complete a playable 11v11 match.

## Current conclusion

Proceed with a **simulation-core adaptation**, not a wholesale engine replacement. League-Soccer can supply valuable algorithms, rules, data structures, and regression references, but the browser/mobile runtime boundary must be designed and validated in PITCH 11 itself.
