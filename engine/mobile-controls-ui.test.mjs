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

test("syncLayout clamps action buttons and delegates joystick bounds", () => {
  const start = html.indexOf("function syncLayout()");
  const end = html.indexOf("\nfunction clampJoyLayout()", start);
  assert.ok(start >= 0 && end > start, "syncLayout function must exist");
  const source = html.slice(start, end);
  assert.match(source, /const r=b\.m\*u,pad=Math\.max\(8,r\*0\.35\)/);
  assert.match(source, /b\.dx=\(W-x\)\/u;b\.dy=\(H-y\)\/u/);
  assert.match(source, /clampJoyLayout\(\)/);
  const joyStart = end + 1;
  const joyEnd = html.indexOf("\n}", joyStart);
  assert.ok(joyEnd > joyStart, "joystick clamp helper must exist");
  const joySource = html.slice(joyStart, joyEnd);
  assert.match(joySource, /G\.joy\[0\]=minX<=maxX\?clamp/);
  assert.match(joySource, /G\.joy\[1\]=minY<=maxY\?clamp/);
});

test("active layout editor previews the joystick and constrains drags", () => {
  const start = html.indexOf("let layoutDrag=null,layoutSel=0;");
  const end = html.indexOf("/* ---------- cheat sheet", start);
  assert.ok(start >= 0 && end > start, "layout pointer handling must exist");
  const source = html.slice(start, end);
  assert.match(source, /layoutDrag=\{i,pid:e\.pointerId\}/);
  assert.match(source, /e\.pointerId!==layoutDrag\.pid/);
  assert.match(source, /clamp\(e\.clientX,r\+pad,W-r-pad\)/);
  assert.match(source, /clamp\(e\.clientY,r\+pad,H-r-pad\)/);
  assert.match(source, /addEventListener\('pointercancel',endLayoutDrag\)/);

  const activeStart = html.lastIndexOf("MS.layout=function()");
  const activeEnd = html.indexOf("/* ===================== 20.", activeStart);
  assert.ok(activeStart >= 0 && activeEnd > activeStart, "active layout editor must exist");
  const active = html.slice(activeStart, activeEnd);
  assert.match(active, /drawJoy\(jx,jy,jr,jx,jy,jr\*0\.42,false\)/);
  assert.match(active, /JOYSTICK/);
  assert.match(active, /clampJoyLayout\(\);save\(\)/);
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
