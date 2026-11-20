export function shouldFlattenHorizontalRootMotion(file) {
  return /^(?:jog forward|jog backward|jog strafe left|jog strafe right|gk_dive-(?:high|middle|low)_shot-(?:left|right)-ball_(?:in|not_in)_hand)\.fbx$/i.test(String(file || ""));
}

const ROOT_TARGETS = new Set(["hips", "mixamorighips", "root", "mixamorigroot"]);

function getRootTarget(track) {
  if (!/\.position$/i.test(String(track?.name || ""))) return "";
  return track.name.slice(0, track.name.lastIndexOf(".")).replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function findRootTrack(clip) {
  const candidates = (clip?.tracks || []).filter(track => ROOT_TARGETS.has(getRootTarget(track)));
  const isRoot = track => getRootTarget(track) === "root" || getRootTarget(track) === "mixamorigroot";
  const isUsable = track => {
    const valueSize = typeof track.getValueSize === "function" ? track.getValueSize() : 3;
    return valueSize === 3 && track.times?.length >= 2 && track.values?.length === track.times.length * 3;
  };
  const hasDisplacement = track => {
    if (!isUsable(track)) return false;
    const last = track.values.length - 3;
    return Math.hypot(track.values[last] - track.values[0], track.values[last + 2] - track.values[2]) > 1e-5;
  };
  // Prefer a moving explicit root. Some FBXs contain a static Root plus the
  // actual horizontal displacement on Hips, so fall back to moving Hips.
  return candidates.find(track => isRoot(track) && hasDisplacement(track)) ||
    candidates.find(track => !isRoot(track) && hasDisplacement(track)) ||
    candidates.find(track => isRoot(track) && isUsable(track)) ||
    candidates.find(track => !isRoot(track) && isUsable(track)) || null;
}

export function flattenHorizontalRootMotion(clip) {
  if (!clip || !Array.isArray(clip.tracks)) return clip;
  let adjustedTracks = 0;
  for (const track of clip.tracks) {
    if (!ROOT_TARGETS.has(getRootTarget(track))) continue;
    const values = track.values;
    const valueSize = typeof track.getValueSize === "function" ? track.getValueSize() : 3;
    if (!values || valueSize !== 3 || values.length < 3 || values.length % 3 !== 0) continue;
    const firstX = values[0], firstZ = values[2];
    for (let i = 0; i < values.length; i += 3) {
      values[i] = firstX;
      values[i + 2] = firstZ;
    }
    adjustedTracks++;
  }
  clip.userData = { ...(clip.userData || {}), rootMotionFlattened: adjustedTracks > 0, rootMotionTracksAdjusted: adjustedTracks };
  return clip;
}

/**
 * Extract one horizontal root track for engine-owned movement, then neutralize
 * its X/Z animation values so the mixer cannot apply the same displacement a
 * second time to the character skeleton.
 */
export function extractHorizontalRootMotion(clip) {
  if (!clip || !Array.isArray(clip.tracks)) return clip;
  const track = findRootTrack(clip);
  let rootMotion = null;
  if (track) {
    const valueSize = typeof track.getValueSize === "function" ? track.getValueSize() : 3;
    if (valueSize === 3 && track.times?.length >= 2 && track.values?.length === track.times.length * 3) {
      rootMotion = {
        trackName: track.name,
        times: Array.from(track.times),
        values: Array.from(track.values),
        duration: Number.isFinite(clip.duration) ? clip.duration : track.times[track.times.length - 1]
      };
    }
  }
  flattenHorizontalRootMotion(clip);
  clip.userData = {
    ...(clip.userData || {}),
    rootMotionExtracted: !!rootMotion,
    rootMotion
  };
  return clip;
}

function sampleRootPosition(rootMotion, time) {
  const times = rootMotion?.times;
  const values = rootMotion?.values;
  if (!times?.length || !values?.length) return { x: 0, z: 0 };
  const firstTime = times[0];
  const lastIndex = times.length - 1;
  const t = Math.max(firstTime, Math.min(times[lastIndex], Number(time) || 0));
  let low = 0;
  let high = lastIndex;
  while (low < high - 1) {
    const mid = (low + high) >> 1;
    if (times[mid] <= t) low = mid;
    else high = mid;
  }
  const span = times[high] - times[low];
  const alpha = span > 0 ? (t - times[low]) / span : 0;
  const a = low * 3;
  const b = high * 3;
  return {
    x: values[a] + (values[b] - values[a]) * alpha,
    z: values[a + 2] + (values[b + 2] - values[a + 2]) * alpha
  };
}

export function getHorizontalRootMotionDelta(clip, previousTime, currentTime) {
  const rootMotion = clip?.userData?.rootMotion;
  if (!rootMotion) return { x: 0, z: 0 };
  const start = sampleRootPosition(rootMotion, 0);
  const current = sampleRootPosition(rootMotion, currentTime);
  if (!Number.isFinite(previousTime)) return { x: current.x - start.x, z: current.z - start.z };
  const previous = sampleRootPosition(rootMotion, previousTime);
  if (currentTime >= previousTime) return { x: current.x - previous.x, z: current.z - previous.z };
  const end = sampleRootPosition(rootMotion, rootMotion.duration);
  return {
    x: end.x - previous.x + current.x - start.x,
    z: end.z - previous.z + current.z - start.z
  };
}

export function getHorizontalRootMotionDisplacement(clip) {
  return getHorizontalRootMotionDelta(clip, 0, clip?.duration || 0);
}

export function consumeRootMotionDelta(pendingDelta, pendingDuration, deltaTime) {
  const duration = Math.max(0, Number(pendingDuration) || 0);
  const elapsed = Math.min(duration, Math.max(0, Number(deltaTime) || 0));
  if (duration <= 1e-8 || elapsed <= 0) {
    return { delta: { x: 0, z: 0 }, pendingDelta: { x: pendingDelta?.x || 0, z: pendingDelta?.z || 0 }, pendingDuration: duration };
  }
  const fraction = elapsed / duration;
  const delta = { x: (pendingDelta?.x || 0) * fraction, z: (pendingDelta?.z || 0) * fraction };
  const remaining = { x: (pendingDelta?.x || 0) - delta.x, z: (pendingDelta?.z || 0) - delta.z };
  const remainingDuration = Math.max(0, duration - elapsed);
  return { delta, pendingDelta: remainingDuration <= 1e-8 ? { x: 0, z: 0 } : remaining, pendingDuration: remainingDuration <= 1e-8 ? 0 : remainingDuration };
}

export function clampRootMotionDeltaToTarget(delta, remaining) {
  const distance = Math.hypot(remaining?.x || 0, remaining?.z || 0);
  const length = Math.hypot(delta?.x || 0, delta?.z || 0);
  if (distance <= 0 || length < 1e-9) return { x: 0, z: 0 };
  const projection = ((delta.x || 0) * (remaining.x || 0) + (delta.z || 0) * (remaining.z || 0)) / distance;
  if (projection <= 0) return { x: 0, z: 0 };
  const scale = Math.min(1, distance / projection, distance / length);
  return { x: (delta.x || 0) * scale, z: (delta.z || 0) * scale };
}

export function getLocomotionTimeScale(state, speed) {
  const velocity = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  if (state === "walk") return clamp(0.72 * velocity / 1.45, 0.55, 0.95);
  if (state === "run") return clamp(velocity / 3.65, 0.75, 1.3);
  if (state === "sprint") return clamp(1.28 * velocity / 6.2, 1.05, 1.5);
  return 1;
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
