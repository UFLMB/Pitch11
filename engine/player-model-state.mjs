const SKIN_TONES = [0xd5a47f, 0xb97f5e, 0x8e5b43, 0xe2bd9b, 0x704936, 0xc99470];
const HAIR_TONES = [0x171311, 0x302017, 0x4b3324, 0x17191c, 0x6a4b2e];

/**
 * Resolve a goalkeeper dive using the viewer-facing screen convention.
 * Animation filenames use LEFT/RIGHT as seen by a viewer facing the keeper.
 * The keeper's anatomical right therefore appears on screen-left.
 */
export function resolveKeeperDiveSide(diveAng, facing) {
  const angle = Number.isFinite(diveAng) ? diveAng : 0;
  const yaw = Number.isFinite(facing) ? facing : 0;
  const diveX = Math.cos(angle);
  const diveY = Math.sin(angle);
  const localRightX = Math.sin(yaw);
  const localRightY = -Math.cos(yaw);
  const lateral = diveX * localRightX + diveY * localRightY;
  if (Math.abs(lateral) < 1e-6) return angle < 0 ? "right" : "left";
  return lateral > 0 ? "left" : "right";
}

/**
 * Convert a viewer-facing screen-side dive into the legacy pitch/world angle.
 * Screen-left maps to the keeper's anatomical right when viewed from the
 * front; screen-right maps to the anatomical left.
 */
export function resolveKeeperDiveAngle(side, facing) {
  const yaw = Number.isFinite(facing) ? facing : 0;
  const lateralSign = String(side || "").toLowerCase() === "left" ? 1 : -1;
  const worldX = Math.sin(yaw) * lateralSign;
  const worldY = -Math.cos(yaw) * lateralSign;
  return Math.atan2(worldY, worldX);
}

export function mapLegacyPlayerState(player, index, alpha = 1, selectedPlayer = null, ballOwner = null, restart = null) {
  if (!player) return null;
  const team = Number.isInteger(player.team) ? player.team : 0;
  const role = player.gk ? "GK" : String(player.pos || "DEF").toUpperCase();
  const px = Number.isFinite(player.px) ? player.px : player.x;
  const py = Number.isFinite(player.py) ? player.py : player.y;
  const x = Number.isFinite(player.x) ? player.x : px;
  const y = Number.isFinite(player.y) ? player.y : py;
  const blend = Math.max(0, Math.min(1, Number(alpha) || 0));
  const speed = Math.hypot(Number(player.vx) || 0, Number(player.vy) || 0) * 0.1;

  let action = "idle";
  if (typeof player.animationOverride === "string" && player.animationOverride) action = player.animationOverride;
  else if (player.dive > 0) {
    if (!player.gk) action = "fall";
    else {
      // The decision layer's requested viewer-facing screen side is authoritative.
      // Re-deriving it from a world angle can flip the selected clip after
      // facing interpolation; only legacy callers without diveSide use the angle.
      const side = player.diveSide === "left" || player.diveSide === "right"
        ? player.diveSide
        : resolveKeeperDiveSide(player.diveAng, player.face);
      action = player.diveHeight === "low" ? `keeper-dive-low-${side}` :
        player.diveHeight === "middle" ? `keeper-dive-middle-${side}` : `keeper-dive-${side}`;
    }
  }
  else if (player.gk && player.diveRecover > 0) action = "get-up";
  else if (player.sd) action = "slide-tackle";
  else if (player.down) action = "fallen-idle";
  else if (player.jump > 0) action = "header";
  else if (player.ak === 1 && restart?.kind === "pen") action = "penalty-shot";
  else if (player.ak === 1) action = "shot";
  else if (player.ak === 2) action = "pass";
  else if (player.ak === 3) action = "tackle";
  else if (player.ak === 5) action = "celebrate";
  else if (player.ak === 6) action = "get-up";
  else if (restart?.kind === "throw" && restart.p === player) action = "throw-in";
  else if (player.gk && ballOwner === player) action = "keeper-catch";
  else if (ballOwner === player && speed < 1.8) action = "dribble";

  const id = Number.isInteger(index) ? index : team * 11 + (Number(player.role) || 0);
  // Directional locomotion is selected relative to the player's facing.
  // Positive local-right is screen-left when viewing the player from the front.
  // Skill-move bursts deliberately retain the existing locomotion selection.
  if (action === "idle" && !player.skill && speed >= 0.2) {
    const vx = Number(player.vx) || 0;
    const vy = Number(player.vy) || 0;
    const facing = Number.isFinite(player.face) ? player.face : 0;
    const forward = vx * Math.cos(facing) + vy * Math.sin(facing);
    const localRight = vx * Math.sin(facing) - vy * Math.cos(facing);
    if (forward < -Math.abs(localRight) * 1.2) action = "backward";
    else if (Math.abs(localRight) > Math.abs(forward) * 1.2) action = localRight > 0 ? "strafe-left" : "strafe-right";
    else if (forward > 0.35 && Math.abs(localRight) > forward * 0.25) action = localRight > 0 ? "forward-diagonal-left" : "forward-diagonal-right";
    else if (forward < -0.35 && Math.abs(localRight) > -forward * 0.25) action = localRight > 0 ? "backward-diagonal-left" : "backward-diagonal-right";
  }

  return {
    id,
    team,
    role,
    x: (px + (x - px) * blend - 585) * 0.1,
    z: (py + (y - py) * blend - 400) * 0.1,
    facing: Number.isFinite(player.face) ? player.face : 0,
    speed,
    action,
    selected: player === selectedPlayer,
    number: Number(player.num) || 0,
    stamina: Math.max(0, Math.min(1, Number(player.stam) || 0)),
    winded: !!player.winded,
    manualClipFile: typeof player.manualClipFile === "string" ? player.manualClipFile : "",
    manualClipToken: Number.isFinite(player.manualClipToken) ? player.manualClipToken : 0,
    skinTone: SKIN_TONES[id % SKIN_TONES.length],
    hairTone: HAIR_TONES[(id * 3 + team) % HAIR_TONES.length],
    visible: !player.out
  };
}

export function mapLegacyPlayers(players, alpha = 1, selectedPlayer = null, ballOwner = null, restart = null) {
  if (!Array.isArray(players)) return [];
  return players.map((player, index) => mapLegacyPlayerState(player, index, alpha, selectedPlayer, ballOwner, restart)).filter(Boolean);
}
