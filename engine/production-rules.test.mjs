import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const scriptMatch = html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, "production game script must exist");
const source = scriptMatch[1];

test("production browser runtime parses without syntax errors", () => {
  assert.doesNotThrow(() => new vm.Script(source, { filename: "index.html:inline-script" }));
});

test("the existing ball dimensions and render scale remain unchanged", () => {
  assert.match(source, /GOALZ=24,BR=4,BVR=1\.1,BALL_SCALE=1,PLAYER_SCALE=1/);
});

test("goal and touchline decisions wait until the whole ball crosses", () => {
  const helpers = source.match(/const ballBeyondLine=[^\n]+\nconst ballInsideGoalFrame=[^\n]+/);
  assert.ok(helpers, "production boundary helpers must be present");
  const context = { BR: 4, CY: 400, GOALH: 36.6, GOALZ: 24 };
  vm.runInNewContext(`${helpers[0]}\nglobalThis.rules = { ballBeyondLine, ballInsideGoalFrame };`, context);
  const { ballBeyondLine, ballInsideGoalFrame } = context.rules;

  assert.equal(ballBeyondLine(104, 100, 1), false);
  assert.equal(ballBeyondLine(104.01, 100, 1), true);
  assert.equal(ballBeyondLine(96, 100, -1), false);
  assert.equal(ballBeyondLine(95.99, 100, -1), true);

  assert.equal(ballInsideGoalFrame({ y: 400 + 32.5, z: 19.9 }), true);
  assert.equal(ballInsideGoalFrame({ y: 400 + 32.7, z: 20 }), false);
  assert.equal(ballInsideGoalFrame({ y: 400, z: 20 }), true);
  assert.equal(ballInsideGoalFrame({ y: 400, z: 20.1 }), false);
});

test("offside exemptions are limited to throw-ins, corners and goal kicks", () => {
  assert.match(source, /rs\.kind==='throw'\|\|rs\.kind==='corner'\|\|rs\.kind==='gk'/);
  assert.doesNotMatch(source, /rs\.kind==='throw'\|\|rs\.kind==='corner'\|\|rs\.kind==='gk'\|\|rs\.kind==='drop'\|\|rs\.kind==='ko'/);
});

test("opponents stay two metres from a throw-in", () => {
  assert.match(source, /\{ko:91\.5,throw:20\}/);
});

test("the restart kicker cannot touch the ball twice before another player", () => {
  assert.match(source, /if\(rs&&rs\.p===p\)ball\.dbl=p/);
  assert.match(source, /if\(p!==ball\.dbl\)ball\.dbl=null/);
  assert.doesNotMatch(source, /ball\.dblT/);
});

test("penalty decisions are not randomly overturned", () => {
  const wrapper = source.match(/const _sp18=setupPen;setupPen=function\(t,sh,so\)\{[^\n]+/);
  assert.ok(wrapper);
  assert.doesNotMatch(wrapper[0], /Math\.random|PENALTY OVERTURNED/);
});

test("throw-ins and dropped balls cannot score without another touch", () => {
  assert.match(source, /rs&&\(rs\.ind\|\|rs\.kind==='throw'\|\|rs\.kind==='drop'\)\)b\.ind=true/);
});

test("a restart taker's second-touch restriction ends on any other player's contact", () => {
  assert.match(source, /if\(best!==b\.dbl\)\{b\.dbl=null;b\.ind=false;\}/);
  assert.match(source, /if\(p!==ball\.dbl\)ball\.dbl=null/);
});

test("penalty shootouts use the isolated whole-ball law decision helper", () => {
  assert.match(source, /PITCH11Law\.shootoutDecision\(/);
  assert.match(source, /goalHalfWidth:GOALH,goalHeight:GOALZ,radius:BR/);
  assert.match(source, /const ballBeyondLine=/);
});

test("goal-line versus touchline restarts are classified after full crossing", () => {
  assert.match(source, /if\(b\.x<PX0-BR\|\|b\.x>PX1\+BR\)\{/);
});

test("offside position is recorded for shots as well as passes", () => {
  assert.match(source, /if\(rs&&\(rs\.kind==='throw'\|\|rs\.kind==='corner'\|\|rs\.kind==='gk'\)\)clearOff\(\);else markOff\(p\);/);
});


test("offside uses the live second-last-opponent line at the instant of every deliberate kick", () => {
  assert.match(source, /PITCH11Law\\.offsideLine\\(P,t,d,ball\\.x\\*d/);
});

test("a goalkeeper save or accidental deflection does not erase offside position", () => {
  assert.match(source, /best\\.kcd=0\\.35;b\\.last=best;b\\.receiver=null;clearIndirect\\(\\);/);
  assert.match(source, /p\\.kcd=0\\.35;if\\(p!==b\\.dbl\\)b\\.dbl=null;clearIndirect\\(\\);/);
  assert.match(source, /p\\.kcd=0\\.4;if\\(p!==b\\.dbl\\)b\\.dbl=null;clearIndirect\\(\\);/);
  assert.match(source, /if\\(p!==b\\.dbl\\)b\\.dbl=null;clearIndirect\\(\\);/);
});

test("a restart taker's physical second touch is whistled; a shootout second touch is a miss", () => {
  assert.match(source, /function secondTouch\\(p\\)\\{/);
  assert.match(source, /if\\(S\\.so&&S\\.so\\.live\\)\\{soResult\\(false\\);return;\\}/);
  assert.match(source, /if\\(p===b\\.dbl\\)\\{secondTouch\\(p\\);return;\\}/);
});

test("shootout rotation includes the goalkeeper and keeps the shooter's goalkeeper in the centre circle", () => {
  assert.match(source, /for\\(const r of \\[9,10,8,7,6,5,4,3,2,1,0\\]\\)/);
  assert.match(source, /if\\(so&&p\\.team===t\\)\\{const a=/);
});

test("substitutions enforce the total limit and three/four substitution windows", () => {
  assert.match(source, /PITCH11Law\\.substitutionLimits\\(S\\.half,S\\.ko\\)/);
  assert.match(source, /S\\.subWindowActive\\[t\\]/);
  assert.match(source, /S\\.subWindows\\[t\\]>=lim\\.windows/);
});

test("the seven-player minimum is enforced after sending-offs and at stoppages", () => {
  assert.match(source, /PITCH11Law\\.abandoningTeam\\(P\\)/);
  assert.match(source, /S\\.abandoned=short/);
  assert.match(source, /MATCH ABANDONED/);
});

test("goalkeeper handling is restricted to the penalty area and the eight-second limit awards a corner", () => {
  assert.match(source, /PITCH11Law\\.goalkeeperHoldExpired\\(g\\.poss\\)/);
  assert.match(source, /if\\(!inBox\\).*?GOALKEEPER HANDBALL/s);
  assert.match(source, /GOALKEEPER 8-SECOND LIMIT/);
  assert.match(source, /spot\\(t,x,y,false,Math\\.atan2\\(CY-y,CX-x\\),'corner'\\)/);
});
