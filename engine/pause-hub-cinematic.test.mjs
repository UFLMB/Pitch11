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
  assert.match(pause, /\['◉ CAMERA',\(\)=>\{cycleCam\(\);p11PauseManualCam=G\.cam;\}\]/);
});

test("opening a new pause session resets the manual camera override and cinematic timer", () => {
  assert.match(pause, /openSubs=function\(reason,manualPause=false\)\{\s*p11PauseManualCam=null;\s*M\.pauseCineStarted=performance\.now\(\);/);
});

test("touch landscape devices use a dedicated compact pause layout", () => {
  assert.match(pause, /matchMedia\('\(pointer: coarse\)'\)\.matches\)\&\&Math\.min\(W,H\)<=560/);
  assert.match(pause, /const mobile=touchMobile\|\|W\/H<1\.55/);
  assert.match(pause, /p11PauseAction\(left\+H\*\.012,y,rowW,rowH,r\[0\],r\[1\]/);
});

test("mobile pause actions retain a minimum 44 CSS-pixel-equivalent canvas hit area and rows fit available height", () => {
  assert.match(pause, /const actionH=mobile\?44:Math\.max\(44,H\*\.062\)/);
  assert.match(pause, /actionY-rowY-gap\*4-H\*\.018/);
  assert.match(pause, /Math\.max\(mobile\?34:H\*\.06/);
  assert.match(pause, /const bottom=H\*\(mobile\?\.985:\.97\)/);
});

test("existing pause destinations and half/full-time return handling remain wired", () => {
  for (const token of ["resumeSubs()", "M.pp='subs'", "M.instr=1", "M.pp='stats'", "M.pp='set'", "cycleCam()", "rematch()", "quitMatch()", "S.ret==='half'||S.ret==='full'"]) {
    assert.ok(pause.includes(token), `missing preserved pause behavior: ${token}`);
  }
});

test("camera chosen in match settings remains selected when returning to the pause hub", () => {
  assert.match(pause, /if\(M\.pp==='set'\)p11PauseManualCam=G\.cam;M\.pp='hub'/);
});

test("pause navigation uses genuinely translucent surfaces and a narrower live-view rail", () => {
  assert.match(pause, /const panelW=mobile\?W\*\.335:W\*\.27/);
  assert.match(pause, /rgba\(3,8,11,\.78\)/);
  assert.match(pause, /rgba\(163,230,53,\.19\)/);
  assert.match(pause, /rgba\(17,29,34,\.29\)/);
  assert.doesNotMatch(pause, /rgba\(163,230,53,\.96\)|rgba\(22,34,39,\.84\)/);
});

test("pause bottom actions are compact, icon-led and retain mobile touch targets", () => {
  assert.match(pause, /const actionH=mobile\?44:Math\.max\(44,H\*\.062\)/);
  assert.match(pause, /◉ CAMERA/);
  assert.match(pause, /↻ RESTART/);
  assert.match(pause, /⏻ QUIT/);
});

test("match information is displayed in a compact header above the live 3D view", () => {
  assert.match(pause, /const liveX=left\+panelW\+W\*\.035/);
  assert.match(pause, /const infoX=liveX,infoY=top\+H\*\.012/);
  assert.match(pause, /txt\('MATCH INFORMATION'/);
  assert.match(pause, /KIT\[0\]\.name/);
  assert.match(pause, /S\.score\[0\].*S\.score\[1\]/);
  assert.match(pause, /KIT\[1\]\.name/);
  assert.match(pause, /fit\(clockStr\(\)/);
});

test("pause options remain vertically stacked in compact boxes with high-contrast labels", () => {
  assert.match(pause, /const rowH=Math\.max\(mobile\?34:H\*\.06,Math\.min\(H\*\(mobile\?\.09:\.082\)/);
  assert.match(pause, /rows\.forEach\(\(r,i\)=>\{\s*const y=rowY\+i\*\(rowH\+gap\)/);
  assert.match(pause, /selected\?'#f4ffe8':'#f7faf5'/);
  assert.match(pause, /ctx\.shadowColor='rgba\(0,0,0,\.72\)'/);
});
