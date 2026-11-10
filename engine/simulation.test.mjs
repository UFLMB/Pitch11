import test from "node:test";
import assert from "node:assert/strict";
import { FootballSimulation, FIXED_DT, PITCH, SIM_VERSION } from "./simulation.mjs";

test("initializes a complete 22-player match", () => {
  const sim = new FootballSimulation({ seed: 42 });
  const s = sim.getSnapshot();
  assert.equal(s.players.length, 22);
  assert.equal(new Set(s.players.map(p => p.id)).size, 22);
  assert.equal(s.ball.owner, 9);
  assert.equal(s.phase, "playing");
});

test("fixed timestep is bounded and advances deterministically", () => {
  const a = new FootballSimulation({ seed: 123 });
  const b = new FootballSimulation({ seed: 123 });
  a.update(FIXED_DT * 3);
  b.update(FIXED_DT * 3);
  assert.equal(a.tick, 3);
  assert.equal(a.tick, b.tick);
  assert.ok(Math.abs(a.players[9].x - b.players[9].x) < 1e-9);
});

test("manual movement command moves the selected player within pitch bounds", () => {
  const sim = new FootballSimulation();
  const before = sim.players[sim.selectedPlayer].x;
  sim.command({ type: "move", x: 1, y: 0, sprint: true });
  for (let i = 0; i < 30; i++) sim.update(FIXED_DT);
  const p = sim.players[sim.selectedPlayer];
  assert.ok(p.x > before);
  assert.ok(p.x <= PITCH.length);
  assert.ok(p.y >= 0 && p.y <= PITCH.width);
});

test("pass command releases ball with finite velocity and a pass event", () => {
  const sim = new FootballSimulation();
  sim.command({ type: "pass" });
  sim.update(FIXED_DT);
  assert.equal(sim.ball.owner, -1);
  assert.ok(Number.isFinite(sim.ball.vx) && Number.isFinite(sim.ball.vy));
  assert.ok(sim.getSnapshot().events.some(e => e.type === "pass"));
});

test("shot command releases ball and records a shot", () => {
  const sim = new FootballSimulation();
  sim.command({ type: "shoot", power: 1 });
  sim.update(FIXED_DT);
  assert.equal(sim.ball.owner, -1);
  assert.ok(sim.ball.vx > 0);
  assert.ok(sim.getSnapshot().events.some(e => e.type === "shot"));
});

test("player selection cannot cross to the opponent team", () => {
  const sim = new FootballSimulation();
  assert.equal(sim.selectPlayer(15), false);
  assert.equal(sim.selectPlayer(8), true);
  assert.equal(sim.selectedPlayer, 8);
});

test("ball physics applies gravity and ground bounce without NaN", () => {
  const sim = new FootballSimulation();
  sim.ball.owner = -1;
  sim.ball.x = 30; sim.ball.y = 30; sim.ball.z = 4;
  sim.ball.vx = 12; sim.ball.vy = 1; sim.ball.vz = 0;
  for (let i = 0; i < 120; i++) sim.update(FIXED_DT);
  const b = sim.ball;
  for (const v of [b.x,b.y,b.z,b.vx,b.vy,b.vz]) assert.ok(Number.isFinite(v));
  assert.ok(b.z >= PITCH.ballRadius);
});

test("score changes only when ball crosses the goal plane inside the frame", () => {
  const sim = new FootballSimulation();
  sim.ball.owner = -1;
  sim.players[11].x = 80;
  sim.ball.x = 104.9; sim.ball.y = 34; sim.ball.z = 1;
  sim.ball.vx = 20; sim.ball.vy = 0; sim.ball.vz = 0;
  sim.update(FIXED_DT);
  assert.equal(sim.score[0], 1);
  assert.deepEqual(sim.score, [1,0]);
});

test("snapshot is detached from mutable player and ball state", () => {
  const sim = new FootballSimulation();
  const snap = sim.getSnapshot();
  snap.players[0].x = -100;
  snap.ball.x = -100;
  assert.notEqual(sim.players[0].x, -100);
  assert.notEqual(sim.ball.x, -100);
});

