import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const scriptMatch = html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, "production game script must exist");
const source = scriptMatch[1];
const lawSource = readFileSync(new URL("./law-compliance.js", import.meta.url), "utf8");

test("Law 4 equipment inspection rejects missing compulsory kit and unsafe items", () => {
  const context = {};
  vm.runInNewContext(lawSource, context, { filename: "law-compliance.js" });
  const law = context.PITCH11Law;
  assert.ok(law, "Law 4 helpers must be exposed to the production runtime");
  const compliant = {
    shirtWithSleeves: true, shorts: true, socks: true,
    shinguards: true, shinguardsCovered: true, footwear: true,
    dangerousEquipment: false, uncoveredJewellery: false,
    playerElectronicEquipment: false
  };
  assert.deepEqual(Array.from(law.playerEquipmentIssues(compliant)), []);
  assert.equal(law.equipmentInspectionDecision(compliant), "allow");

  const incomplete = { ...compliant, shirtWithSleeves: false, shinguardsCovered: false, footwear: false };
  assert.deepEqual(Array.from(law.playerEquipmentIssues(incomplete)), ["shirt", "shinguards", "footwear"]);
  assert.equal(law.equipmentInspectionDecision(incomplete), "replace-item");

  const unsafe = { ...compliant, dangerousEquipment: true, uncoveredJewellery: true, playerElectronicEquipment: true };
  assert.deepEqual(Array.from(law.playerEquipmentIssues(unsafe)), [
    "dangerous-equipment", "uncovered-jewellery", "electronic-equipment"
  ]);
  assert.equal(law.equipmentInspectionDecision(unsafe), "remove-item");
});

test("Law 4 equipment checks are wired into match start and substitution entry", () => {
  const inspection = source.match(/function inspectMatchEquipment\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(inspection, "the match-start equipment inspection must exist");
  assert.match(inspection[0], /PITCH11Law\.playerEquipmentIssues\(p\.equipment\)/);
  assert.match(inspection[0], /p\.equipment\.inspected=issues\.length===0/);
  assert.match(inspection[0], /if\(failed\)\{S\.mode='full'/);
  assert.match(source, /applyTeam\(0,G\.club\);applyTeam\(1,M\.opp\);if\(!inspectMatchEquipment\(\)\)return;setupKickoff\(0\)/);
  assert.match(source, /PITCH11Law\.equipmentInspectionDecision\(incomingEquipment\)/);
  assert.match(source, /if\(equipmentDecision!=='allow'\)/);
});

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
  assert.match(source, /\{ko:91\.5,throw:20,gk:0,drop:40\}/);
});

test("the restart kicker cannot touch the ball twice before another player", () => {
  assert.match(source, /if\(rs&&rs\.p===p\)\{ball\.dbl=p;ball\.dblKind=rs\.kind;\}/);
  assert.match(source, /if\(p!==ball\.dbl\|\|ball\.last!==ball\.dbl\)ball\.dbl=null/);
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
  assert.match(source, /if\(p!==ball\.dbl\|\|ball\.last!==ball\.dbl\)ball\.dbl=null/);
});

