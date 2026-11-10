# PITCH 11 Simulation Core (prototype)

This folder contains an isolated browser-first football simulation prototype. The renderer adapter is also isolated and is deliberately not wired into the production match loop yet.

## Runtime

`simulation.mjs` is a dependency-free ES module. It has no DOM, Canvas, Three.js, audio, or network dependencies.

```js
import { createSimulation } from "./simulation.mjs";

const match = createSimulation({ seed: 11, humanTeam: 0 });
const snapshot = match.update(1 / 60);
match.command({ type: "move", x: 0.7, y: -0.2, sprint: true });
match.command({ type: "pass" });
match.command({ type: "shoot", power: 1 });
match.command({ type: "tackle" });
match.command({ type: "restart" });
match.setWeather(2, -1, 0.25);
match.command({ type: "switch" });
```

The simulation uses metres and a 105 × 68 m pitch. Team 0 attacks toward +X; team 1 attacks toward -X. Updates are integrated at a fixed 1/60 s timestep, with a bounded accumulator.

## Current prototype scope

- 22 players and two 4-3-3 formations
- Deterministic seeded pseudo-random decisions
- Fixed-step player movement and basic team/player AI
- Possession, dribbling intent, passing and shooting
- League-Soccer-derived ball gravity, air drag, ground friction, bounce, wind and wet-pitch behavior
- Goalpost and crossbar collision response
- Goalkeeper positioning, projected shot interception, catches and parries
- Contested tackle resolution
- Offside line check and active offside receiver whistle
- Throw-in, corner, goal-kick, and free-kick restart state flow, including restart-specific offside exemptions
- Goalpost and crossbar collision response
- Goal-plane detection and kickoff reset
- First-half, second-half and full-time phases with a pausable match clock
- Detached snapshots and event output
- A separate adapter mapping metres to the existing PITCH 11 Canvas world (1 m = 10 legacy units)
- Camera-relative input conversion and render-frame data mapping

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

## Regression tests

Run locally with Node.js 22 or later:

```sh
node --test engine/*.test.mjs
```

The same test command runs in GitHub Actions on pushes to `engine-adaptation` and pull requests targeting `main`.

## Not production-ready yet

Fouls, advantage, cards, penalties, substitutions, full keeper dive/animation logic, player collision avoidance, tactical depth, team tactics, and the PITCH 11 presentation adapter are not complete. The adapter in `pitch11-adapter.mjs` is not imported by `index.html` yet. The prototype must not replace the existing match engine until the remaining systems are implemented and validated.