test("exports a versioned API", () => {
  assert.equal(typeof SIM_VERSION, "string");
  assert.equal(typeof FootballSimulation, "function");
});

test("close tackle wins possession deterministically", () => {
  const sim = new FootballSimulation({ seed: 99 });
  const defender = sim.players[9];
  const attacker = sim.players[15];
  sim.players[sim.ball.owner].hasBall = false;
  sim.ball.owner = attacker.id;
  attacker.hasBall = true;
  attacker.x = defender.x; attacker.y = defender.y;
  defender.x = attacker.x; defender.y = attacker.y;
  sim.command({ type: "tackle" });
  sim.update(FIXED_DT);
  assert.equal(sim.ball.owner, defender.id);
  assert.ok(sim.getSnapshot().events.some(e => e.type === "tackleWon"));
});

test("AI movement remains inside pitch and finite over a longer run", () => {
  const sim = new FootballSimulation({ seed: 2026 });
  for (let i = 0; i < 1800; i++) sim.update(FIXED_DT);
  for (const p of sim.players) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(p.x >= .5 && p.x <= 104.5);
    assert.ok(p.y >= .5 && p.y <= 67.5);
  }
  assert.ok(Number.isFinite(sim.ball.x) && Number.isFinite(sim.ball.y));
});

test("weather settings are bounded and wind affects airborne play", () => {
  const sim = new FootballSimulation({ windX: 2, windY: -1, wetness: 2 });
  assert.equal(sim.weather.wetness, 1);
  sim.ball.owner = -1;
  sim.ball.x = 40; sim.ball.y = 30; sim.ball.z = 2;
  sim.ball.vx = 0; sim.ball.vy = 0; sim.ball.vz = 0;
  sim.update(FIXED_DT);
  assert.ok(sim.ball.vx > 0);
  assert.ok(sim.ball.vy < 0);
});

test("goal frame collision deflects a shot away from the post", () => {
  const sim = new FootballSimulation();
  sim.ball.owner = -1;
  sim.ball.x = .12; sim.ball.y = 34 - PITCH.goalWidth / 2;
  sim.ball.z = 1; sim.ball.vx = -2; sim.ball.vy = 0; sim.ball.vz = 0;
  sim.update(FIXED_DT);
  assert.ok(sim.ball.vx > 0);
  assert.ok(sim.getSnapshot().events.some(e => e.type === "goalpostHit"));
});

test("offside is evaluated against the second-last defender", () => {
  const sim = new FootballSimulation();
  const passer = sim.players[6];
  const receiver = sim.players[9];
  passer.x = 50; passer.y = 34;
  receiver.x = 90; receiver.y = 34;
  sim.ball.x = 50; sim.ball.y = 34;
  sim.players[11].x = 101;
  for (let id = 12; id < 22; id++) sim.players[id].x = 80;
  assert.equal(sim.isOffside(receiver, 0), true);
  receiver.x = 70;
  assert.equal(sim.isOffside(receiver, 0), false);
});

test("offside receiver triggers an indirect free-kick restart", () => {
  const sim = new FootballSimulation();
  const passer = sim.players[6], receiver = sim.players[9];
  passer.x = 50; passer.y = 34; receiver.x = 90; receiver.y = 34;
  sim.ball.x = 50; sim.ball.y = 34;
  sim.players[11].x = 101;
  for (let id = 12; id < 22; id++) sim.players[id].x = 80;
  assert.equal(sim.passBall(passer, receiver.id), true);
  assert.equal(sim.ball.offsidePlayerId, receiver.id);
  for (const p of sim.players) if (p.id !== receiver.id) { p.x = 5; p.y = 5; }
  sim.ball.x = receiver.x; sim.ball.y = receiver.y; sim.ball.z = PITCH.ballRadius;
  sim.ball.owner = -1; sim.ball.lastTouchTeam = 0; sim.ball.ignorePlayerId = -1;
  sim.resolvePlayerBallContacts();
  assert.equal(sim.phase, "restart");
  assert.equal(sim.restart.type, "freeKick");
  assert.equal(sim.restart.team, 1);
});

