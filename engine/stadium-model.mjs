/** Placement helper for the locally packaged Graphics 3.0 stadium. */
export function computeStadiumPlacement(bounds, maxHorizontalExtent = 220) {
  const min = bounds?.min, max = bounds?.max;
  const values = [min?.x, min?.y, min?.z, max?.x, max?.y, max?.z].map(Number);
  if (!values.every(Number.isFinite)) throw new TypeError("Finite stadium bounds are required.");
  const [minX, minY, minZ, maxX, maxY, maxZ] = values;
  const width = maxX - minX, depth = maxZ - minZ, height = maxY - minY;
  const extent = Math.max(width, depth);
  if (width <= 0 || depth <= 0 || height <= 0 || extent <= 0) throw new RangeError("Stadium model bounds must have positive dimensions.");
  const scale = Math.min(1, maxHorizontalExtent / extent);
  const cleanZero = value => Object.is(value, -0) ? 0 : value;
  return {
    scale,
    position: {
      x: cleanZero(-((minX + maxX) / 2) * scale),
      y: cleanZero(-minY * scale),
      z: cleanZero(-((minZ + maxZ) / 2) * scale)
    },
    dimensions: { width: width * scale, height: height * scale, depth: depth * scale }
  };
}
