import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const start = source.indexOf("/* PITCH 11 — cinematic live-match pause hub */");
const end = source.indexOf("</script>", start);
assert.ok(start >= 0 && end > start, "cinematic pause hub script must exist");
const pause = source.slice(start, end);

test("pause camera rotates through all existing views, including goal-to-goal", () => {
  assert.match(pause, /Array\.from\(\{length:9\},\(_,i\)=>i\)\.filter\(i=>i===8\|\|CAMS\[i\]\)/);
  assert.match(pause, /Math\.floor\(elapsed\/6800\)%p11PauseModes\.length/);
});

test("manual camera selection takes priority over auto director and restores the saved match camera", () => {
  assert.match(pause, /const selected=p11PauseManualCam==null\?automatic:p11PauseManualCam/);
  assert.match(pause, /finally\{G\.cam=saved;\}/);
  assert.match(pause, /\['CAMERA',\(\)=>\{cycleCam\(\);p11PauseManualCam=G\.cam;\}\]/);
});

test("opening a new pause session resets the manual camera override and cinematic timer", () => {
  assert.match(pause, /openSubs=function\(reason,manualPause=false\)\{\s*p11PauseManualCam=null;\s*M\.pauseCineStarted=performance\.now\(\);/);
});

test("touch landscape devices use a dedicated compact pause layout", () => {
  assert.match(pause, /matchMedia\('\(pointer: coarse\)'\)\.matches\)\&\&Math\.min\(W,H\)<=560/);
  assert.match(pause, /const mobile=touchMobile\|\|W\/H<1\.55/);
  assert.match(pause, /p11PauseAction\(left\+H\*\.012,y,rowW,rowH,r\[0\],mobile\?'':r\[1\]/);
});

test("mobile pause actions retain a minimum 44 CSS-pixel-equivalent canvas hit area and rows fit available height", () => {
  assert.match(pause, /const actionH=mobile\?Math\.max\(44,H\*\.12\)/);
  assert.match(pause, /actionY-rowY-gap\*4-H\*\.018/);
  assert.match(pause, /Math\.max\(mobile\?34:H\*\.075/);
  assert.match(pause, /const bottom=H\*\(mobile\?\.985:\.97\)/);
});

test("existing pause destinations and half/full-time return handling remain wired", () => {
  for (const token of ["resumeSubs()", "M.pp='subs'", "M.instr=1", "M.pp='stats'", "M.pp='set'", "cycleCam()", "rematch()", "quitMatch()", "S.ret==='half'||S.ret==='full'"]) {
    assert.ok(pause.includes(token), `missing preserved pause behavior: ${token}`);
  }
});