test("throw-in restart can be taken and resumes play", () => {
  const sim = new FootballSimulation();
  sim.awardRestart(1, "throwIn", 55, 68);
  assert.equal(sim.phase, "restart");
  sim.command({ type: "restart" });
  sim.update(FIXED_DT);
  assert.equal(sim.phase, "playing");
  assert.equal(sim.restart, null);
  assert.equal(sim.players[sim.ball.owner].team, 1);
  assert.ok(sim.getSnapshot().events.some(e => e.type === "restartTaken"));
});

test("switch command changes to a different nearest teammate", () => {
  const sim = new FootballSimulation();
  const current = sim.players[sim.selectedPlayer];
  const alternate = sim.players[8];
  sim.ball.x = current.x; sim.ball.y = current.y;
  alternate.x = current.x + .5; alternate.y = current.y;
  sim.command({ type: "switch" });
  sim.update(FIXED_DT);
  assert.equal(sim.selectedPlayer, alternate.id);
});

test("analog input produces slower movement than full joystick deflection", () => {
  const low = new FootballSimulation({ seed: 4 });
  const full = new FootballSimulation({ seed: 4 });
  const lx = low.players[low.selectedPlayer].x;
  const fx = full.players[full.selectedPlayer].x;
  low.command({ type: "move", x: .2, y: 0 });
  full.command({ type: "move", x: 1, y: 0 });
  for (let i = 0; i < 30; i++) { low.update(FIXED_DT); full.update(FIXED_DT); }
  assert.ok(low.players[low.selectedPlayer].x - lx < full.players[full.selectedPlayer].x - fx);
});

test("defending last touch awards a corner to the attacking team", () => {
  const sim = new FootballSimulation();
  sim.ball.x = 105.2; sim.ball.y = 20; sim.ball.z = 1;
  sim.ball.lastTouchTeam = 1; sim.ball.owner = -1;
  sim.resolveBoundaries();
  assert.equal(sim.phase, "restart");
  assert.equal(sim.restart.type, "corner");
  assert.equal(sim.restart.team, 0);
});

test("attacking last touch awards a goal kick to the defending team", () => {
  const sim = new FootballSimulation();
  sim.ball.x = 105.2; sim.ball.y = 20; sim.ball.z = 1;
  sim.ball.lastTouchTeam = 0; sim.ball.owner = -1;
  sim.resolveBoundaries();
  assert.equal(sim.restart.type, "goalKick");
  assert.equal(sim.restart.team, 1);
});

test("crossbar collision changes the ball trajectory", () => {
  const sim = new FootballSimulation();
  sim.ball.owner = -1;
  sim.ball.x = .12; sim.ball.y = 34; sim.ball.z = PITCH.goalHeight;
  sim.ball.vx = -2; sim.ball.vy = 0; sim.ball.vz = 0;
  sim.update(FIXED_DT);
  assert.ok(sim.ball.vx > 0);
  assert.ok(sim.getSnapshot().events.some(e => e.type === "crossbarHit"));
});

test("corner restart keeps the ball inside the pitch", () => {
  const sim = new FootballSimulation();
  sim.awardRestart(0, "corner", 105, 0);
  sim.command({ type: "restart" });
  sim.update(FIXED_DT);
  assert.equal(sim.phase, "playing");
  assert.ok(sim.ball.x > 0 && sim.ball.x < 105);
  assert.ok(sim.ball.y > 0 && sim.ball.y < 68);
});

test("direct reception from a corner is exempt from offside", () => {
  const sim = new FootballSimulation();
  sim.awardRestart(0, "corner", 105, 0);
  sim.takeRestart();
  const taker = sim.players[sim.ball.owner];
  const receiver = sim.players[9];
  receiver.x = 104.8; receiver.y = 34;
  sim.ball.x = 90; sim.ball.y = taker.y;
  for (let id = 12; id < 22; id++) sim.players[id].x = 80;
  sim.players[11].x = 101;
  assert.notEqual(receiver.id, taker.id);
  assert.equal(sim.isOffside(receiver, 0), true);
  assert.equal(sim.ball.offsideExempt, true);
  sim.passBall(taker, receiver.id);
  assert.equal(sim.ball.offsidePlayerId, -1);
  assert.equal(sim.ball.offsideExempt, false);
});

