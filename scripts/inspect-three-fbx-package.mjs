import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FBXLoader } from "../vendor/three/examples/jsm/loaders/FBXLoader.js";

const directory = fileURLToPath(new URL("../input/player-package/", import.meta.url));
async function collect(dir, relative = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path.join(dir, entry.name), name));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".fbx")) files.push(name);
  }
  return files.sort();
}

const loader = new FBXLoader();
const files = await collect(directory);
const results = [];
for (const file of files) {
  const fullPath = path.join(directory, file);
  const bytes = await readFile(fullPath);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const messages = [];
  const originalWarn = console.warn;
  const originalError = console.error;
  let error = "";
  console.warn = (...args) => messages.push({ level: "warn", message: args.map(String).join(" ") });
  console.error = (...args) => messages.push({ level: "error", message: args.map(String).join(" ") });
  try {
    const scene = loader.parse(arrayBuffer, "");
    if (!scene.animations?.length) error = "FBXLoader parsed the file but found no animation clips";
    results.push({ file, ok: !error, clips: scene.animations?.length || 0, tracks: scene.animations?.[0]?.tracks?.length || 0, error, messages });
  } catch (cause) {
    error = cause?.stack || cause?.message || String(cause);
    results.push({ file, ok: false, clips: 0, tracks: 0, error, messages });
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
}

const failed = results.filter(result => !result.ok || result.messages.some(message => message.level === "error"));
console.log(JSON.stringify({
  loader: "three@0.170.0 FBXLoader",
  directory: "input/player-package",
  checked: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results
}, null, 2));
if (failed.length) process.exitCode = 1;
