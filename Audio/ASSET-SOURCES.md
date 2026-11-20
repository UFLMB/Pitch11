# PITCH 11 CC0 audio source integration

Updated: 2026-11-20

## Integration status

The game now has an optional CC0 audio-source bridge. It streams the listed MP3 files directly from SFXMint, whose individual sound pages state CC0 1.0, commercial-game use, modification/redistribution rights, and direct hotlink permission.

**Important:** the interactive workspace could not download MP3 binaries because external DNS/network access failed. The GitHub Actions Pages deployment now downloads and validates the MP3 files into their matching `Audio/` subfolders before publishing the site. The binaries are generated into the deployment artifact rather than committed to the source branch. If an individual download fails, the game falls back to the provider's explicitly hotlinkable CC0 stream; if that also fails, the existing synthesized Web Audio remains available.

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
- Source review date: 2026-11-20. Build-time download date: the timestamp of each successful GitHub Pages build; GitHub Actions logs record the exact file results.

## Not imported yet

- Main-menu music: no track has been added. The previously discussed OpenGameArt candidate was not retrievable in this environment and has not been independently validated at the downloadable-file level.
- Player shoe/grass step: the asset is downloaded into the deployment artifact and exposed through the audio bridge, but precise animation-footfall timing is not yet connected.
- Other contact, fall, goalkeeper, commentary and announcement sounds: left untouched until appropriate event hooks and reliable file sources are verified.
