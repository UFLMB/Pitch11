import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");

test("FC and eFootball presets use valid in-screen edge offsets", () => {
  const match = html.match(/const PRESETS=\{([\s\S]*?)\n\};/);
  assert.ok(match, "control presets must exist");
  assert.doesNotMatch(match[1], /-\s*\d+(?:\.\d+)?/, "preset offsets must not place controls beyond the screen edges");
  assert.match(match[1], /fc:\[\[/);
  assert.match(match[1], /efoot:\[\[/);
});

test("syncLayout clamps action buttons and joystick to safe screen bounds", () => {
  const start = html.indexOf("function syncLayout()");
  const end = html.indexOf("\nconst _dc10", start);
  assert.ok(start >= 0 && end > start, "syncLayout function must exist");
  const source = html.slice(start, end);
  assert.match(source, /const r=b\.m\*u,pad=Math\.max\(8,r\*0\.35\)/);
  assert.match(source, /b\.dx=\(W-x\)\/u;b\.dy=\(H-y\)\/u/);
  assert.match(source, /G\.joy\[0\]=minX<=maxX\?clamp/);
  assert.match(source, /G\.joy\[1\]=minY<=maxY\?clamp/);
});

test("layout editor previews the joystick and constrains drags to the viewport", () => {
  const start = html.indexOf("let layoutDrag=null,layoutSel=0;");
  const end = html.indexOf("/* ---------- cheat sheet", start);
  assert.ok(start >= 0 && end > start, "layout editor block must exist");
  const source = html.slice(start, end);
  assert.match(source, /drawJoy\(jx,jy,jr,jx,jy,jr\*0\.42,false\)/);
  assert.match(source, /layoutDrag=\{i,pid:e\.pointerId\}/);
  assert.match(source, /e\.pointerId!==layoutDrag\.pid/);
  assert.match(source, /clamp\(e\.clientX,r\+pad,W-r-pad\)/);
  assert.match(source, /clamp\(e\.clientY,r\+pad,H-r-pad\)/);
  assert.match(source, /addEventListener\('pointercancel',endLayoutDrag\)/);
});

test("swipe-anywhere starts from the real pointer and uses shared cancellation handling", () => {
  const start = html.indexOf("/* swipe-anywhere right side");
  const end = html.indexOf("/* ===================== 18.", start);
  assert.ok(start >= 0 && end > start, "swipe-anywhere handler must exist");
  const source = html.slice(start, end);
  assert.match(source, /cv\.addEventListener\('pointerdown'/);
  assert.match(source, /gDown\(slot,e\.pointerId,e\.clientX,e\.clientY\)/);
  assert.match(source, /btnAt\(e\.clientX,e\.clientY\)/);
  assert.match(source, /pauseBtn\.x/);
  assert.match(source, /camBtn\.x/);
  assert.doesNotMatch(source, /press\(slot,'sw/);
  assert.doesNotMatch(source, /addEventListener\('pointerup'/);
});
