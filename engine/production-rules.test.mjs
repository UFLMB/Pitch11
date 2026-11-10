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
  assert.match(source, /if\(rs&&rs\.p===p&&rs\.kind!=='drop'\)ball\.dbl=p/);
  assert.match(source, /if\(p!==ball\.dbl\)ball\.dbl=null/);
  assert.doesNotMatch(source, /ball\.dblT/);
});

test("penalty decisions are not randomly overturned", () => {
  const wrapper = source.match(/const _sp18=setupPen;setupPen=function\(t,sh,so\)\{[^\n]+/);
  assert.ok(wrapper);
  assert.doesNotMatch(wrapper[0], /Math\.random|PENALTY OVERTURNED/);
});

test("throw-ins and dropped balls cannot score without another touch", () => {
  assert.match(source, /rs&&\(rs\.ind\|\|rs\.kind==='throw'\|\|rs\.kind==='drop'\)\)\{b\.ind=true;b\.indBy=p;\}/);
});

test("a restart taker's second-touch restriction ends on any other player's contact", () => {
  assert.match(source, /if\(best!==b\.dbl\)b\.dbl=null;if\(best!==b\.indBy\)clearIndirect\(\);/);
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
  assert.match(source, /S\.forfeitTeam=null/);
  assert.match(source, /forfeited\?KIT\[win\]\.name\+' WIN BY FORFEIT'/);
});


test("substitutions are limited to five players and three stoppage windows, with half-time exempt", () => {
  assert.ok(source.includes("PITCH11Law.substitutionEligibility("));
  assert.ok(source.includes("subWindowUsed:[false,false]"));
  assert.ok(source.includes("subWindows:[0,0]"));
  assert.ok(source.includes("WINDOWS  '+S.subWindows[0]+'/3"));
  assert.ok(source.includes("S.ret==='whistle'"));
  assert.ok(source.includes("S.ret==='half'"));
});


test("goalkeeper hand control is limited to eight seconds and awards a corner kick", () => {
  assert.ok(source.includes("PITCH11Law.goalkeeperHoldExpired(b.gkHold)"));
  assert.ok(source.includes("ball.gkHoldActive=!!p.gk"));
  assert.ok(source.includes("b.gkHold>=3"));
  assert.ok(source.includes("spot(1-keeper.team,x,y,false,Math.atan2(CY-y,CX-x),'corner')"));
  assert.ok(source.includes("b.gkHoldActive=false"));
  assert.ok(source.includes("b.gkHold=0;b.gkHoldActive=false;b.gkHoldWarned=false"));
});


test("offside line is recalculated from the live second-last opponent", () => {
  assert.match(source, /PITCH11Law\.offsideLine\(P,t,d,ball\.x\*d/);
});

test("turning off offside does not disable indirect restart goal restrictions", () => {
  assert.match(source, /if\(!X\(\)\.offside\)\{clearOffside\(\);return;\}/);
  assert.doesNotMatch(source, /if\(!X\(\)\.offside\)\{clearOff\(\);return;\}/);
});

test("keeper saves and accidental deflections preserve offside status", () => {
  assert.match(source, /best\.kcd=0\.35;b\.last=best;b\.receiver=null;if\(best!==b\.indBy\)clearIndirect\(\);/);
  assert.match(source, /p\.kcd=0\.35;if\(p!==b\.dbl\)b\.dbl=null;if\(p!==b\.indBy\)clearIndirect\(\);/);
  assert.match(source, /p\.kcd=0\.4;if\(p!==b\.dbl\)b\.dbl=null;if\(p!==b\.indBy\)clearIndirect\(\);/);
  assert.match(source, /b\.spin\+=rnd\(-\.4,\.4\);b\.last=p;if\(b\.receiver!==p\)b\.receiver=null;if\(p!==b\.dbl\)b\.dbl=null;if\(p!==b\.indBy\)clearIndirect\(\);/);
});

test("an offside attacker remains offside after a goalkeeper save or deflection", () => {
  assert.match(source, /if\(!S\.prac&&best\.off\)\{callOffside\(best\);return;\}/);
  assert.doesNotMatch(source, /best\.off&&b\.last&&b\.last\.team===best\.team/);
});

test("restart taker second touch is caught on ground and aerial balls", () => {
  assert.match(source, /function secondTouch\(p\)\{/);
  assert.match(source, /if\(p===b\.dbl\)\{secondTouch\(p\);return;\}/);
  assert.match(source, /if\(p===b\.dbl\)\{const d=Math\.hypot\(b\.x-p\.x,b\.y-p\.y\)/);
});

test("shootout positions the shooter's goalkeeper in the centre circle", () => {
  assert.match(source, /if\(p\.gk\)\{if\(so&&p\.team===t\)\{const a=/);
});

test("a dropped ball permits the same player to play again but blocks a direct goal until another player touches", () => {
  assert.match(source, /if\(rs&&rs\.p===p&&rs\.kind!=='drop'\)ball\.dbl=p/);
  assert.match(source, /b\.ind=true;b\.indBy=p/);
  assert.match(source, /keepIndirect=ball\.ind&&ball\.indBy===p/);
  assert.match(source, /if\(best!==b\.indBy\)clearIndirect\(\)/);
});

test("goalkeeper handling outside the penalty area awards a direct free kick", () => {
  assert.match(source, /depth=\(b\.x-gx\)\*d/);
  assert.match(source, /if\(!insideArea\).*?GOALKEEPER HANDBALL/s);
  assert.match(source, /freeKick\(t,x,y,false\)/);
});

test("extra time permits one additional substitution and one additional opportunity", () => {
  assert.match(source, /extraTime:S\.ko&&\(S\.half===3\|\|S\.half===4\)/);
  assert.match(source, /S\.subs\[t\]<\(S\.ko&&\(S\.half===3\|\|S\.half===4\)\?6:5\)/);
  assert.match(source, /maxWindows=extraTime\?4:3/);
});

test("a new period starts with a fresh substitution opportunity", () => {
  assert.match(source, /function nextPeriod\(n\)\{S\.half=n;S\.clock=0;S\.kick=n%2\?0:1;S\.subWindowUsed=\[false,false\];setupKickoff\(S\.kick\);\}/);
});

test("forfeit winner is retained in cup and league match results", () => {
  assert.match(source, /w=Number\.isInteger\(S\.forfeitTeam\)\?1-S\.forfeitTeam/);
  assert.match(source, /if\(Number\.isInteger\(S\.forfeitTeam\)\)return 1-S\.forfeitTeam/);
});
