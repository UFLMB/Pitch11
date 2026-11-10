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


test("penalty shootout rotation includes eligible goalkeepers", () => {
  assert.match(source, /list\.push\(\.\.\.PITCH11Law\.shootoutOrder\(P,t\)\)/);
  assert.match(source, /PITCH11Law\.shootoutOrder/);
});


test("a team is forfeited only after a sending-off leaves fewer than seven players", () => {
  assert.match(source, /if\(card>1&&!PITCH11Law\.hasMinimumPlayers\(P,p\.team,7\)\)/);
  assert.match(source, /S\.forfeitTeam=p\.team;S\.mode='full'/);
  assert.match(source, /MATCH ABANDONED/);
  assert.match(source, /forfeited\?KIT\[win\]\.name\+' WIN BY FORFEIT'/);
});
