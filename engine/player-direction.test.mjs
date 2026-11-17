import test from "node:test";
import assert from "node:assert/strict";
import { mapLegacyPlayerState } from "./player-model-state.mjs";

const headings = [
  { name: "right", face: 0 },
  { name: "down", face: Math.PI / 2 },
  { name: "left", face: Math.PI },
  { name: "up", face: -Math.PI / 2 },
  { name: "diagonal", face: Math.PI / 4 }
];

function rendererForward(yaw) {
  // Three.js objects face local -Z.
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

test("3D renderer yaw points the model along all four pitch directions", () => {
  for (const heading of headings) {
    const legacy = mapLegacyPlayerState({
      team: 0, x: 585, y: 400, px: 585, py: 400,
      vx: Math.cos(heading.face) * 20,
      vy: Math.sin(heading.face) * 20,
      face: heading.face, pos: "DEF"
    }, 0, 1);
    const yaw = -legacy.facing + Math.PI / 2;
    const actual = rendererForward(yaw);
    const expected = { x: Math.cos(heading.face), z: Math.sin(heading.face) };
    const dot = actual.x * expected.x + actual.z * expected.z;
    assert.ok(dot > 0.999999, `${heading.name}: model forward vector diverges from movement direction (dot=${dot})`);
  }
});

test("3D heading remains correct for interpolated player states", () => {
  for (let i = 0; i < 360; i += 5) {
    const face = i * Math.PI / 180;
    const legacy = mapLegacyPlayerState({
      team: 1, x: 700, y: 500, px: 690, py: 490,
      vx: Math.cos(face) * 40, vy: Math.sin(face) * 40,
      face, pos: "MID"
    }, 0, 1);
    const yaw = -legacy.facing - Math.PI / 2;
    const actual = rendererForward(yaw);
    const dot = actual.x * Math.cos(face) + actual.z * Math.sin(face);
    assert.ok(dot > 0.999999, `heading ${i}° diverges (dot=${dot})`);
  }
});
