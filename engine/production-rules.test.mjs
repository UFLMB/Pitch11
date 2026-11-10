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

  assert.equal(ballInsideGoalFrame({ y: 400 + 32.6, z: 20 }), true);
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
