# PITCH 11 Simulation Core (prototype)

This folder contains an isolated browser-first football simulation prototype. The renderer adapter is also isolated and is deliberately not wired into the production match loop yet.

## Runtime

`simulation.mjs` is a dependency-free ES module. It has no DOM, Canvas, Three.js, audio, or network dependencies.

```js
import { createSimulation } from "./simulation.mjs";

const match = createSimulation({ seed: 11, humanTeam: 0 });
match.setFormation(0, "4-4-2");
match.setFormation(1, "4-2-3-1");
match.setTactics(0, { width: 1.1, depth: 0.9, pressing: 0.8, directness: 0.7 });
const snapshot = match.update(1 / 60);
match.command({ type: "move", x: 0.7, y: -0.2, sprint: true });
match.command({ type: "pass" });
match.command({ type: "shoot", power: 1 });
match.command({ type: "tackle" });
match.command({ type: "restart" });
match.setWeather(2, -1, 0.25);
match.command({ type: "switch" });
```

The simulation uses metres and a 105 × 68 m pitch. Call `setFormation(team, name)` to switch either team independently, and `setTactics(team, settings)` to adjust width, depth, pressing and directness. Team 0 attacks toward +X; team 1 attacks toward -X. Updates are integrated at a fixed 1/60 s timestep, with a bounded accumulator.

## Current prototype scope

- 22 players and independently selectable 4-3-3, 4-4-2 and 4-2-3-1 formations
- Deterministic seeded pseudo-random decisions
- Independent team width, depth, pressing and directness tactics
- Fixed-step player movement, player separation and basic team/player AI
- AI defensive pressure and cooldown-based tackle attempts
- Possession, dribbling intent, passing and shooting
- League-Soccer-derived ball gravity, air drag, ground friction, bounce, wind and wet-pitch behavior
- Goalpost and crossbar collision response
- Goalkeeper positioning, projected shot interception, catches and parries
- Contested tackle resolution, foul awards, yellow/red cards and penalty decisions
- Offside line check and active offside receiver whistle
- Throw-in, corner, goal-kick, and free-kick restart state flow, including restart-specific offside exemptions
- Goalpost and crossbar collision response
- Goal-plane detection and kickoff reset
- First-half, second-half and full-time phases with a pausable match clock
- Seven-player benches, five-substitution limit, stoppage-only substitutions and possession transfer
- Detached snapshots and event output
- A separate adapter mapping metres to the existing PITCH 11 Canvas world (1 m = 10 legacy units)
- Camera-relative input conversion and render-frame data mapping
- A damped side-line Tele Broadcast camera with ball-velocity anticipation, attack-third zoom and touchline-aware framing

## Commands

| Type | Fields | Purpose |
|---|---|---|
| `move` | `x`, `y`, `sprint` | Move selected player (camera-relative conversion belongs in the input adapter) |
| `releaseMove` | — | Stop manual movement |
| `switch` | — | Select nearest outfield player on human team |
| `pass` | optional `targetId` | Pass to a teammate or choose an AI target |
| `shoot` | optional `power` | Shoot toward the opponent goal |
| `tackle` | — | Attempt a nearby tackle |
| `restart` | — | Take an awarded restart when play is stopped |
| `continue` | — | Start the second half after half-time |

## Browser simulation lab\n\nOpen `simulation-lab.html` through a static HTTP server (ES modules do not run reliably from `file://`). The standalone 3D lab generates its pitch, stadium stands, crowd, LED boards, floodlights, goals, player meshes and ball locally; it does not require an external stadium GLB. Three.js r170 is vendored into `vendor/three` during the Pages build and loaded from the same origin; the browser runtime does not fetch the Three.js library from a CDN. Desktop controls: WASD/arrows to move, Shift to sprint, P to pass, Space to shoot, E to switch, Q to tackle, R to take a restart, Esc to pause. Touch devices use the virtual joystick and on-screen actions. Landscape orientation is required on phones. The lab uses a side-line Tele Broadcast camera that smoothly follows the ball, anticipates fast travel, and tightens framing near either penalty area. Stadium roof meshes use a dedicated Three.js layer: the broadcast camera omits that layer while alternate/replay cameras can enable it, so the roof remains visible in other views. The camera is shared by desktop and landscape mobile layouts, with a slightly wider mobile frame. The lab accelerates match time for quick validation.\n\nThe lab remains a separate simulation entry point, but shares the same locally vendored Three.js runtime and locally packaged stadium assets as `index.html`, `stadium-runtime.js` and `graphics3d.html`. It does not yet replace the production match runtime. Browser/WebGL and Android performance checks are still required before production integration.\n\n## Regression tests

Run locally with Node.js 22 or later:

```sh
node --test engine/*.test.mjs
```

The same test command runs in GitHub Actions on pushes to `engine-adaptation` and pull requests targeting `main`.

## Not production-ready yet

Advantage, full keeper dive/animation logic, player collision avoidance, tactical depth, team tactics, and the PITCH 11 presentation adapter are not complete. `callFoul(tackler, victim, { card })` is available to the referee/rules layer. `substitute(team, playerOffId, benchIndex)` allows up to five changes during a stoppage. Advantage and automatic disciplinary thresholds remain incomplete. The adapter in `pitch11-adapter.mjs` is not imported by `index.html` yet. The prototype must not replace the existing match engine until the remaining systems are implemented and validated.