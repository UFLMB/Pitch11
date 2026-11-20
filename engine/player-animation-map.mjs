const CLIP_ALIASES = Object.freeze({
  idle: ["idle", "standing", "stand"],
  walk: ["walk", "walking"],
  run: ["run", "running", "jog", "jogging"],
  sprint: ["sprint", "sprinting"],
  backward: ["backward", "backwards"],
  strafeLeft: ["strafeleft"],
  strafeRight: ["straferight"],
  penaltyShot: ["penaltyshot"],
  receive: ["receive", "firsttouch"],
  dribble: ["dribble", "ballcontrol"],
  shotHigh: ["shothigh", "kickup"],
  throwIn: ["throwin"],
  fallenIdle: ["fallenidle", "downedidle"],
  keeperMove: ["gkmove", "keepersidestep"],
  keeperDirect: ["gkdirect", "keeperdirecting"],
  keeperScoop: ["gkscoop", "keeperscoop"],
  keeperCatchHead: ["gkcatchhead"],
  keeperCatchStomach: ["gkcatchstomach"],
  keeperCatchJump: ["gkcatchjump"],
  keeperMiss: ["gkmiss", "keepermiss"],
  keeperPenaltyReady: ["gkpenaltyready", "penaltyready", "keeperpenaltyready"],
  keeperPass: ["gkpass", "keeperpass"],
  keeperDropKick: ["gkdropkick", "keeperdropkick"],
  keeperThrow: ["gkthrow", "keeperthrow"],
  keeperPlace: ["gkplace", "keeperplace"],
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
  keeperDiveMiddleLeft: ["gkdivemiddleleft", "keeperdivemiddleleft"],
  keeperDiveMiddleRight: ["gkdivemiddleright", "keeperdivemiddleright"],
  keeperDiveLowLeft: ["gkdivelowleft", "keeperdivelowleft"],
  keeperDiveLowRight: ["gkdivelowright", "keeperdivelowright"],
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
  keeperPenaltyReady: ["keeperSet", "idle"],
  keeperDiveLeft: ["keeperParry", "fall", "keeperSet", "idle"],
  keeperDiveRight: ["keeperParry", "fall", "keeperSet", "idle"],
  keeperDiveMiddleLeft: ["keeperDiveLeft", "keeperParry", "fall", "keeperSet", "idle"],
  keeperDiveMiddleRight: ["keeperDiveRight", "keeperParry", "fall", "keeperSet", "idle"],
  keeperDiveLowLeft: ["keeperParry", "fall", "keeperSet", "idle"],
  keeperDiveLowRight: ["keeperParry", "fall", "keeperSet", "idle"],
  receive: ["pass", "idle"],
  dribble: ["run", "walk", "idle"],
  shotHigh: ["shot", "pass", "idle"],
  throwIn: ["pass", "idle"],
  fallenIdle: ["fall", "idle"],
  keeperMove: ["run", "walk", "idle"],
  keeperDirect: ["keeperSet", "idle"],
  keeperScoop: ["keeperCatch", "keeperSet", "idle"],
  keeperMiss: ["fall", "keeperSet", "idle"],
  keeperPass: ["pass", "keeperSet", "idle"],
  keeperDropKick: ["keeperPass", "pass", "idle"],
  keeperThrow: ["keeperPass", "pass", "idle"],
  keeperPlace: ["keeperSet", "idle"],
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
  if (action.includes("keepercatchjump")) return "keeperCatchJump";
  if (action.includes("keepercatchhead")) return "keeperCatchHead";
  if (action.includes("keepercatchstomach")) return "keeperCatchStomach";
  if (action.includes("keepercatch") || action.includes("keeperclaim")) return "keeperCatch";
  if (action.includes("keeperpass")) return "keeperPass";
  if (player?.role === "GK" && action.includes("pass")) return "keeperPass";
  if (player?.role === "GK" && action === "kick") return "keeperDropKick";
  if (action.includes("keeperscoop")) return "keeperScoop";
  if (action.includes("keepermiss")) return "keeperMiss";
  if (action.includes("keeperpenaltyready") || action.includes("penaltyready")) return "keeperPenaltyReady";
  if (action.includes("keeperthrow")) return "keeperThrow";
  if (action.includes("keeperdropkick")) return "keeperDropKick";
  if (action.includes("keeperplace")) return "keeperPlace";
  if (action.includes("keeperdirect")) return "keeperDirect";
  if (action.includes("keepersidestep") || action.includes("keepermove")) return "keeperMove";
  if (action.includes("keeperparry")) return "keeperParry";
  if (action.includes("keeperdivelowleft")) return "keeperDiveLowLeft";
  if (action.includes("keeperdivelowright")) return "keeperDiveLowRight";
  if (action.includes("keeperdivemiddleleft")) return "keeperDiveMiddleLeft";
  if (action.includes("keeperdivemiddleright")) return "keeperDiveMiddleRight";
  if (action.includes("keeperdiveleft")) return "keeperDiveLeft";
  if (action.includes("keeperdiveright")) return "keeperDiveRight";
  if (action.includes("celebrat")) return "celebrate";
  if (action.includes("forwarddiagonalleft")) return "forwardDiagonalLeft";
  if (action.includes("forwarddiagonalright")) return "forwardDiagonalRight";
  if (action.includes("backwarddiagonalleft")) return "backwardDiagonalLeft";
  if (action.includes("backwarddiagonalright")) return "backwardDiagonalRight";
  if (action.includes("penaltyshot")) return "penaltyShot";
  if (action.includes("shothigh")) return "shotHigh";
  if (action === "backward" || action.startsWith("backward")) return "backward";
  if (action.includes("strafeleft")) return "strafeLeft";
  if (action.includes("straferight")) return "strafeRight";
  if (action.includes("transition")) return "transition";
  if (action.includes("throwin")) return "throwIn";
  if (action.includes("receive")) return "receive";
  if (action.includes("dribble")) return "dribble";
  if (action.includes("fallenidle")) return "fallenIdle";
  if (action.includes("header")) return "header";
  if (action.includes("shot")) return "shot";
  if (action.includes("pass")) return "pass";
  if (action.includes("getup")) return "getUp";
  if (action.includes("fall")) return "fall";
  if (action.includes("slidetackle")) return "slide";
  if (action.includes("tackle")) return "tackle";
  if (action === "kick") return "shot";
  if (action === "restart") return "pass";
  if (player?.role === "GK") {
    if (!Number.isFinite(speed) || speed < .2) return "keeperSet";
    if (speed < 2.1) return "keeperMove";
    // Reuse the same tested Mixamo jog/run clips as outfield players.
    return speed < 5.2 ? "run" : "sprint";
  }
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


// Action clips that should play once and hold their final pose until the
// simulation reports the next state. Header is the production state name;
// "jump" remains listed for compatible callers that use the older alias.
export const ONE_SHOT_ANIMATION_STATES = Object.freeze([
  "receive", "pass", "shot", "shotHigh", "penaltyShot", "tackle", "slide", "jump", "header", "fall", "getUp", "throwIn",
  "keeperDiveLeft", "keeperDiveRight", "keeperDiveMiddleLeft", "keeperDiveMiddleRight", "keeperDiveLowLeft", "keeperDiveLowRight", "keeperCatch", "keeperScoop", "keeperPass",
  "keeperDropKick", "keeperThrow", "keeperPlace", "keeperCatchHead", "keeperCatchStomach", "keeperCatchJump"
]);
const ONE_SHOT_ANIMATION_STATE_SET = new Set(ONE_SHOT_ANIMATION_STATES);
export function isOneShotAnimationState(state) {
  return ONE_SHOT_ANIMATION_STATE_SET.has(state);
}