test("penalty shootouts use the isolated whole-ball law decision helper", () => {
  assert.match(source, /PITCH11Law\.shootoutDecision\(/);
  assert.match(source, /goalHalfWidth:GOALH,goalHeight:GOALZ,radius:BR/);
  assert.match(source, /const ballBeyondLine=/);
});

test("Law 10 immediately records an accidental shoot-out double touch as missed unless it entered the goal", () => {
  const rules = source.match(/function soRules\(\)\{[\s\S]*?\n\}/);
  assert.ok(rules);
  assert.match(rules[0], /doubleTouch:ball\.shootoutDoubleTouch/);
  assert.match(rules[0], /if\(decision==='retake'\)\{?soRetake\(\)/);
  assert.match(rules[0], /if\(decision==='miss'\)\{?soResult\(false\)/);
});

test("goal-line versus touchline restarts are classified after full crossing", () => {
  assert.match(source, /if\(b\.x<PX0-BR\|\|b\.x>PX1\+BR\)\{/);
});

test("offside position is recorded for shots as well as passes", () => {
  assert.match(source, /if\(rs&&\(rs\.kind==='throw'\|\|rs\.kind==='corner'\|\|rs\.kind==='gk'\)\)clearOff\(\);else markOff\(p\);/);
});


test("penalty shootout rotation includes eligible goalkeepers and tracks repeat-kick eligibility", () => {
  assert.match(source, /PITCH11Law\.shootoutOrder\(P,t\)/);
  assert.match(source, /PITCH11Law\.shootoutNextKicker\(P,t,so\.taken\[t\]\)/);
});


test("Law 12 foul context survives stadium, referee and cinematic wrappers", () => {
  assert.ok(source.includes("foul=function(p,o,b,context){_stadiumFoul(p,o,b,context);emitStadiumEvent('foul');}"));
  assert.ok(source.includes("foul=function(p,o,b,context){REF.awT=o.team;const st=G.rf.strict;"));
  assert.ok(source.includes("_foR(p,o,b,context);"));
  assert.ok(source.includes("foul=function(p,o,b,context){FL26.p=p;FL26.o=o;try{_fo26(p,o,b,context);}"));
});

test("Law 12 foul discipline uses event severity instead of random card rolls", () => {
  assert.match(source, /PITCH11Law\.foulCardDecision\(/);
  assert.match(source, /reckless:behind&&!!\(context&&context\.sprinting\)/);
  assert.match(source, /reckless:behind\|\|tq<0\.55/);
  assert.match(source, /foul=function\(p,o,b,context\)\{_foul\(p,o,b,context\)/);
  assert.doesNotMatch(source, /const sev=\(behind\?0\.5:0\.15\)/);
});

test("a team is forfeited only after a sending-off leaves fewer than seven players", () => {
  assert.match(source, /PITCH11Law\.matchAbandonmentDecision\(P,p\.team,7,!!S\.so\)==='abandon'/);
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


test("goalkeeper hand control shows the final five-second countdown and awards a corner only after eight seconds", () => {
  assert.ok(source.includes("PITCH11Law.goalkeeperHandControlDecision(true,b.gkHold)==='corner'"));
  assert.doesNotMatch(source, /take=function\(p\)\{/ , "later wrappers must not discard the hand-control argument");
  assert.equal((source.match(/take=function\(p,byHand=false\)/g)||[]).length, 7, "all seven possession wrappers must accept the hand-control flag");
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
  assert.ok(source.includes("b.gkHoldShown=5"));
  assert.ok(source.includes("Math.ceil(8-b.gkHold)"));
  assert.ok(source.includes("PITCH11Law.goalkeeperHoldSanction(violations)"));
  assert.ok(source.includes("keeper.gkHoldOffences"));
  assert.ok(source.includes("keeper.yc>=2?3:1"));
  assert.ok(source.includes("matchAbandonmentDecision(P,keeper.team,7,!!S.so)"));
  assert.ok(source.includes("spot(1-keeper.team,x,cy,false,Math.atan2(CY-cy,CX-x),'corner')"));
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


test("goal-kick opponents are kept outside the penalty area without an extra 9.15m restriction", () => {
  assert.ok(source.includes("gk:0"));
  assert.ok(source.includes("PITCH11Law.goalKickOpponentPosition("));
  assert.ok(source.includes("penaltyDepth:PEN_DEPTH"));
  assert.ok(source.includes("halfWidth:PEN_WIDTH/2"));
});

test("outfield handball is disabled and never upgrades a restart second-touch offence", () => {
  const context = {};
  vm.runInNewContext(lawSource, context, { filename: "law-compliance.js" });
  const law = context.PITCH11Law;
  assert.ok(law, "Law 12/13 rule helpers must be exposed");
  assert.equal(law.restartSecondTouchRestart({
    isKicker: true, handball: true, goalkeeper: false, insideOwnPenaltyArea: true
  }), "indirect-free-kick");
  assert.equal(law.restartSecondTouchRestart({
    isKicker: true, handball: true, goalkeeper: false, insideOwnPenaltyArea: false
  }), "indirect-free-kick");
  assert.equal(law.restartSecondTouchRestart({
    isKicker: true, handball: true, goalkeeper: true, insideOwnPenaltyArea: false
  }), "indirect-free-kick");
  assert.equal(law.restartSecondTouchRestart({ isKicker: false, handball: true }), "continue");
  assert.doesNotMatch(source, /Second-touch handball offence/);
  assert.match(source, /Second-touch offence/);
  assert.doesNotMatch(source, /isKicker:true,handball:!!byHand/);
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
  assert.ok(source.includes("b.gkNoHands=null;b.gkNoHandsFrom=null;b.gkReleasedBy=null;b.restartDoubleTouchPending=null;clearOff()"));
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
  assert.ok(source.includes("rs.kind==='ko'?p.team===rs.team:(p.team===rs.team||goalLineDistanceException)"));
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
  assert.match(source, /GK\[team\]=replacement/);
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

test("Law 14 repeated goalkeeper penalty-line offences rely on the single Law 3 replacement path", () => {
  const offence=source.slice(source.indexOf("function retakePenaltyForKeeperOffence"),source.indexOf("const _goalPenaltyLine"));
  assert.match(offence, /giveCard\(keeper,card\)/);
  assert.match(source, /const _law3ReplacementGoalkeeper=giveCard/);
  assert.match(source, /PITCH11Law\.replacementGoalkeeper\(P,team\)/);
  assert.doesNotMatch(offence, /const replacement=firstIn\(keeper\.team\)/);
  assert.doesNotMatch(offence, /replacement\.gk=true/);
});

test("Law 14 does not retake for an off-line goalkeeper touching a penalty that was going wide or high", () => {
  assert.match(source, /PITCH11Law\.penaltyShotOnTarget\(/);
  assert.match(source, /const onTarget=!!\(ball\.pen&&ball\.penaltyKeeperOffLine/);
  assert.match(source, /if\(onTarget&&ball\.penaltyKeeperOffLine&&keeperTouched\)/);
});

test("Law 14 retakes an accidental double-touch penalty without a goal when the goalkeeper also offends", () => {
  const resolver = html.match(/function resolveAccidentalPenaltyDoubleTouch\(goalScored\)\{[\s\S]*?\n\}/);
  assert.ok(resolver);
  assert.match(resolver[0], /const goalkeeperOffence=!!ball\.penaltyKeeperOffLine/);
  assert.match(resolver[0], /goalkeeperOffence\s*\}/);
  assert.match(resolver[0], /if\(decision==='retake'&&!goalScored&&goalkeeperOffence\)/);
  assert.match(resolver[0], /retakePenaltyForKeeperOffence\(\)/);
});

test("Law 14 additional time waits for penalty completion and honours retakes", () => {
  assert.match(source, /const _endHalfPenaltyAddedTime=endHalf/);
  assert.match(source, /PITCH11Law\.penaltyAdditionalTimeDecision\(/);
  assert.match(source, /penaltyOtherPlayerTouched/);
  assert.match(source, /if\(ball\.pen\)clearPenaltyLineState\(\)/);
  assert.match(source, /if\(ball\.penaltyRetakePending&&S\.mode==='play'\)retakePenaltyForKeeperOffence\(\)/);
});

test("Law 12 applies DOGSO, SPA and a conservative serious-slide-foul threshold", () => {
  assert.match(source, /PITCH11Law\.dogsoOpportunity\(/);
  assert.match(source, /stopsPromisingAttack:spa&&!pen/);
  assert.match(source, /attemptToPlayBall:true/);
  assert.match(source, /seriousFoulPlay=behind&&tq<0\.12&&speed>180/);
  assert.match(source, /slideFoul\(p,o,tq,behind\)/);
});

test("Law 14 applies the forward-kick requirement to shootouts without awarding an in-match free kick", () => {
  assert.match(source, /shootoutPenalty=!!\(rs&&rs\.kind==='pen'&&rs\.p===p&&S\.so\)/);
  assert.match(source, /if\(shootoutPenalty&&!PITCH11Law\.penaltyKickDirectionLegal/);
  assert.match(source, /if\(shootoutPenalty[\s\S]*?soResult\(false\)/);
});

test("Law 12 includes supporting attackers and delays DOGSO/SPA cards when advantage is played", () => {
  assert.match(source, /attackersAhead=P\.filter/);
  assert.match(source, /const advantagePossible=!hurt&&prog>0\.45&&\(!pen\|\|!dogso\)/);
  assert.match(source, /S\.adv=\{team:t,t:2\.5,fn,offender:p,dogso:advDogso,caution:deferCaution\}/);
  assert.doesNotMatch(source, /cardOnFailure/);
  assert.match(source, /const deferCaution=advantagePossible&&card===1/);
  assert.match(source, /if\(S\.pendingCard\)\{if\(!S\.pendingCard\.goalExempt\)issueAdvantageCaution/);
  assert.match(source, /if\(a\.dogso\|\|a\.caution\)S\.pendingCard=\{player:a\.offender,card:1,goalExempt:!!a\.dogso\}/);
  assert.match(source, /if\(a\.dogso\|\|a\.caution\)issueAdvantageCaution\(a\.offender\)/);
  assert.match(source, /function issueAdvantageCaution\(p\)/);
  assert.match(source, /goal=function\(dr\)\{if\(S\.pendingCard\)\{if\(!S\.pendingCard\.goalExempt\)issueAdvantageCaution/);
});

test("Law 12 allows advantage for non-DOGSO fouls inside the penalty area while retaining the penalty fallback", () => {
  assert.ok(source.includes("const advantagePossible=!hurt&&prog>0.45&&(!pen||!dogso)"));
  assert.ok(source.includes("const fn=pen?()=>setupPen(t,firstIn(t),false):()=>freeKick(t,x,y,false)"));
  assert.match(source, /const deferCaution=advantagePossible&&card===1/);
});

test("Law 12 advantage is resolved before period end and before a subsequent whistle", () => {
  assert.match(source, /if\(S\.adv\)\{S\.clock=plen\(\);return;\}/);
  assert.match(source, /if\(S\.adv&&\(S\.adv\.dogso\|\|S\.adv\.caution\)\)/);
  assert.match(source, /if\(S\.pendingCard\)\{issueAdvantageCaution/);
});


test("Law 11 disallows a goal when an offside attacker blocks the goalkeeper's line of sight", () => {
  assert.match(source, /PITCH11Law\.offsideLineOfSightInterference\(/);
  assert.match(source, /const _goalLaw11Sight=goal/);
  assert.match(source, /callOffside\(blocker\);return/);
});


test("Laws 15 and 16 allow normal restart time before a referee-signalled five-second countdown", () => {
  assert.match(source, /const _updateLaw1516Delay=update/);
  assert.match(source, /rs\.delayWait<5/);
  assert.match(source, /rs\.delaySignalled=true/);
  assert.match(source, /signalled:rs\.delaySignalled/);
  assert.match(source, /PITCH11Law\.restartDelayDecision\(/);
  assert.match(source, /opponent-throw-in/);
  assert.match(source, /opponent-corner/);
  assert.match(source, /S\.rs\.r=91\.5/);
});


test("Law 17 interpolates the whole-ball crossing point for both normal and delayed corners", () => {
  assert.match(source, /PITCH11Law\.goalLineCrossingY\(\{previousX:b\.px,previousY:b\.py,currentX:b\.x,currentY:b\.y,goalLine:left\?PX0:PX1,direction:left\?-1:1,radius:BR\}\)/);
  assert.match(source, /const crossingY=PITCH11Law\.goalLineCrossingY/);
  assert.match(source, /crossingY<CY\?PY0\+3:PY1-3/);
  assert.match(source, /S\.rs\.goalLineCrossY=crossingY/);
  assert.match(source, /PITCH11Law\.goalKickDelayCornerY\(\{crossingY:rs\.goalLineCrossY,topY,bottomY\}\)/);
});

test("Law 15 places a throw-in at the interpolated whole-ball touchline crossing point", () => {
  assert.match(source, /PITCH11Law\.touchlineCrossingX\(\{previousX:b\.px,previousY:b\.py,currentX:b\.x,currentY:b\.y,touchline:top\?PY0:PY1,direction:top\?-1:1,radius:BR\}\)/);
  assert.match(source, /const x=clamp\(crossingX,PX0\+12,PX1-12\)/);
});


test("Law 13 applies goal-area placement, own-penalty-area clearance and the one-metre wall exclusion", () => {
  assert.match(source, /PITCH11Law\.freeKickGoalAreaPosition\(/);
  assert.match(source, /ownPenaltyRestart/);
  assert.match(source, /rs\.kind==='gk'\|\|ownPenaltyRestart/);
  assert.match(source, /rs\.wall\.length>=3/);
  assert.match(source, /const wallClearance=10/);
});

test("Law 16 requires goal-kick opponents to leave the penalty area, not to stand 9.15 m away", () => {
  const clamp = source.match(/function restartClamp\(\)\{[\s\S]*?\n\}/);
  assert.ok(clamp);
  assert.match(clamp[0], /const R=rs\.r\?\?\(\{ko:91\.5,throw:20,gk:0,drop:40\}\)\[rs\.kind\]/);
  assert.match(clamp[0], /if\(R===undefined\)return/);
  assert.match(clamp[0], /if\(rs\.kind==='gk'\|\|ownPenaltyRestart\)/);
});


test("Law 13 and restart laws enforce opponent distances except the free-kick goal-line exception", () => {
  const helper = lawSource.match(/function restartGoalLineDistanceExemption\(state\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(helper, "the goal-line distance exception must be explicit");
  const isolated = new Function("return (" + helper[0].replace("function restartGoalLineDistanceExemption(state)", "function (state)") + ");")();
  assert.equal(isolated({ restartKind: "fk", onOwnGoalLine: true, betweenPosts: true }), true);
  assert.equal(isolated({ restartKind: "fk", onOwnGoalLine: false, betweenPosts: true }), false);
  assert.equal(isolated({ restartKind: "fk", onOwnGoalLine: true, betweenPosts: false }), false);
  assert.equal(isolated({ restartKind: "throw", onOwnGoalLine: true, betweenPosts: true }), false);
  assert.equal(isolated({ restartKind: "corner", onOwnGoalLine: true, betweenPosts: true }), false);
  assert.equal(isolated({ restartKind: "gk", onOwnGoalLine: true, betweenPosts: true }), false);
  const clamp = source.match(/function restartClamp\(\)\{[\s\S]*?\n\}/);
  assert.ok(clamp, "restart positioning must be present");
  assert.match(clamp[0], /PITCH11Law\.restartGoalLineDistanceExemption\(/);
  assert.match(clamp[0], /p\.team===rs\.team\|\|goalLineDistanceException/);
  assert.doesNotMatch(clamp[0], /p\.team===rs\.team\|\|p\.gk/,
    "goalkeepers must not be globally exempt from opponent restart distances");
});

test("Law 3 appoints a replacement goalkeeper after a goalkeeper sending-off when the match can continue", () => {
  assert.match(source, /const _law3ReplacementGoalkeeper=giveCard/);
  assert.match(source, /PITCH11Law\.replacementGoalkeeper\(P,team\)/);
  assert.match(source, /replacement\.gk=true/);
  assert.match(source, /GK\[team\]=replacement/);
  assert.match(source, /S\.mode==='full'/);
});


test("Law 11 detects an offside attacker challenging or obstructing an opponent before a loose-ball touch", () => {
  assert.match(source, /PITCH11Law\.offsideChallengeInterference\(/);
  assert.match(source, /PITCH11Law\.offsideLineOfSightInterference\(/);
  assert.match(source, /if\(!S\.prac&&!best\.off\)/);
  assert.match(source, /callOffside\(challenger\)/);
});


test("Law 10 prevents abandonment below seven players during shoot-outs, including goalkeeper penalty retakes", () => {
  assert.match(source, /matchAbandonmentDecision\(P,p\.team,7,!!S\.so\)/);
  assert.match(source, /matchAbandonmentDecision\(P,keeper\.team,7,shootout\)/);
});


test("Law 10 prevents a goalkeeper throw from scoring directly while preserving goals after another touch", () => {
  assert.match(source, /goalkeeperThrowGoalDecision/);
  assert.match(source, /releasedByGoalkeeper:!!b\.gkReleasedBy/);
  assert.match(source, /lastTouchIsThrower:b\.gkReleasedBy===b\.last/);
});


test("Law 8 keeps every player except the dropped-ball recipient at least four metres away", () => {
  assert.match(source, /ball\.x=ball\.px=x;ball\.y=ball\.py=y;S\.rs\.r=40/);
  assert.match(source, /drop:40/);
  assert.match(source, /rs\.kind==='drop'\?false/);
});


test("Laws 8, 13, 16 and 17 prevent direct own goals from kick-offs, free kicks, goal kicks and corners", () => {
  assert.match(source, /PITCH11Law\.directRestartGoalDecision\(/);
  assert.match(source, /restartKickerTeam:b\.dbl===b\.last&&b\.dbl\?b\.dbl\.team:null/);
  assert.match(source, /ball\.dblKind=rs\.kind/);
  assert.match(source, /restartKind:b\.dbl===b\.last&&b\.dbl\?b\.dblKind:null/);
  assert.match(source, /keeperThrowDecision==='goal'/);
});


test("a restart taker is penalised for a controlled second touch even when the ball is stationary", () => {
  const touchFunction = source.match(/function touches\(\)\{[\s\S]*?\n\}/);
  assert.ok(touchFunction, "production ball-control routine must be present");
  assert.match(touchFunction[0], /secondTouchCandidate=null,secondTouchScore=-1e9/);
  assert.match(touchFunction[0], /p===b\.dbl&&b\.last===p/);
  assert.match(touchFunction[0], /secondTouchScore>bs/);
  assert.match(touchFunction[0], /restartSecondTouchRestart\(\{isKicker:true,insideOwnPenaltyArea\}\)/);
  assert.match(source, /p!==ball\.dbl\|\|ball\.last!==ball\.dbl/);
  assert.match(source, /ball\.last!==previousLast&&ball\.last!==ball\.dbl/);
  assert.match(source, /const _aiGKDirectRestart=aiGK/);
});

test("controlled second touches during penalties and shoot-outs use their own Law 10/14 decisions", () => {
  const touchFunction = source.match(/function touches\(\)\{[\s\S]*?\n\}/);
  assert.ok(touchFunction);
  assert.match(touchFunction[0], /S\.so&&S\.so\.live&&secondTouchCandidate===S\.so\.shooter/);
  assert.match(touchFunction[0], /b\.shootoutDoubleTouch=true/);
  assert.match(touchFunction[0], /b\.pen&&!b\.penaltyWasShootout&&secondTouchCandidate===b\.penaltyKicker/);
  assert.match(touchFunction[0], /b\.penaltyDoubleTouch=true/);
  assert.match(source, /ball\.penaltyDoubleTouch/);
  assert.match(source, /doubleTouch:ball\.shootoutDoubleTouch/);
});

test("Direct-restart touch tracking clears after a second player's deflection or control", () => {
  assert.match(source, /p!==ball\.dbl\|\|ball\.last!==ball\.dbl/);
  assert.match(source, /ball\.last!==previousLast&&ball\.last!==ball\.dbl/);
  assert.match(source, /const _aiGKDirectRestart=aiGK/);
});

test("Law 8 predicts the restart recipient when referee contact deflects a ball that would have gone out", () => {
  assert.match(source, /PITCH11Law\.predictedRestartTeam\(/);
  assert.match(source, /lastTouchedTeam:contactTeam/);
  assert.match(source, /recipientTeam=predictedRestartTeam===0\|\|predictedRestartTeam===1\?predictedRestartTeam:/);
  assert.match(source, /b\.refContact=\{x:b\.x,y:b\.y,team:contactTeam,recipientTeam\}/);
  assert.match(source, /dropBall\(contact\.team,contact\.recipientTeam\)/);
  assert.match(source, /touches=function\(\)\{const previousLast=ball\.last/);
  assert.match(source, /bodyCollide=function\(\)\{const previousLast=ball\.last/);
  assert.match(source, /slideHit=function\(p,sd\)\{const previousLast=ball\.last,refContact=ball\.refContact/);
  assert.match(source, /bodyCollide=function\(\)\{const previousLast=ball\.last,refContact=ball\.refContact/);
  assert.match(source, /if\(refContact\)ball\.refContact=refContact;resolveRefereeContact\(ball\.last\)/);
  assert.match(source, /outOfPlay=function\(\)\{ball\.refContact=null/);
});


test("Law 5 removes assessed outfield players for one running minute and restores them at a period restart", () => {
  assert.match(source, /function sendOffForAssessment\(p,state\)/);
  assert.match(source, /PITCH11Law\.offFieldTreatmentDecision\(assessment\)/);
  assert.match(source, /assessment\.foulCautionOrSendingOff=!!\(assessment\.foulCautionOrSendingOff\|\|p\.law5FoulSanction\)/);
  assert.match(source, /assessment\.penaltyKicker=!!\(assessment\.penaltyKicker\|\|p\.law5PenaltyKicker\)/);
  assert.match(source, /hurt\.inj=true;hurt\.law5FoulSanction=card>0;hurt\.law5AssessmentQuickly=card>0/);
  assert.match(source, /o\.inj=true/);
  assert.match(source, /if\(penaltyKicker\)o\.law5PenaltyKicker=true/);
  assert.match(source, /p\.tempOffStartedAt=gmin\(\)/);
  assert.match(source, /restartWasLive=!!S\.rs/);
  assert.match(source, /p\.out=true/);
  assert.match(source, /function returnFromAssessment\(p,periodRestart\)/);
  assert.match(source, /PITCH11Law\.offFieldReturnDecision\(\{elapsedMinutes:gmin\(\)-p\.tempOffStartedAt\}\)/);
  assert.match(source, /p\.tempOffHalf=S\.half/);
  assert.match(source, /function restorePeriodTempOff\(\)/);
  assert.match(source, /setupKickoff=function\(team\)\{restorePeriodTempOff\(\);/);
  assert.match(source, /const _setupKickoffLaw5=setupKickoff/);
  assert.match(source, /const _startShootoutLaw5=startShootout/);
  assert.match(source, /if\(p\.inj&&!p\.out\)\{p\.limp=true;sendOffForAssessment\(p\);\}/);
  assert.match(source, /if\(q\.inj&&!q\.out\)sendOffForAssessment\(q\)/);
});


test("Law 3 checks the seven-player minimum after a goalkeeper is sent off for substitution delay", () => {
  const doSub = source.match(/function doSub\(p,bn\)\{[\s\S]*?\n\}/);
  assert.ok(doSub, "production substitution path must exist");
  const sendOff = doSub[0].match(/if\(delayDecision==='send-off'\)\{[\s\S]*?\n    \}/);
  assert.ok(sendOff, "booked goalkeeper delay must trigger the send-off path");
  assert.match(sendOff[0], /giveCard\(p,3\)/);
  assert.match(sendOff[0], /PITCH11Law\.matchAbandonmentDecision\(P,t,7,!!S\.so\)==='abandon'/);
  assert.match(sendOff[0], /S\.forfeitTeam=t;S\.mode='full'/);
  assert.match(sendOff[0], /fewer than seven players/);
});

test("Law 3 sends off an already-cautioned goalkeeper who exceeds the substitution exit deadline", () => {
  const helper = lawSource.match(/function goalkeeperSubstitutionDelayDecision\(state\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(helper, "goalkeeper substitution delay decision must be defined");
  const isolated = new Function("return (" + helper[0].replace("function goalkeeperSubstitutionDelayDecision(state)", "function (state)") + ");")();
  assert.equal(isolated({ exceededTenSeconds: false, alreadyCautioned: true }), "continue");
  assert.equal(isolated({ exceededTenSeconds: true, alreadyCautioned: false }), "caution-and-replace");
  assert.equal(isolated({ exceededTenSeconds: true, alreadyCautioned: true }), "send-off");
  const doSub = source.match(/function doSub\(p,bn\)\{[\s\S]*?\n\}/);
  assert.ok(doSub, "production substitution path must exist");
  assert.match(doSub[0], /delayDecision==='send-off'[\s\S]*?p\.yc\+\+;giveCard\(p,3\)/);
  assert.match(doSub[0], /delayDecision==='send-off'[\s\S]*?return false/);
  assert.match(doSub[0], /delayDecision==='send-off'[\s\S]*?return false[\s\S]*?S\.subs\[t\]\+\+/,
    "the send-off branch must return before consuming the substitution or removing the bench goalkeeper");
  assert.match(doSub[0], /if\(eligibility\.consumesWindow\)[\s\S]*?S\.subs\[t\]\+\+/);
});

test("Law 3 applies the ten-second exit deadline and one-minute delayed substitute entry in production", () => {
  assert.match(source, /function substitutionExitTarget\(p\)/);
  assert.match(source, /PITCH11Law\.timeLimitedSubstitutionExitDecision\(/);
  assert.match(source, /PITCH11Law\.timeLimitedSubstitutionEntryDecision\(/);
  assert.match(source, /function tickSubstitutionExits\(\)/);
  assert.match(source, /function startPendingSubstitutionClocks\(\)/);
  assert.match(source, /function completeEligiblePendingSubs\(\)/);
  assert.match(source, /function tickSubExitRunners\(\)/);
  assert.match(source, /playerExited:q\.player&&q\.player\.out===true/);
  assert.match(source, /substitutionPending=true/);
  assert.match(source, /tickSubstitutionExits\(\);tickPendingSubstitutionClocks\(\)/);
  assert.match(source, /completeEligiblePendingSubs\(\);/);
});


test("Law 7 counts match stoppages, adds the lost time back, and shows added-time clock labels", () => {
  assert.match(source, /lostTime:0,addedTime:0,addedTimeAnnounced:0/);
  assert.match(source, /PITCH11Law\.addedTimeSeconds\(S\.lostTime,unit\)/);
  assert.match(source, /PITCH11Law\.periodEndDecision\(/);
  assert.match(source, /inPlay:S\.mode==='play'/);
  assert.match(source, /PITCH11Law\.addedTimeClockLabel\(/);
  assert.match(source, /function refreshLaw7AddedTime\(\)/);
  assert.match(source, /S\.lostTime\+=DT/);
  assert.match(source, /priorMode==='whistle'/);
  assert.match(source, /priorMode==='subs'&&S\.ret!=='half'/);
  assert.match(source, /priorMode==='kickoff'&&S\.clock>0/);
});


test("Law 10 keeps temporarily off-field injury-assessment players eligible for the penalty shoot-out", () => {
  assert.match(source, /PITCH11Law\.shootoutExclusions\(P\)/);
  assert.match(source, /PITCH11Law\.shootoutOrder\(P,t\)/);
});


test("Law 10 alternates shoot-out teams from the randomly selected first kicker", () => {
  assert.match(source, /firstTeam:Math\.random\(\)<0\.5\?0:1/);
  assert.match(source, /PITCH11Law\.shootoutNextTeam\(so\.k\[0\]\.length,so\.k\[1\]\.length,so\.firstTeam\)/);
});


test("Law 10 resets goalkeeper penalty-offence warnings for the shoot-out and tracks shoot-out cautions separately", () => {
  assert.match(source, /p\.shootoutPenaltyLineOffences=0;p\.shootoutYC=0/);
  assert.match(source, /PITCH11Law\.shootoutKeeperOffenceSanction\(/);
  assert.match(source, /const offenceCount=shootout[\s\S]*?keeper\.shootoutPenaltyLineOffences/);
});


test("Law 10 independently selects the shoot-out end and first-kicking team", () => {
  assert.match(source, /flipEnds:Math\.random\(\)<0\.5\?true:false/);
  assert.match(source, /firstTeam:Math\.random\(\)<0\.5\?0:1/);
  assert.match(source, /PITCH11Law\.shootoutDirection\(t,S\.so\.flipEnds\)/);
});


test("Law 10 positions the kicker's goalkeeper on the goal-line/penalty-area boundary intersection", () => {
  assert.match(source, /PITCH11Law\.shootoutKickerGoalkeeperPosition\(/);
  assert.match(source, /penaltyHalfWidth:PEN_WIDTH\/2/);
});


test("Law 10 equalises team numbers immediately after a shoot-out sending-off", () => {
  assert.match(source, /const _giveCardShootoutEqualisation=giveCard/);
  assert.match(source, /if\(!shootoutSendOff\)return/);
  assert.match(source, /PITCH11Law\.shootoutExclusions\(P\)/);
  assert.match(source, /q\.soExcluded=true/);
});


test("Law 3 defers shoot-out goalkeeper replacement to the dedicated Law 10 handler", () => {
  assert.match(source, /if\(c<=1\|\|!wasGoalkeeper\|\|S\.mode==='full'\|\|S\.so\)return/);
  assert.match(source, /const _giveCardShootoutEqualisation=giveCard/);
  assert.match(source, /PITCH11Law\.shootoutReplacementGoalkeeper\(P,p\.team\)/);
});

test("Law 10 replaces a sent-off shoot-out goalkeeper with an eligible player and then equalises numbers", () => {
  assert.match(source, /PITCH11Law\.shootoutReplacementGoalkeeper\(P,p\.team\)/);
  assert.match(source, /const wasShootoutGoalkeeper=!!\(S\.so&&p&&p\.gk&&c>1/);
  assert.match(source, /GK\[p\.team\]=replacement/);
  assert.match(source, /PITCH11Law\.shootoutExclusions\(P\)/);
});


test("Law 10 tracks shoot-out kickers by player so eligibility changes cannot cause premature repeat kicks", () => {
  assert.match(source, /taken:\[\[\],\[\]\]/);
  assert.match(source, /PITCH11Law\.shootoutNextKicker\(P,t,so\.taken\[t\]\)/);
  assert.match(source, /so\.taken\[so\.team\]\.push\(so\.shooter\)/);
});


test("Law 10 does not replace an injured outfield shoot-out player and equalises the opponents", () => {
  assert.match(source, /const _injuredShootoutLaw10=injured/);
  assert.match(source, /if\(!q\.gk\)\{[\s\S]*?removePlayer\(q,true\)/);
  assert.match(source, /const removePlayer=\(player,injuredPlayer=false\)=>\{[\s\S]*?player\.soExcluded=true/);
  assert.match(source, /PITCH11Law\.shootoutExclusions\(P\)/);
});

test("Law 10 replaces an injured shoot-out goalkeeper using an excluded player, an available named substitute, or a player changing places", () => {
  assert.match(source, /PITCH11Law\.shootoutExcludedGoalkeeper\(P,t\)/);
  assert.match(source, /PITCH11Law\.shootoutInjuryDecision\(/);
  assert.ok(source.includes('namedSubstituteAvailable:!!namedSubstitute&&S.subs[t]<5'));
  assert.match(source, /replacement\.gk=true/);
  assert.match(source, /GK\[t\]=replacement/);
  assert.match(source, /keeperHadKicked/);
});


test("Law 10 accepts any unused named substitute as an injured shoot-out goalkeeper replacement", () => {
  assert.ok(source.includes('const namedSubstitute=S.subs[t]<5?(BENCH[t][0]||null):null'));
  assert.ok(source.includes('if(applySubstitution(q,namedSubstitute,position))'));
  assert.match(source, /BENCH\[t\]\.splice\(benchIndex,1\)/);
  assert.doesNotMatch(source, /BENCH\[t\]\.find\(player=>player\.pos==='GK'\)/);
});


test("Law 11 snapshots the second-last opponent from live player positions at the moment of the pass", () => {
  assert.match(source, /PITCH11Law\.secondLastOpponentPosition\(P,t,d\)/);
  assert.match(source, /PITCH11Law\.isOffsidePosition\(/);
  assert.doesNotMatch(source, /const t=p\.team,d=dirOf\(t\),line=TI\[t\]\.off/);
});


test("Law 8 uses the active replacement goalkeeper for a dropped ball inside the penalty area", () => {
  const dropBall = source.match(/function dropBall\(t,recipientTeam\)\{[\s\S]*?\n\}/);
  assert.ok(dropBall, "production dropped-ball routine must be present");
  assert.match(dropBall[0], /const keeper=GK\[recipient\.team\]/);
  assert.doesNotMatch(dropBall[0], /const keeper=P\[recipient\.team\*11\]/);
});


test("Law 12 preserves the goalkeeper back-pass restriction for the active replacement goalkeeper", () => {
  assert.match(source, /b\.last!==GK\[b\.gkNoHands\]/);
  assert.doesNotMatch(source, /b\.last!==P\[b\.gkNoHands\*11\]/);
  assert.match(source, /GK\[p\.team\]=replacement/);
});


test("Law 3 abandons after second-yellow send-offs issued by advantage and strict-referee paths", () => {
  assert.match(source, /function queueMinimumPlayerForfeit\(p\)\{if\(p&&p\.out&&PITCH11Law\.matchAbandonmentDecision\(P,p\.team,7,!!S\.so\)==='abandon'\)S\.forfeitTeam=p\.team;\}/);
  assert.match(source, /function finishMinimumPlayerForfeit\(\)\{[\s\S]*?S\.mode='full'[\s\S]*?MATCH ABANDONED/);
  assert.match(source, /giveCard\(p,p\.yc>1\?3:1\);\s*queueMinimumPlayerForfeit\(p\);/);
  assert.match(source, /_whistleStopPendingCard\(sec,big,sub,fn,hurt\);\s*finishMinimumPlayerForfeit\(\);/);
  assert.match(source, /_outOfPlayAdvantageCards\(\);\s*finishMinimumPlayerForfeit\(\);/);
  assert.match(source, /_endHalfPendingAdvantageCard\(\);\s*finishMinimumPlayerForfeit\(\);/);
  assert.match(source, /giveCard\(p,3\);queueMinimumPlayerForfeit\(p\);finishMinimumPlayerForfeit\(\);/);
});


test("Law 11 snapshots offside from the ball's actual kick/release contact point", () => {
  const kick = source.match(/function kick\(p,vx,vy,vz,spin,rcv,tx,ty,mode\)\{[\s\S]*?\n\}/);
  assert.ok(kick);
  assert.ok(kick[0].indexOf("b.x=p.x+Math.cos(a)*9;b.y=p.y+Math.sin(a)*9") < kick[0].indexOf("else markOff(p)"));
  assert.match(kick[0], /b\.x=p\.x\+Math\.cos\(a\)\*9;b\.y=p\.y\+Math\.sin\(a\)\*9;[\s\S]*?else markOff\(p\)/);
});
