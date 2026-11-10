# Third-party notices

## League-Soccer / GameplayFootball ball physics

PITCH 11's browser simulation includes an adaptation of the isolated ball-force integration from:

- Project: League-Soccer (fork of GameplayFootball)
- Repository: https://github.com/awest813/League-Soccer
- Files adapted: `src/onthepitch/ballphysics.hpp` and `src/onthepitch/ballphysics.cpp`
- Copyright: Copyright 2019 Google LLC & Bastiaan Konings
- License: Apache License 2.0
- Local adaptation: `engine/league-soccer-ballphysics.mjs`

The surrounding PITCH 11 simulation architecture and other gameplay code are separate original implementation. This notice does not claim that the complete League-Soccer game or its renderer has been ported.


## Three.js

- Project: Three.js
- Version: r170 (npm package `three@0.170.0`)
- Repository: https://github.com/mrdoob/three.js
- License: MIT
- Runtime package: `vendor/three/`
- The GitHub Pages workflow vendors the pinned npm release into the deployment artifact. The upstream license is included at `vendor/three/LICENSE`.
