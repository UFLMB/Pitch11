import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script>/gi)];

test("stadium runtime external module has no ignored inline source", () => {
  const runtime = scripts.find(([, attrs]) => /\\bsrc=["']\\.\\/stadium-runtime\\.js["']/.test(attrs));
  assert.ok(runtime, "stadium-runtime.js module script must exist");
  assert.equal(runtime[2].trim(), "", "external module script must not contain inline code");
});

test("penalty and restart second-touch handlers are in an executable inline script", () => {
  const lawHandlers = scripts.find(([, attrs, body]) =>
    !/\\bsrc\\s*=/.test(attrs) &&
    body.includes("function resolveAccidentalPenaltyDoubleTouch") &&
    body.includes("penaltyAccidentalDoubleTouchDecision")
  );
  assert.ok(lawHandlers, "Law 14 accidental double-touch handler must be in a standalone inline script");
  assert.match(lawHandlers[2], /goal\\s*=\\s*function/);
  assert.match(lawHandlers[2], /outOfPlay\\s*=\\s*function/);
  assert.match(lawHandlers[2], /update\\s*=\\s*function/);
  assert.match(lawHandlers[2], /take\\s*=\\s*function/);
});
