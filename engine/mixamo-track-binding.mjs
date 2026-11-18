function canonicalBoneName(name) {
  return String(name || "").replace(/[\s_]/g, "").replace(/[^a-z0-9]/gi, "").replace(/^mixamorig\d*/i, "").toLowerCase();
}

export function normalizeMixamoTrackTargets(boneNames, sourceTracks) {
  const aliases = new Map();
  for (const name of Array.isArray(boneNames) ? boneNames : []) {
    if (!name) continue;
    const key = canonicalBoneName(name);
    const list = aliases.get(key) || [];
    if (!list.includes(name)) list.push(name);
    aliases.set(key, list);
  }

  const tracks = [];
  const unresolved = [];
  const ambiguous = [];
  const mapped = new Set();
  for (const sourceTrack of Array.isArray(sourceTracks) ? sourceTracks : []) {
    const track = sourceTrack.clone ? sourceTrack.clone() : { ...sourceTrack };
    const sourceName = String(sourceTrack?.name || "");
    const dot = sourceName.lastIndexOf(".");
    if (dot < 1) {
      unresolved.push(sourceName);
      tracks.push(track);
      continue;
    }
    const rawTarget = sourceName.slice(0, dot);
    const property = sourceName.slice(dot + 1);
    const matches = aliases.get(canonicalBoneName(rawTarget)) || [];
    if (matches.length === 1) {
      track.name = matches[0] + "." + property;
      mapped.add(canonicalBoneName(rawTarget));
    } else if (matches.length > 1) {
      ambiguous.push({ track: sourceName, matches: [...matches] });
    } else {
      unresolved.push(sourceName);
    }
    tracks.push(track);
  }

  return {
    tracks,
    unresolved,
    ambiguous,
    uniqueTargets: mapped.size,
    trackCount: tracks.length
  };
}
