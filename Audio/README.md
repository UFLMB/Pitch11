# PITCH 11 Audio Asset Library

This directory is the dedicated home for every music track, sound effect, and voice asset used by PITCH 11.

## Folder rules

- Keep each distinct track or sound in its own descriptive subfolder.
- Use lowercase kebab-case names.
- Keep source files in the relevant leaf folder; do not place unrelated audio files directly in a category folder.
- Store a `README.md` beside each imported asset with its exact source URL, creator, license name/version, proof of the license, download date, and any required attribution.
- Only use assets whose commercial-game use and modification rights are explicitly verified as **CC0 1.0** or **Public Domain**. "Royalty-free", "free download", or "copyright-free" labels alone are not sufficient.
- If the license or provenance cannot be verified, do not add the asset to the game.
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
│   │   ├── player/
│   │   │   ├── shoe/grass-step/
│   │   │   ├── movement/
│   │   │   ├── tackle/
│   │   │   ├── collision/
│   │   │   └── fall/
│   │   ├── ball/
│   │   │   ├── touch/
│   │   │   ├── pass/
│   │   │   ├── shot/
│   │   │   ├── header/
│   │   │   └── bounce/
│   │   ├── goalkeeper/
│   │   │   ├── catch/
│   │   │   ├── dive/
│   │   │   └── parry/
│   │   ├── goal/net/
│   │   ├── goal/post/
│   │   └── referee/
│   │       ├── whistle/
│   │       ├── foul/
│   │       └── cards/
│   ├── stadium/
│   │   ├── ambience/
│   │   ├── chants/
│   │   ├── goal-reaction/
│   │   ├── applause/
│   │   └── booing/
│   └── ui/
│       ├── navigation/
│       ├── confirm/
│       ├── back/
│       └── match-start/
└── voice/
    ├── commentary/
    ├── announcements/
    └── referee/
```

## Initial status

The folder structure is prepared for assets. No audio files have been imported or approved yet. The proposed menu track is only a listening candidate until its exact file and license are independently verified.
