# PITCH 11 Audio Asset Library

This directory contains the audio assets used by PITCH 11.

## Current status

- The existing main-menu music is retained at `music/menu/main-theme/hella bumps.mp3` and is wired to the main-menu music setting.
- The UI sound effects are present and wired: navigation click, menu open, back, confirm, and match start.
- The UI sound files are stored in their matching leaf folders under `sounds/ui/`; do not move them into the music folders.
- Source URLs, creators, license/version details, game-use permissions, and attribution still need to be documented in `ASSET-SOURCES.md` before treating these files as cleared for redistribution or commercial use.
- The previous SFXMint audio set and its automatic build-time downloader have been removed.
- Football gameplay recordings (ball, player, goalkeeper, referee, and stadium) are not currently supplied by this audio set. Do not substitute menu sounds for gameplay sounds or assume empty folders contain audio.
- Keep each sound in its relevant leaf folder and use descriptive lowercase kebab-case filenames.
- Do not add copyrighted EA SPORTS FC tracks, commercial recordings, or unlicensed imitations.

## Audio layout

```text
Audio/
├── music/
│   ├── menu/main-theme/
│   ├── team-selection/
│   ├── walkout/
│   ├── victory/
│   ├── defeat/
│   └── halftime/
├── sounds/
│   ├── gameplay/
│   │   ├── player/shoe/grass-step/
│   │   ├── ball/{touch,pass,shot,header,bounce}/
│   │   ├── goalkeeper/{catch,dive,parry}/
│   │   ├── goal/{net,post}/
│   │   └── referee/{whistle,foul,cards}/
│   ├── stadium/{ambience,chants,goal-reaction,applause,booing}/
│   └── ui/{navigation,confirm,back,match-start}/
└── voice/{commentary,announcements,referee}/
```