test("goalkeeper parries a shot crossing the goal mouth", () => {
  const sim = new FootballSimulation();
  const keeper = sim.players[0];
  keeper.x = 2; keeper.y = 34;
  sim.ball.owner = -1; sim.ball.lastTouchTeam = 1;
  sim.ball.x = 5; sim.ball.y = 34; sim.ball.z = 1;
  sim.ball.vx = -10; sim.ball.vy = 0; sim.ball.vz = 3;
  sim.resolveGoalkeeperSaves();
  assert.ok(sim.ball.vx > 0);
  assert.ok(sim.getSnapshot().events.some(e => e.type === "keeperSave"));
});

test("match clock pauses at half-time and resumes into full-time", () => {
  const sim = new FootballSimulation({ halfLengthSeconds: .05 });
  for (let i = 0; i < 4; i++) sim.update(FIXED_DT);
  assert.equal(sim.phase, "halfTime");
  assert.equal(sim.period, 1);
  assert.ok(Math.abs(sim.matchSeconds - .05) < 1e-9);
  sim.command({ type: "continue" });
  sim.update(FIXED_DT);
  assert.equal(sim.phase, "playing");
  assert.equal(sim.period, 2);
  for (let i = 0; i < 4; i++) sim.update(FIXED_DT);
  assert.equal(sim.phase, "fullTime");
  assert.ok(Math.abs(sim.matchSeconds - .1) < 1e-9);
});

test("player separation prevents overlapping player capsules", () => {
  const sim = new FootballSimulation();
  const a = sim.players[5], b = sim.players[16];
  a.x = 50; a.y = 34; b.x = 50; b.y = 34;
  sim.resolvePlayerSeparation();
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y) >= .61);
});

test("AI defender schedules a pressure tackle near an opponent", () => {
  const sim = new FootballSimulation();
  const defender = sim.players[8], attacker = sim.players[15];
  sim.ball.owner = attacker.id;
  defender.x = attacker.x; defender.y = attacker.y;
  sim.updateAI(FIXED_DT);
  assert.ok(defender.tackleUntil > sim.time);
  assert.ok(defender.tackleCooldown > 0);
});

test("foul inside the attacking penalty area awards a penalty", () => {
  const sim = new FootballSimulation();
  const defender = sim.players[15], attacker = sim.players[9];
  attacker.x = 95; attacker.y = 34;
  sim.ball.x = 95; sim.ball.y = 34;
  assert.equal(sim.callFoul(defender, attacker), true);
  assert.equal(sim.phase, "restart");
  assert.equal(sim.restart.type, "penalty");
  assert.equal(sim.restart.team, 0);
  assert.equal(sim.restart.x, 94);
  assert.equal(sim.restart.y, 34);
});

test("second yellow card dismisses a player from active simulation", () => {
  const sim = new FootballSimulation();
  const offender = sim.players[15], victim = sim.players[9];
  sim.callFoul(offender, victim, { card: true });
  assert.equal(offender.yellowCards, 1);
  assert.equal(offender.out, false);
  sim.callFoul(offender, victim, { card: true });
  assert.equal(offender.yellowCards, 2);
  assert.equal(offender.redCard, true);
  assert.equal(offender.out, true);
  assert.equal(sim.selectPlayer(offender.id), false);
});

test("formation can change independently for either team", () => {
  const sim = new FootballSimulation();
  assert.equal(sim.formations[0], "4-3-3");
  assert.equal(sim.setFormation(0, "4-4-2"), true);
  assert.equal(sim.players[8].role, "MID");
  assert.equal(sim.players[9].role, "FWD");
  assert.equal(sim.setFormation(1, "4-2-3-1"), true);
  assert.equal(sim.players[20].role, "MID");
  assert.equal(sim.players[21].role, "FWD");
  assert.equal(sim.setFormation(0, "invalid"), false);
  assert.deepEqual(sim.getSnapshot().formations, ["4-4-2", "4-2-3-1"]);
});

