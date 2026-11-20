# PITCH 11 Audio Asset Library

This directory contains the audio assets used by PITCH 11.

## Current status

- The existing main-menu music is retained at `music/menu/main-theme/hella bumps.mp3`.
- The previous SFXMint sound set and its automatic build-time downloader have been removed.
- The new, separately selected football recordings and Kenney interface sounds have not yet been imported. Do not treat empty folders or placeholder files as audio assets.
- Keep each sound in its relevant leaf folder and use descriptive lowercase kebab-case filenames.
- For every imported asset, add a nearby `README.md` recording the exact source URL, creator, license/version, proof of permission for game use, download date, and required attribution.
- Do not import assets until their redistribution and commercial-game rights are verified.
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
