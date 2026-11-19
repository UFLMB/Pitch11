const SKIN_TONES = [0xd5a47f, 0xb97f5e, 0x8e5b43, 0xe2bd9b, 0x704936, 0xc99470];
const HAIR_TONES = [0x171311, 0x302017, 0x4b3324, 0x17191c, 0x6a4b2e];

/**
 * Resolve a goalkeeper dive relative to the keeper's own facing direction.
 * diveAng is stored in legacy pitch/world coordinates; Mixamo left/right
 * clips are local to the character, so the world-space vector must be
 * projected onto the keeper's local right axis.
 */
export function resolveKeeperDiveSide(diveAng, facing) {
  const angle = Number.isFinite(diveAng) ? diveAng : 0;
  const yaw = Number.isFinite(facing) ? facing : 0;
  const diveX = Math.cos(angle);
  const diveY = Math.sin(angle);
  const localRightX = Math.sin(yaw);
  const localRightY = -Math.cos(yaw);
  const lateral = diveX * localRightX + diveY * localRightY;
  if (Math.abs(lateral) < 1e-6) return angle < 0 ? "left" : "right";
  return lateral < 0 ? "left" : "right";
}

/**
 * Convert a keeper-local lateral dive into the legacy pitch/world angle.
 * "Left" and "right" are from the goalkeeper's own point of view, not the
 * camera or the attacking team's point of view.
 */
export function resolveKeeperDiveAngle(side, facing) {
  const yaw = Number.isFinite(facing) ? facing : 0;
  const lateralSign = String(side || "").toLowerCase() === "left" ? -1 : 1;
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
  else if (player.dive > 0) action = player.gk
    ? (resolveKeeperDiveSide(player.diveAng, player.face) === "left" ? "keeper-dive-left" : "keeper-dive-right")
    : "fall";
  else if (player.gk && player.diveRecover > 0) action = "get-up";
  else if (player.sd) action = "slide-tackle";
  else if (player.down) action = "fallen-idle";
  else if (player.jump > 0) action = "header";
  else if (player.ak === 1) action = "shot";
  else if (player.ak === 2) action = "pass";
  else if (player.ak === 3) action = "tackle";
  else if (player.ak === 5) action = "celebrate";
  else if (player.ak === 6) action = "get-up";
  else if (restart?.kind === "throw" && restart.p === player) action = "throw-in";
  else if (player.gk && ballOwner === player) action = "keeper-catch";
  else if (ballOwner === player && speed < 1.8) action = "dribble";

  const id = Number.isInteger(index) ? index : team * 11 + (Number(player.role) || 0);
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
    skinTone: SKIN_TONES[id % SKIN_TONES.length],
    hairTone: HAIR_TONES[(id * 3 + team) % HAIR_TONES.length],
    visible: !player.out
  };
}

export function mapLegacyPlayers(players, alpha = 1, selectedPlayer = null, ballOwner = null, restart = null) {
  if (!Array.isArray(players)) return [];
  return players.map((player, index) => mapLegacyPlayerState(player, index, alpha, selectedPlayer, ballOwner, restart)).filter(Boolean);
}
