# PITCH 11 CC0 audio source integration

Updated: 2026-11-20

## Integration status

The game now has an optional CC0 audio-source bridge. It streams the listed MP3 files directly from SFXMint, whose individual sound pages state CC0 1.0, commercial-game use, modification/redistribution rights, and direct hotlink permission.

**Important:** the MP3 binaries could not be downloaded into this repository in the current build environment because external DNS/network access failed. These are therefore remote streaming sources, not locally vendored assets. Existing synthesized Web Audio remains active as a fallback. The game remains playable if a remote source is unavailable, but the streamed assets require an internet connection.

## Source register

| Game role | Asset | Exact source page | Direct stream | License |
|---|---|---|---|---|
| Ball shot / kick | Hard Kick Soccer Ball Kick 05 | https://sfxmint.com/sounds/soccer-ball-kick-05 | https://sfxmint.com/dl/soccer-ball-kick-05.mp3 | CC0 1.0 |
| Header | Header Soccer Ball Kick 06 | https://sfxmint.com/sounds/soccer-ball-kick-06 | https://sfxmint.com/dl/soccer-ball-kick-06.mp3 | CC0 1.0 |
| Long pass | Long Pass Soccer Ball Kick 08 | https://sfxmint.com/sounds/soccer-ball-kick-08 | https://sfxmint.com/dl/soccer-ball-kick-08.mp3 | CC0 1.0 |
| Goal net | Goal Net Soccer Ball Kick 09 | https://sfxmint.com/sounds/soccer-ball-kick-09 | https://sfxmint.com/dl/soccer-ball-kick-09.mp3 | CC0 1.0 |
| Goal post | Goal Post Soccer Ball Kick 10 | https://sfxmint.com/sounds/soccer-ball-kick-10 | https://sfxmint.com/dl/soccer-ball-kick-10.mp3 | CC0 1.0 |
| Grass bounce | Grass Bounce Soccer Ball Kick 04 | https://sfxmint.com/sounds/soccer-ball-kick-04 | https://sfxmint.com/dl/soccer-ball-kick-04.mp3 | CC0 1.0 |
| Dribble | Dribble Soccer Ball Kick 02 | https://sfxmint.com/sounds/soccer-ball-kick-02 | https://sfxmint.com/dl/soccer-ball-kick-02.mp3 | CC0 1.0 |
| Grass step | Single Step Footsteps Grass 05 | https://sfxmint.com/sounds/footsteps-grass-05 | https://sfxmint.com/dl/footsteps-grass-05.mp3 | CC0 1.0 |
| Referee whistle | Single Sharp Referee Whistle Blow 11 | https://sfxmint.com/sounds/instrument-whistle-11 | https://sfxmint.com/dl/instrument-whistle-11.mp3 | CC0 1.0 |
| UI click | UI click 06 | https://sfxmint.com/sounds/ready-click-06 | https://sfxmint.com/dl/ready-click-06.mp3 | CC0 1.0 |
| Goal crowd | Goal Cheering Stadium Crowd 02 | https://sfxmint.com/sounds/stadium-crowd-02 | https://sfxmint.com/dl/stadium-crowd-02.mp3 | CC0 1.0 |
| Stadium loop | Murmuring Stadium Crowd 03 | https://sfxmint.com/sounds/stadium-crowd-03 | https://sfxmint.com/dl/stadium-crowd-03.mp3 | CC0 1.0 |
| Applause | Applauding Stadium Crowd 05 | https://sfxmint.com/sounds/stadium-crowd-05 | https://sfxmint.com/dl/stadium-crowd-05.mp3 | CC0 1.0 |
| Booing | Booing Stadium Crowd 01 | https://sfxmint.com/sounds/stadium-crowd-01 | https://sfxmint.com/dl/stadium-crowd-01.mp3 | CC0 1.0 |
| Crowd whistle | Whistling Clapping Stadium Crowd 04 | https://sfxmint.com/sounds/stadium-crowd-04 | https://sfxmint.com/dl/stadium-crowd-04.mp3 | CC0 1.0 |

## Source and rights notes

- Creator/publisher: SFXMint (individual sound pages identify each item; the publisher states its library is dedicated under CC0 1.0).
- License: CC0 1.0 Universal, as stated on each individual asset page.
- Permission: commercial games, modification and redistribution; direct hotlinking explicitly allowed by the publisher.
- Attribution: not required by CC0; source register retained for provenance.
- Review date: 2026-11-20.
- Download date: not applicable; no binary download succeeded in this environment.

## Not imported yet

- Main-menu music: no track has been added. The previously discussed OpenGameArt candidate was not locally retrievable and has not been independently validated at the downloadable-file level.
- Player shoe/grass step: source registered and exposed through the audio bridge, but precise animation-footfall timing is not yet connected.
- Other contact, fall, goalkeeper, commentary and announcement sounds: left untouched until appropriate event hooks and reliable file sources are verified.
