import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const MODULE_PATTERN = /^\d{2}-.*\.js$/;

export function readGameplayScripts(root) {
  const directory = resolve(root, "engine/gameplay");
  return readdirSync(directory).filter(file => MODULE_PATTERN.test(file)).sort()
    .map(file => ({ file, source: readFileSync(resolve(directory, file), "utf8") }));
}

export function readGameplaySource(root) {
  return readGameplayScripts(root).map(({ source }) => source).join("\n");
}
