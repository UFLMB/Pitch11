const finiteVector = (value, name) => {
  if (!value || ![value.x, value.y, value.z].every(Number.isFinite)) {
    throw new TypeError(name + " must be a finite 3D point");
  }
  return { x: value.x, y: value.y, z: value.z };
};

const mixamoName = value => String(value || "")
  .replace(/^mixamorig\d*:/i, "")
  .replace(/[^a-z0-9]/gi, "")
  .toLowerCase();

function distancePointToSegment(point, start, end) {
  const dx = end.x - start.x, dy = end.y - start.y, dz = end.z - start.z;
  const lengthSq = dx * dx + dy * dy + dz * dz;
  const t = lengthSq > 1e-12
    ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy + (point.z - start.z) * dz) / lengthSq))
    : 0;
  const closest = { x: start.x + dx * t, y: start.y + dy * t, z: start.z + dz * t };
  const ox = point.x - closest.x, oy = point.y - closest.y, oz = point.z - closest.z;
  return { distanceSq: ox * ox + oy * oy + oz * oz, closest, segmentT: t };
}

export function buildGoalkeeperContactColliders(bonePositions) {
  if (!bonePositions || typeof bonePositions !== "object") throw new TypeError("bonePositions are required");
  const positions = new Map(Object.entries(bonePositions).map(([name, point]) => [mixamoName(name), finiteVector(point, name)]));
  const get = (...names) => {
    for (const name of names) {
      const point = positions.get(mixamoName(name));
      if (point) return point;
    }
    return null;
  };
  const colliders = [];
  const add = (id, part, side, start, end, radius) => {
    if (start && end) colliders.push({ id, part, side, start, end, radius });
  };

  for (const side of ["left", "right"]) {
    const cap = side[0].toUpperCase() + side.slice(1);
    const shoulder = get(cap + "Arm", cap + "Shoulder");
    const elbow = get(cap + "ForeArm");
    const hand = get(cap + "Hand");
    add(side + "-upper-arm", "arm", side, shoulder, elbow, 0.105);
    add(side + "-forearm", "arm", side, elbow, hand, 0.09);
    add(side + "-hand", "hand", side, hand, hand, 0.145);
  }

  const hips = get("Hips");
  const spine = get("Spine");
  const spine1 = get("Spine1", "Spine");
  const spine2 = get("Spine2", "Spine1", "Spine");
  const neck = get("Neck");
  add("pelvis-core", "torso", "center", hips, spine, 0.22);
  add("chest-core", "torso", "center", spine1, spine2, 0.235);
  add("upper-chest", "torso", "center", spine2, neck, 0.19);
  return colliders;
}

export function findSweptBallContact({
  previousBall,
  currentBall,
  previousColliders = [],
  currentColliders = previousColliders,
  ballRadius = 0.11,
  samples = 6
} = {}) {
  const from = finiteVector(previousBall, "previousBall");
  const to = finiteVector(currentBall, "currentBall");
  if (!Number.isFinite(ballRadius) || ballRadius < 0) throw new RangeError("ballRadius must be non-negative");
  if (!Number.isInteger(samples) || samples < 1 || samples > 32) throw new RangeError("samples must be an integer from 1 to 32");
  const previous = new Map(previousColliders.map(item => [item.id, item]));
  const current = new Map(currentColliders.map(item => [item.id, item]));
  let best = null;

  for (let step = 0; step <= samples; step++) {
    const t = step / samples;
    const point = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      z: from.z + (to.z - from.z) * t
    };
    for (const [id, now] of current) {
      const before = previous.get(id) || now;
      const start = {
        x: before.start.x + (now.start.x - before.start.x) * t,
        y: before.start.y + (now.start.y - before.start.y) * t,
        z: before.start.z + (now.start.z - before.start.z) * t
      };
      const end = {
        x: before.end.x + (now.end.x - before.end.x) * t,
        y: before.end.y + (now.end.y - before.end.y) * t,
        z: before.end.z + (now.end.z - before.end.z) * t
      };
      const hit = distancePointToSegment(point, start, end);
      const radius = ballRadius + now.radius;
      if (hit.distanceSq > radius * radius) continue;
      if (!best || t < best.time) {
        best = {
          colliderId: id,
          part: now.part,
          side: now.side,
          time: t,
          position: point,
          contactPoint: hit.closest,
          distance: Math.sqrt(hit.distanceSq),
          combinedRadius: radius
        };
      }
    }
    if (best) break;
  }
  return best;
}
