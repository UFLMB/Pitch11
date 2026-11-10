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
  sim.ball.x = .05; sim.ball.y = 34 - PITCH.goalWidth / 2;
  sim.ball.z = 1; sim.ball.vx = -5; sim.ball.vy = 0; sim.ball.vz = 0;
  sim.update(FIXED_DT);
  assert.ok(sim.ball.vx > 0);
  assert.ok(sim.getSnapshot().events.some(e => e.type === "goalpostHit"));
});
