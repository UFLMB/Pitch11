# PITCH 11 gameplay source modules

The gameplay source previously lived in one inline script in `index.html`. This extraction keeps the original source order and behavior while giving the game distinct, reviewable files by subsystem.

## Loading order

The numbered classic scripts are loaded synchronously in `index.html` and in numeric order. They intentionally share the existing global lexical environment: later feature layers extend or replace earlier functions and rely on the established game globals. Do not add `type="module"`, `async`, or `defer` to these script tags without first migrating the global dependencies.

## Module map

- `00-core-config-input.js`: configuration, state, base input and gesture state
- `01-actions-physics.js`: player actions, ball/player physics
- `02-ai-rules-loop.js`: AI, match rules, fixed-step loop
- `03-render-ui.js`: renderers and core match UI
- `04-clubs-career.js`: clubs, squads, tactics, menus, career/save logic
- `05-match-presentation.js`: replay, statistics, commentary, audio and presentation
- `06-animation-attacking-input.js`: animation and attacking input extensions
- `07-defence-pass-extensions.js`: defensive controls and passing extensions
- `08-ai-gameplay-polish.js`: AI and gameplay tuning/feature layers
- `09-ui-stadium-cutscenes.js`: menu/UI polish, camera and matchday cutscenes
- `10-gameplay-boot.js`: gameplay 3.0, boot and loading integration
- `11-settings.js`: responsive settings system

This is the first safe modularization boundary, not the final dependency-isolation stage. The next stage should convert subsystem interfaces to explicit APIs and remove shared global state incrementally, with regression tests between each migration.
