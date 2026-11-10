export const DEFAULT_GOAL_LAYOUT = Object.freeze({
  pitchHalfLength: 52.5,
  halfWidth: 3.66,
  height: 2.44,
  depth: 2.2,
  endBoardX: 59,
  endBoardThickness: 0.3,
  netSpacing: 0.35
});

export function goalBoardClearance(layout = DEFAULT_GOAL_LAYOUT) {
  return layout.endBoardX - layout.endBoardThickness / 2 -
    (layout.pitchHalfLength + layout.depth);
}

export function createGoalNetPositions(options = {}) {
  const layout = { ...DEFAULT_GOAL_LAYOUT, ...options };
  const { pitchHalfLength, halfWidth, height, depth, netSpacing } = layout;
  for (const value of [pitchHalfLength, halfWidth, height, depth, netSpacing]) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError("Goal net dimensions must be finite positive numbers");
    }
  }

  const positions = [];
  const segment = (a, b) => positions.push(...a, ...b);
  const steps = length => Math.max(1, Math.ceil(length / netSpacing));
  const values = (min, max) => {
    const count = steps(max - min);
    return Array.from({ length: count + 1 }, (_, i) => min + (max - min) * i / count);
  };
  const ys = values(0.03, height);
  const zs = values(-halfWidth, halfWidth);
  const xs = values(0, depth);

  for (const direction of [-1, 1]) {
    const frontX = direction * pitchHalfLength;
    const backX = direction * (pitchHalfLength + depth);
    const at = distance => direction * (pitchHalfLength + distance);

    // Rear net: vertical and horizontal mesh strands.
    for (const z of zs) segment([backX, 0.03, z], [backX, height, z]);
    for (const y of ys) segment([backX, y, -halfWidth], [backX, y, halfWidth]);

    // Side panels: mesh strands run from each post to the rear net.
    for (const z of [-halfWidth, halfWidth]) {
      for (const y of ys) segment([frontX, y, z], [backX, y, z]);
      for (const x of xs) segment([at(x), 0.03, z], [at(x), height, z]);
    }

    // Roof and ground mesh close the three-dimensional net volume.
    for (const z of zs) {
      segment([frontX, height, z], [backX, height, z]);
      segment([frontX, 0.03, z], [backX, 0.03, z]);
    }
    for (const x of xs) {
      segment([at(x), height, -halfWidth], [at(x), height, halfWidth]);
      segment([at(x), 0.03, -halfWidth], [at(x), 0.03, halfWidth]);
    }
  }

  return positions;
}
