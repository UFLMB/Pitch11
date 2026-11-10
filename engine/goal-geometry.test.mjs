import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_GOAL_LAYOUT,
  createGoalNetPositions,
  goalBoardClearance
} from "./goal-geometry.mjs";

test("end-line advertising boards clear the full goal depth", () => {
  assert.equal(DEFAULT_GOAL_LAYOUT.endBoardX, 59);
  assert.ok(goalBoardClearance() >= 4);
});

test("both goals receive a complete three-dimensional net volume", () => {
  const p = createGoalNetPositions();
  assert.ok(p.length > 500);
  assert.equal(p.length % 6, 0);
  assert.ok(p.every(Number.isFinite));

  const xs = [];
  for (let i = 0; i < p.length; i += 3) xs.push(p[i]);
  assert.ok(Math.min(...xs) >= -54.71);
  assert.ok(Math.max(...xs) <= 54.71);
  assert.ok(xs.some(x => x < -52.5));
  assert.ok(xs.some(x => x > 52.5));
});

test("goal net dimensions can follow the selected goal size", () => {
  const p = createGoalNetPositions({ halfWidth: 4.03, height: 2.68, depth: 2.4 });
  const ys = [], zs = [];
  for (let i = 0; i < p.length; i += 3) {
    ys.push(p[i + 1]);
    zs.push(p[i + 2]);
  }
  assert.ok(Math.max(...ys) >= 2.68);
  assert.ok(Math.max(...zs) >= 4.03);
  assert.ok(Math.min(...zs) <= -4.03);
});

test("invalid goal geometry is rejected before rendering", () => {
  assert.throws(() => createGoalNetPositions({ depth: 0 }), RangeError);
});