test("dismissed controlled player is switched out and never takes kickoff", () => {
  const sim = new FootballSimulation();
  const offender = sim.players[sim.selectedPlayer];
  const victim = sim.players[15];
  sim.callFoul(offender, victim, { card: true });
  sim.callFoul(offender, victim, { card: true });
  assert.equal(offender.out, true);
  assert.notEqual(sim.selectedPlayer, offender.id);
  assert.equal(sim.players[sim.selectedPlayer].selected, true);
  sim.resetKickoff();
  assert.notEqual(sim.ball.owner, offender.id);
  assert.equal(sim.players[sim.ball.owner].out, false);
});

test("team tactics are independently configurable and bounded", () => {
  const sim = new FootballSimulation();
  assert.equal(sim.setTactics(0, { width: 2, depth: .8, pressing: 1.2, directness: 1.1 }), true);
  assert.equal(sim.setTactics(1, { width: .7, depth: 1.1, pressing: .2, directness: .4 }), true);
  assert.deepEqual(sim.tactics[0], { width: 1.4, depth: .8, pressing: 1.2, directness: 1.1 });
  assert.deepEqual(sim.tactics[1], { width: .7, depth: 1.1, pressing: .2, directness: .4 });
  assert.equal(sim.setTactics(2, { width: 1 }), false);
  assert.deepEqual(sim.getSnapshot().tactics, sim.tactics);
});

test("substitution replaces a selected player during a stoppage", () => {
  const sim = new FootballSimulation();
  sim.phase = "halfTime";
  const outgoing = sim.players[9];
  assert.equal(sim.substitute(0, outgoing.id, 5), true);
  const incoming = sim.players[22];
  assert.equal(outgoing.out, true);
  assert.equal(incoming.out, false);
  assert.equal(incoming.team, 0);
  assert.equal(sim.selectedPlayer, incoming.id);
  assert.equal(sim.substitutionsUsed[0], 1);
  assert.equal(sim.getSnapshot().players.length, 23);
});

test("substitution transfers possession from the outgoing player", () => {
  const sim = new FootballSimulation();
  sim.phase = "halfTime";
  const outgoing = sim.players[9];
  sim.ball.owner = outgoing.id; outgoing.hasBall = true;
  assert.equal(sim.substitute(0, outgoing.id, 5), true);
  assert.equal(sim.ball.owner, 22);
  assert.equal(sim.players[22].hasBall, true);
});

test("five-substitution limit is enforced and live substitutions are blocked", () => {
  const sim = new FootballSimulation();
  assert.equal(sim.substitute(0, 1, 0), false);
  sim.phase = "halfTime";
  for (let i = 1; i <= 5; i++) assert.equal(sim.substitute(0, i, 0), true);
  assert.equal(sim.substitutionsUsed[0], 5);
  assert.equal(sim.substitute(0, 6, 0), false);
});


test("defensive block narrows in its own half and steps out when play moves away", () => {
  const sim = new FootballSimulation();
  const defender = sim.players[12];
  const opponent = sim.players[9];
  opponent.y = 34;
  opponent.x = 90;
  sim.setShapeTarget(defender, opponent);
  const deepWidth = Math.abs(defender.targetY - 34);
  opponent.x = 20;
  sim.setShapeTarget(defender, opponent);
  const highBlockWidth = Math.abs(defender.targetY - 34);
  assert.ok(deepWidth < Math.abs(defender.homeY - 34));
  assert.ok(highBlockWidth > deepWidth);
});

test("forwards make a measured support run as possession advances", () => {
  const advanced = new FootballSimulation({ seed: 71 });
  const slowerBuild = new FootballSimulation({ seed: 71 });
  advanced.players[9].x = 82;
  slowerBuild.players[9].x = 20;
  advanced.players[9].y = slowerBuild.players[9].y = 34;
  advanced.ball.owner = slowerBuild.ball.owner = 9;
  advanced.updateAI(FIXED_DT);
  slowerBuild.updateAI(FIXED_DT);
  assert.ok(advanced.players[10].targetX > slowerBuild.players[10].targetX + 1);
});
