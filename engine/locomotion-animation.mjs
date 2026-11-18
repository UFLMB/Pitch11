export function flattenHorizontalRootMotion(clip) {
  if (!clip || !Array.isArray(clip.tracks)) return clip;
  let adjustedTracks = 0;
  for (const track of clip.tracks) {
    if (!/\.position$/i.test(String(track?.name || ""))) continue;
    const target = track.name.slice(0, track.name.lastIndexOf(".")).replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (target !== "hips" && target !== "mixamorighips" && target !== "root" && target !== "mixamorigroot") continue;
    const values = track.values;
    const valueSize = typeof track.getValueSize === "function" ? track.getValueSize() : 3;
    if (!values || valueSize !== 3 || values.length < 3 || values.length % 3 !== 0) continue;
    const firstX = values[0], firstZ = values[2];
    for (let i = 0; i < values.length; i += 3) { values[i] = firstX; values[i + 2] = firstZ; }
    adjustedTracks++;
  }
  clip.userData = { ...(clip.userData || {}), rootMotionFlattened: adjustedTracks > 0, rootMotionTracksAdjusted: adjustedTracks };
  return clip;
}
export function getLocomotionTimeScale(state, speed) {
  const velocity = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  if (state === "walk") return clamp(0.72 * velocity / 1.45, 0.55, 0.95);
  if (state === "run") return clamp(velocity / 3.65, 0.75, 1.3);
  if (state === "sprint") return clamp(1.28 * velocity / 6.2, 1.05, 1.5);
  return 1;
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
