import test from "node:test";
import assert from "node:assert/strict";
import { FootballSimulation } from "./simulation.mjs";
import { cameraRelativeToPitch, toLegacyRenderFrame, Pitch11SimulationAdapter } from "./pitch11-adapter.mjs";

test("legacy adapter maps the pitch corners to existing Canvas coordinates", () => {
  const sim = new FootballSimulation();
  const snapshot = sim.getSnapshot();
  snapshot.players[0].x = 0; snapshot.players[0].y = 0;
  snapshot.players[1].x = 105; snapshot.players[1].y = 68;
  const frame = toLegacyRenderFrame(snapshot);
  assert.equal(frame.players[0].x, 60);
  assert.equal(frame.players[0].y, 60);
  assert.equal(frame.players[1].x, 1110);
  assert.equal(frame.players[1].y, 740);
});

test("camera-relative input rotates into pitch coordinates", () => {
  const v = cameraRelativeToPitch(1, 0, Math.PI / 2);
  assert.ok(Math.abs(v.x) < 1e-9);
  assert.ok(Math.abs(v.y - 1) < 1e-9);
});

test("adapter returns detached render data and forwards input", () => {
  const sim = new FootballSimulation();
  const adapter = new Pitch11SimulationAdapter(sim);
  adapter.move(0.5, 0, true);
  const { snapshot, renderFrame } = adapter.update(1/60);
  assert.equal(snapshot.players.length, 22);
  assert.equal(renderFrame.players.length, 22);
  assert.equal(renderFrame.ball.x, 60 + snapshot.ball.x * 10);
  renderFrame.players[0].x = -500;
  assert.notEqual(sim.players[0].x, -500);
});
