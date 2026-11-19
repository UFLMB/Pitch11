import fs from "node:fs";
import path from "node:path";
import * as THREE from "../vendor/three/build/three.module.js";
import { FBXLoader } from "../vendor/three/examples/jsm/loaders/FBXLoader.js";

const files = [
  "goalkeeper diving save.fbx",
  "goalkeeper diving save (2).fbx"
];
const loader = new FBXLoader();
const report = [];

for (const file of files) {
  const fullPath = path.resolve("input/player-package", file);
  if (!fs.existsSync(fullPath)) throw new Error("Missing animation asset: " + fullPath);
  const bytes = fs.readFileSync(fullPath);
  const root = loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), path.dirname(fullPath) + path.sep);
  const clip = root.animations?.[0];
  if (!clip) throw new Error(file + " has no animation clip");
  const tracks = clip.tracks.filter(track => /\\.position$/i.test(track.name));
  const rootTracks = tracks.filter(track => {
    const target = track.name.slice(0, track.name.lastIndexOf(".")).replace(/[^a-z0-9]/gi, "").toLowerCase();
    return /^(mixamorig)?(hips|root)$/.test(target);
  });
  const summarize = track => {
    const size = track.getValueSize();
    const values = track.values;
    const frames = [];
    for (let i = 0; i < values.length; i += size) frames.push([values[i], values[i + 1], values[i + 2]]);
    const first = frames[0], last = frames[frames.length - 1];
    const mins = [0, 1, 2].map(axis => Math.min(...frames.map(v => v[axis])));
    const maxs = [0, 1, 2].map(axis => Math.max(...frames.map(v => v[axis])));
    return { track: track.name, frames: frames.length, first, last, delta: last.map((v, i) => v - first[i]), min: mins, max: maxs, range: maxs.map((v, i) => v - mins[i]) };
  };
  report.push({
    file,
    duration: clip.duration,
    trackCount: clip.tracks.length,
    positionTrackCount: tracks.length,
    rootTracks: rootTracks.map(summarize),
    otherLargestPositionTracks: tracks.filter(t => !rootTracks.includes(t)).map(summarize).sort((a, b) => Math.max(...b.range) - Math.max(...a.range)).slice(0, 5)
  });
}
console.log(JSON.stringify(report, null, 2));
