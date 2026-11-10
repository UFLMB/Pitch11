const CLIP_ALIASES = Object.freeze({
  idle: ["idle", "standing", "stand"],
  walk: ["walk", "walking"],
  run: ["run", "running", "jog", "jogging"],
  sprint: ["sprint", "sprinting"],
  pass: ["pass", "shortpass", "kickpass"],
  shot: ["shot", "shoot", "shooting", "strike", "kick"],
  tackle: ["tackle", "standingtackle", "tacklewin", "tacklemissed"],
  slide: ["slide", "slidetackle"],
  jump: ["jump", "header"],
  fall: ["fall", "dive"],
  getUp: ["getup", "standup", "recover"],
  celebrate: ["celebrate", "celebration"],
  keeperSet: ["gkset", "keeperset", "goalkeeperset"],
  keeperDiveLeft: ["gkdiveleft", "gkdivleft", "keeperdiveleft"],
  keeperDiveRight: ["gkdiveright", "gkdivright", "keeperdiveright"],
  keeperCatch: ["gkcatch", "keepercatch"],
  keeperParry: ["gkparry", "keeperparry"]
});

const FALLBACKS = Object.freeze({
  sprint: ["run", "walk", "idle"],
  run: ["walk", "idle"],
  walk: ["idle"],
  pass: ["shot", "idle"],
  shot: ["pass", "idle"],
  tackle: ["slide", "run", "idle"],
  slide: ["tackle", "fall", "idle"],
  jump: ["fall", "idle"],
  fall: ["idle"],
  getUp: ["idle"],
  celebrate: ["idle"],
  keeperSet: ["idle"],
  keeperDiveLeft: ["fall", "keeperSet", "idle"],
  keeperDiveRight: ["fall", "keeperSet", "idle"],
  keeperCatch: ["keeperSet", "idle"],
  keeperParry: ["keeperSet", "idle"]
});

const normalize = value => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIAS_TO_STATE = new Map(
  Object.entries(CLIP_ALIASES).flatMap(([state, aliases]) =>
    aliases.map(alias => [normalize(alias), state]))
);

export function resolvePlayerAnimationState(player, speed = 0) {
  const action = normalize(player?.action);
  if (action.includes("keepercatch")) return "keeperCatch";
  if (action.includes("keeperparry")) return "keeperParry";
  if (action.includes("keeperdiveleft")) return "keeperDiveLeft";
  if (action.includes("keeperdiveright")) return "keeperDiveRight";
  if (action.includes("celebrat")) return "celebrate";
  if (action.includes("slidetackle")) return "slide";
  if (action.includes("tackle")) return "tackle";
  if (action === "kick") return "shot";
  if (action === "restart") return "pass";
  if (player?.role === "GK" && speed < .2) return "keeperSet";
  if (!Number.isFinite(speed) || speed < .2) return "idle";
  if (speed < 2.1) return "walk";
  if (speed < 5.2) return "run";
  return "sprint";
}

export function resolvePlayerClip(animations, state) {
  const clips = Array.isArray(animations) ? animations : [];
  const byName = new Map(clips.map(clip => [normalize(clip?.name), clip]).filter(([name]) => name));
  const candidates = [state, ...(FALLBACKS[state] || [])];
  for (const candidate of candidates) {
    const aliases = CLIP_ALIASES[candidate] || [candidate];
    for (const alias of aliases) {
      const clip = byName.get(normalize(alias));
      if (clip) return clip;
    }
    for (const clip of clips) {
      const name = normalize(clip?.name);
      if (name && aliases.some(alias => name.endsWith(normalize(alias)))) return clip;
    }
  }
  return null;
}

export const PLAYER_ANIMATION_STATES = Object.freeze(Object.keys(CLIP_ALIASES));
