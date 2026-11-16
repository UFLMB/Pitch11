import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];

test("stadium runtime is dynamically imported and startup failures are surfaced", () => {
  const runtime = scripts.find(([, attrs, body]) =>
    /type=["']module["']/.test(attrs) && body.includes("import('./stadium-runtime.js')")
  );
  assert.ok(runtime, "stadium-runtime.js dynamic module bootstrap must exist");
  assert.match(runtime[2], /import\('\.\/stadium-runtime\.js'\)\.catch/);
  assert.match(runtime[2], /boot\.state\s*=\s*'runtime-error'/);
});

test("penalty and restart second-touch handlers are in an executable inline script", () => {
  const lawHandlers = scripts.find(([, attrs, body]) =>
    !/\bsrc\s*=/.test(attrs) &&
    body.includes("function resolveAccidentalPenaltyDoubleTouch") &&
    body.includes("penaltyAccidentalDoubleTouchDecision")
  );
  assert.ok(lawHandlers, "Law 14 accidental double-touch handler must be in a standalone inline script");
  assert.match(lawHandlers[2], /goal\s*=\s*function/);
  assert.match(lawHandlers[2], /outOfPlay\s*=\s*function/);
  assert.match(lawHandlers[2], /update\s*=\s*function/);
  assert.match(lawHandlers[2], /take\s*=\s*function/);
});
