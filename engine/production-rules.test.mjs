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
  assert.match(source, /\{ko:91\.5,throw:20,gk:91\.5\}/);
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


test("Law 12 foul discipline uses event severity instead of random card rolls", () => {
  assert.match(source, /PITCH11Law\.foulCardDecision\(/);
  assert.match(source, /reckless:behind&&!!\(context&&context\.sprinting\)/);
  assert.match(source, /reckless:behind\|\|tq<0\.55/);
  assert.match(source, /foul=function\(p,o,b,context\)\{_foul\(p,o,b,context\)/);
  assert.doesNotMatch(source, /const sev=\(behind\?0\.5:0\.15\)/);
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
  assert.ok(source.includes("PITCH11Law.goalkeeperHandControlDecision(true,b.gkHold)==='corner'"));
  assert.doesNotMatch(source, /take=function\(p\)\{/ , "later wrappers must not discard the hand-control argument");
  assert.equal((source.match(/take=function\(p,byHand=false\)/g)||[]).length, 6, "all six possession wrappers must accept the hand-control flag");
  for (const wrapper of ["_take(p,byHand)", "_tk8(p,byHand)", "_tk10(p,byHand)", "_tk19(p,byHand)", "_tk23(p,byHand)", "_tkA(p,byHand)"]) {
    assert.ok(source.includes(wrapper), "hand-control state must pass through " + wrapper);
  }
  assert.ok(source.includes("function take(p,byHand=false)"));
  assert.ok(source.includes("ball.gkHoldActive=!!(p.gk&&byHand)"));
  const keeperSave = source.match(/function gkReact\(p\)\{[\s\S]*?\n\}/);
  assert.ok(keeperSave, "goalkeeper save routine must be present");
  assert.match(keeperSave[0], /take\(p,true\)/, "only a genuine goalkeeper hand catch starts the eight-second clock");
  assert.match(source, /take=function\(p,byHand=false\)[\s\S]*?_take\(p,byHand\)/, "stats wrapper must preserve hand-control state");
  const aiKeeper = source.match(/function aiGK\(p\)\{[\s\S]*?\n\}/);
  const chargedKeeper = source.match(/function gkStep\(p\)\{[\s\S]*?\n\}/);
  assert.ok(aiKeeper && chargedKeeper, "both goalkeeper collection paths must be present");
  assert.match(aiKeeper[0], /take\(p,true\)/, "AI goalkeeper smothers use hand control");
  assert.match(chargedKeeper[0], /take\(p,true\)/, "manual goalkeeper smothers use hand control");
  assert.ok(source.includes("if(p.team===0&&!pw&&!stick){take(p);return;}"), "ordinary outfield foot control must not start the hand clock");
  assert.ok(source.includes("b.gkHold>=3"));
  assert.ok(source.includes("spot(1-keeper.team,x,y,false,Math.atan2(CY-y,CX-x),'corner')"));
  assert.ok(source.includes("b.gkHoldActive=false"));
  assert.ok(source.includes("b.gkHold=0;b.gkHoldActive=false;b.gkHoldWarned=false"));
});


test("dropped balls use the defending goalkeeper inside a penalty area and preserve the restart position", () => {
  assert.ok(source.includes("PITCH11Law.droppedBallRecipient("));
  assert.ok(source.includes("penaltyHalfWidth:PEN_WIDTH/2"));
  assert.ok(source.includes("lastTouchedTeam:t"));
  assert.ok(source.includes("spot(recipient.team,x,y,!!useKeeper"));
  assert.ok(source.includes("PX0+BR+0.1"));
});


test("goal-kick opponents are kept outside the penalty area and at least 9.15m from the ball", () => {
  assert.ok(source.includes("gk:91.5"));
  assert.ok(source.includes("PITCH11Law.goalKickOpponentPosition("));
  assert.ok(source.includes("penaltyDepth:PEN_DEPTH"));
  assert.ok(source.includes("halfWidth:PEN_WIDTH/2"));
});

test("goalkeeper handball outside the penalty area awards a direct free kick at the contact point", () => {
  assert.ok(source.includes("const insideArea=(b.x-gx)*d>=0"));
  assert.ok(source.includes("whistleStop(1.4,label,'Goalkeeper handled the ball illegally',()=>freeKick(1-keeper.team,x,y,handlingRestart==='indirect-free-kick'))"));
  assert.ok(source.includes("PITCH11Law.goalkeeperHandControlDecision(true,b.gkHold)==='corner'"));
});


test("goalkeeper handball boundary is evaluated at the ball contact point", () => {
  assert.match(source, /const insideArea=\(b\.x-gx\)\*d>=0/);
  assert.doesNotMatch(source, /insideArea=\(keeper\.x-gx\)/);
  assert.ok(source.includes("const x=b.x,y=b.y"));
});


test("goalkeeper cannot handle a deliberate teammate back-pass or a direct teammate throw-in", () => {
  assert.ok(source.includes("gkNoHands=p.gk?null:(rcv&&rcv.gk&&rcv.team===p.team?p.team:null)") && source.includes("b.gkNoHandsFrom=b.gkNoHands===null?null:p"));
  assert.ok(source.includes("if(!p.gk||ball.gkNoHands!==p.team){ball.gkNoHands=null;ball.gkNoHandsFrom=null;}"));
  assert.ok(source.includes("PITCH11Law.goalkeeperIllegalHandlingRestart(insideArea,prohibitedPass||secondTouch)"));
  assert.ok(source.includes("handlingRestart==='indirect-free-kick'"));
  assert.ok(source.includes("b.gkNoHands=null"));
  assert.ok(source.includes("b.gkNoHands=null;b.gkNoHandsFrom=null;b.gkReleasedBy=null;clearOff()"));
});


test("goalkeeper cannot handle the ball again after releasing it until another player touches it", () => {
  assert.ok(source.includes("b.gkReleasedBy=PITCH11Law.goalkeeperReleaseMarker(p,b.gkHoldActive)"));
  assert.ok(source.includes("if(b.gkReleasedBy&&b.last!==b.gkReleasedBy)b.gkReleasedBy=null"));
  assert.ok(source.includes("secondTouch=b.gkReleasedBy===keeper"));
  assert.ok(source.includes("secondTouch?'SECOND TOUCH':'BACK-PASS / THROW-IN'"));
  assert.ok(source.includes("b.gkReleasedBy=null;b.gkHold=0"));
});


test("kick-off keeps every player in their own half and only opponents 9.15m from the ball", () => {
  assert.ok(source.includes("if(rs.kind==='ko')for(const p of P)"));
  assert.ok(source.includes("rs.kind==='ko'?p.team===rs.team:(p.team===rs.team||p.gk)"));
  assert.doesNotMatch(source, /kickoffPlayerPosition/);
});


test("a goalkeeper foot kick does not start the second-hand-touch restriction", () => {
  assert.ok(source.includes("b.gkReleasedBy=PITCH11Law.goalkeeperReleaseMarker(p,b.gkHoldActive)"));
  assert.ok(source.includes("b.gkHoldActive=false;b.gkHoldWarned=false"));
  assert.doesNotMatch(source, /b\.gkReleasedBy=p\.gk\?p:null/);
});

test("Law 15 throw-ins cannot be taken with a foot pass or shot input", () => {
  assert.match(source, /const _humanThrowLaw=humanAct;/);
  assert.match(source, /rs&&rs\.kind==='throw'&&rs\.p===p&&ball\.owner===p/);
  assert.match(source, /I\.shoot=I\.shootUp=I\.pass=I\.thru=I\.lob=I\.skill=I\.sw=I\.tackle=I\.swp=false/);
  assert.match(source, /_humanThrowLaw\(p\)/);
});

test("VAR checks are event-driven for goals, penalties, red cards and immediate corners", () => {
  assert.match(source, /function varCheck\(category,evidence\)/);
  assert.match(source, /varCheck\('goal',evidence\)/);
  assert.match(source, /varCheck\('penalty',evidence\)/);
  assert.match(source, /varCheck\('red-card',p&&p\.varIncident\|\|\{\}\)/);
  assert.match(source, /varCheck\('corner',evidence\)/);
});

test("Law 14 checks the goalkeeper's goal-line position at the kick and retakes an illegal save", () => {
  assert.match(source, /PITCH11Law\.goalkeeperPenaltyLineOffence\(/);
  assert.match(source, /keeper\.face=Math\.atan2\(sh\.y-keeper\.y,sh\.x-keeper\.x\)/);
  assert.match(source, /ball\.penaltyKeeperOffLine=incident\.offLine/);
  assert.match(source, /PITCH11Law\.penaltyKeeperDecision\(/);
  assert.match(source, /ball\.penaltyKeeperSaved=true/);
  assert.match(source, /PENALTY RETAKE/);
  assert.match(source, /First offence: goalkeeper warned/);
  assert.match(source, /Repeated offence: goalkeeper cautioned/);
  assert.match(source, /GK\[keeper\.team\]=replacement/);
  assert.match(source, /varCheck\('goal',\{clearAndObviousError:true\}\)/);
  assert.match(source, /S\.penaltyRetake\?'PENALTY RETAKE'/);
});

test("Law 11 preserves offside flags after opponent deflections and goalkeeper saves", () => {
  assert.match(source, /function applyOffsideTouch\(p,previousLast,deliberatePlay,deliberateSave\)/);
  assert.match(source, /if\(!S\.prac&&best\.off\)\{callOffside\(best\);return;\}/);
  assert.match(source, /applyOffsideTouch\(p,previousLast,true,true\)/);
  assert.match(source, /applyOffsideTouch\(p,previousLast,false,false\)/);
  assert.match(source, /if\(!S\.prac&&p\.off\)\{callOffside\(p\);return;\}/);
});

test("goalkeeper parries preserve offside flags instead of clearing the phase", () => {
  const start = source.indexOf("function gkReact(p){");
  const end = source.indexOf("/* ===================== 6. AI", start);
  assert.ok(start >= 0 && end > start);
  const keeperReact = source.slice(start, end);
  assert.equal((keeperReact.match(/applyOffsideTouch\(p,previousLast,true,true\)/g) || []).length, 2);
  assert.doesNotMatch(keeperReact, /clearOff\(\)/);
});

test("Law 14 rejects a backward penalty kick and awards an indirect free kick", () => {
  assert.match(source, /PITCH11Law\.penaltyKickDirectionLegal\(\{vx,attackDirection:dirOf\(rs\.team\)\}\)/);
  assert.match(source, /const _doShootPenaltyForward=doShoot/);
  assert.match(source, /penalty=!!\(rs&&rs\.kind==='pen'&&rs\.p===p&&!S\.so\)/);
  assert.match(source, /INDIRECT FREE KICK','The penalty kick must be taken forward'/);
  assert.match(source, /freeKick\(1-team,x,y,true\)/);
});
