import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");

function preset(name) {
  const block = html.match(/const PRESETS=\{([\s\S]*?)\n\};/);
  assert.ok(block, "control preset table must exist");
  const match = block[1].match(new RegExp(name + ":(\\[[^\\n]+\\])"));
  assert.ok(match, name + " preset must exist");
  return JSON.parse(match[1]);
}

test("FC and eFootball presets keep all four buttons visible and on the right side", () => {
  for (const name of ["fc", "efoot"]) {
    const buttons = preset(name);
    assert.equal(buttons.length, 4);
    for (const aspect of [4 / 3, 3 / 2, 16 / 9, 2]) {
      const h = 1000, w = h * aspect;
      const circles = buttons.map(([dx, dy, scale]) => {
        const r = scale * h * 0.09;
        const x = w - dx * h * 0.09;
        const y = h - dy * h * 0.09;
        assert.ok(x - r >= 8 && x + r <= w - 8, name + " button must fit horizontally");
        assert.ok(y - r >= 8 && y + r <= h - 8, name + " button must fit vertically");
        assert.ok(x - r > w / 2, name + " action buttons must remain on the right half");
        return { x, y, r };
      });
      for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
          const a = circles[i], b = circles[j];
          assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r,
            name + " buttons must not overlap");
        }
      }
    }
  }
});

test("saved layouts are clamped to the visible viewport", () => {
  assert.match(html, /const px=clamp\(W-/);
  assert.match(html, /const py=clamp\(H-/);
  assert.match(html, /c\[2\]=clamp\(/);
});

test("swipe-anywhere starts from the real pointer position and releases the same pointer", () => {
  assert.match(html, /function press\(slot,pid,x=0,y=0\)\{[^}]*gDown\(slot,pid,x,y\)/);
  assert.match(html, /function release\(slot,pid,cancel=false\)\{[^}]*gUp\(pid,cancel\)/);
  assert.match(html, /const __sw=new Map\(\)/);
  assert.match(html, /press\(slot,e\.pointerId,e\.clientX,e\.clientY\)/);
  assert.match(html, /gMove\(e\.pointerId,e\.clientX,e\.clientY\)/);
  assert.match(html, /release\(q\.slot,e\.pointerId,e\.type==='pointercancel'\)/);
  assert.match(html, /addEventListener\('pointercancel',__swEnd\)/);
});

test("layout editor previews the joystick and clamps drag positions", () => {
  const activeLayout = html.lastIndexOf("MS.layout=function(){");
  assert.ok(activeLayout >= 0);
  const tail = html.slice(activeLayout, html.indexOf("\n};", activeLayout) + 3);
  assert.match(tail, /drawJoy\(W\*G\.joy\[0\],H\*G\.joy\[1\]/);
  assert.match(html, /const x=clamp\(e\.clientX,r,W-r\),y=clamp\(e\.clientY,r,H-r\)/);
  assert.match(html, /e\.pointerId!==layoutDrag\.pid/);
  assert.match(html, /addEventListener\('pointercancel',endLayoutDrag\)/);
});
