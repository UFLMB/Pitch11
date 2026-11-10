# PITCH 11 Simulation Core (prototype)

This folder contains an isolated browser-first football simulation prototype. It is deliberately not wired into the production match loop yet.

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
- Basic goalkeeper positioning and ball claims
- Contested tackle resolution
- Offside line check and active offside receiver whistle
- Throw-in, corner, goal-kick, and free-kick restart state flow
- Goalpost and crossbar collision response
- Goal-plane detection and kickoff reset
- Detached snapshots and event output

## Commands

| Type | Fields | Purpose |
|---|---|---|
| `move` | `x`, `y`, `sprint` | Move selected player (camera-relative conversion belongs in the input adapter) |
| `releaseMove` | — | Stop manual movement |
| `switch` | — | Select nearest outfield player on human team |
| `pass` | optional `targetId` | Pass to a teammate or choose an AI target |
| `shoot` | optional `power` | Shoot toward the opponent goal |
| `tackle` | — | Attempt a nearby tackle |

## Regression tests

Run locally with Node.js 22 or later:

```sh
node --test engine/*.test.mjs
```

The same test command runs in GitHub Actions on pushes to `engine-adaptation` and pull requests targeting `main`.

## Not production-ready yet

Fouls, advantage, cards, penalties, substitutions, full match phases, full keeper dive/animation logic, player collision avoidance, tactical depth, team tactics, and the PITCH 11 presentation adapter are not complete. The prototype must not replace the existing match engine until these systems are implemented and validated.