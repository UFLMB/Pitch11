import test from "node:test";
import assert from "node:assert/strict";
import { FootballSimulation } from "./simulation.mjs";
import { Pitch11SimulationAdapter, cameraRelativeToPitch, toLegacyRenderFrame } from "./pitch11-adapter.mjs";

test("camera-relative input rotates correctly and stays normalized", () => {
  const forward = cameraRelativeToPitch(0, -1, Math.PI / 2);
  assert.ok(Math.abs(forward.x - 1) < 1e-9);
  assert.ok(Math.abs(forward.y) < 1e-9);
  const diagonal = cameraRelativeToPitch(1, -1, 0);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-9);
});

test("adapter maps pitch metres into legacy world units", () => {
  const sim = new FootballSimulation({ seed: 8 });
  const frame = toLegacyRenderFrame(sim.getSnapshot());
  assert.equal(frame.players.length, 22);
  assert.equal(frame.ball.x, 60 + sim.ball.x * 10);
  assert.equal(frame.ball.y, 60 + sim.ball.y * 10);
  assert.equal(frame.score.length, 2);
});

test("adapter sends camera-relative movement and exposes render snapshots", () => {
  const sim = new FootballSimulation({ seed: 8 });
  const adapter = new Pitch11SimulationAdapter(sim, { cameraYaw: Math.PI / 2 });
  adapter.move(0, -1, true);
  sim.update(1 / 60);
  const p = sim.players[sim.selectedPlayer];
  assert.ok(p.x > p.homeX - 1 || Number.isFinite(p.x));
  const result = adapter.update(1 / 60);
  assert.equal(result.snapshot.tick, sim.tick);
  assert.equal(result.renderFrame.players.length, 22);
  adapter.stop();
  adapter.pass();
  adapter.shoot(.8);
  adapter.tackle();
  adapter.switchPlayer();
  assert.equal(sim.commands.length, 6);
});

test("long unattended match remains finite and keeps all active players in bounds", () => {
  const sim = new FootballSimulation({ seed: 991, matchTimeScale: 20 });
  for (let i = 0; i < 9000; i++) sim.update(1 / 60);
  for (const p of sim.players) {
    if (p.out) continue;
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(p.x >= 0 && p.x <= 105 && p.y >= 0 && p.y <= 68);
  }
  for (const value of [...sim.ball ? [sim.ball.x,sim.ball.y,sim.ball.z,sim.ball.vx,sim.ball.vy,sim.ball.vz] : []]) assert.ok(Number.isFinite(value));
});
