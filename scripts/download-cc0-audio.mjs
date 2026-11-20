import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const root = "https://sfxmint.com/dl/";
const assets = [
  ["soccer-ball-kick-05.mp3", "Audio/sounds/gameplay/ball/shot/hard-kick-05.mp3"],
  ["soccer-ball-kick-06.mp3", "Audio/sounds/gameplay/ball/header/header-06.mp3"],
  ["soccer-ball-kick-08.mp3", "Audio/sounds/gameplay/ball/pass/long-pass-08.mp3"],
  ["soccer-ball-kick-09.mp3", "Audio/sounds/gameplay/goal/net/net-hit-09.mp3"],
  ["soccer-ball-kick-10.mp3", "Audio/sounds/gameplay/goal/post/post-hit-10.mp3"],
  ["soccer-ball-kick-04.mp3", "Audio/sounds/gameplay/ball/bounce/grass-bounce-04.mp3"],
  ["soccer-ball-kick-02.mp3", "Audio/sounds/gameplay/ball/touch/dribble-02.mp3"],
  ["footsteps-grass-05.mp3", "Audio/sounds/gameplay/player/shoe/grass-step/single-step-05.mp3"],
  ["instrument-whistle-11.mp3", "Audio/sounds/gameplay/referee/whistle/single-sharp-11.mp3"],
  ["ready-click-06.mp3", "Audio/sounds/ui/navigation/ui-click-06.mp3"],
  ["stadium-crowd-02.mp3", "Audio/sounds/stadium/goal-reaction/goal-cheer-02.mp3"],
  ["stadium-crowd-03.mp3", "Audio/sounds/stadium/ambience/murmuring-loop-03.mp3"],
  ["stadium-crowd-05.mp3", "Audio/sounds/stadium/applause/applause-05.mp3"],
  ["stadium-crowd-01.mp3", "Audio/sounds/stadium/booing/booing-01.mp3"],
  ["stadium-crowd-04.mp3", "Audio/sounds/stadium/goal-reaction/crowd-whistle-04.mp3"]
];

const results = [];
for (const [file, destination] of assets) {
  let result = null;
  for (let attempt = 1; attempt <= 3 && !result; attempt++) {
    try {
      const response = await fetch(root + file, {
        signal: AbortSignal.timeout(20000),
        headers: { "User-Agent": "PITCH-11-CC0-audio-build/1.0" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const isMp3 = bytes.length > 1024 &&
        ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
         (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
      if (!isMp3) throw new Error("response is not a valid MP3 payload");
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, bytes);
      result = {
        file,
        path: destination,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        license: "CC0-1.0",
        source: root + file
      };
      console.log(`Downloaded and validated ${file} -> ${destination} (${bytes.length} bytes)`);
    } catch (error) {
      console.warn(`Audio download attempt ${attempt}/3 failed for ${file}: ${error.message}`);
    }
  }
  if (result) results.push(result);
  else console.error(`FAILED: ${file}; this asset will not be present in the Pages artifact.`);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  provider: "SFXMint",
  license: "CC0-1.0",
  expected: assets.length,
  downloaded: results.length,
  complete: results.length === assets.length,
  assets: results
};
await mkdir("Audio", { recursive: true });
await writeFile("Audio/audio-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`CC0 audio build step: ${results.length}/${assets.length} files downloaded and validated.`);

if (!manifest.complete && process.env.P11_AUDIO_ALLOW_PARTIAL !== "1") {
  throw new Error(`Refusing to publish incomplete audio: ${results.length}/${assets.length} assets downloaded. Set P11_AUDIO_ALLOW_PARTIAL=1 only for an intentional fallback-only build.`);
}
