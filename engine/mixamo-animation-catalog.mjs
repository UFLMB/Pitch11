export const MIXAMO_ANIMATION_FILES = Object.freeze([
  "fallen idle.fbx",
  "goalkeeper body block (2).fbx",
  "goalkeeper body block (3).fbx",
  "goalkeeper body block.fbx",
  "goalkeeper catch (2).fbx",
  "goalkeeper catch (3).fbx",
  "goalkeeper catch (4).fbx",
  "goalkeeper catch.fbx",
  "goalkeeper directing (2).fbx",
  "goalkeeper directing.fbx",
  "goalkeeper diving save (2).fbx",
  "goalkeeper diving save.fbx",
  "goalkeeper drop kick.fbx",
  "goalkeeper idle (2).fbx",
  "goalkeeper idle.fbx",
  "goalkeeper miss.fbx",
  "goalkeeper overhand throw.fbx",
  "goalkeeper pass.fbx",
  "goalkeeper placing ball (2).fbx",
  "goalkeeper placing ball.fbx",
  "goalkeeper scoop.fbx",
  "goalkeeper sidestep (2).fbx",
  "goalkeeper sidestep.fbx",
  "header soccerball (2).fbx",
  "header soccerball.fbx",
  "jog backward diagonal (2).fbx",
  "jog backward diagonal.fbx",
  "jog backward.fbx",
  "jog forward diagonal (2).fbx",
  "jog forward diagonal.fbx",
  "jog forward.fbx",
  "jog strafe left.fbx",
  "jog strafe right.fbx",
  "kick soccerball (2).fbx",
  "kick soccerball.fbx",
  "kick up soccerball.fbx",
  "kneeing soccerball (2).fbx",
  "kneeing soccerball.fbx",
  "offensive idle.fbx",
  "receive soccerball.fbx",
  "scissor kick.fbx",
  "soccer penalty kick.fbx",
  "soccer tackle (2).fbx",
  "soccer tackle (3).fbx",
  "soccer tackle.fbx",
  "soccer trip.fbx",
  "stall soccerball (2).fbx",
  "stall soccerball (3).fbx",
  "stall soccerball (4).fbx",
  "stall soccerball.fbx",
  "standing up.fbx",
  "strike foward jog.fbx",
  "throw in.fbx",
  "transition.fbx"
]);

const STATE_FILES = Object.freeze({
  idle: ["offensive idle.fbx"],
  walk: ["jog forward.fbx"],
  run: ["jog forward.fbx"],
  sprint: ["jog forward.fbx"],
  backward: ["jog backward.fbx"],
  forwardDiagonal: ["jog forward diagonal.fbx", "jog forward diagonal (2).fbx"],
  backwardDiagonal: ["jog backward diagonal.fbx", "jog backward diagonal (2).fbx"],
  strafeLeft: ["jog strafe left.fbx"],
  strafeRight: ["jog strafe right.fbx"],
  receive: ["receive soccerball.fbx"],
  dribble: ["stall soccerball.fbx", "stall soccerball (2).fbx", "stall soccerball (3).fbx", "stall soccerball (4).fbx", "kneeing soccerball.fbx", "kneeing soccerball (2).fbx"],
  pass: ["kick soccerball.fbx", "kick soccerball (2).fbx"],
  shot: ["soccer penalty kick.fbx", "strike foward jog.fbx", "scissor kick.fbx"],
  shotHigh: ["kick up soccerball.fbx"],
  header: ["header soccerball.fbx", "header soccerball (2).fbx"],
  throwIn: ["throw in.fbx"],
  tackle: ["soccer tackle.fbx", "soccer tackle (2).fbx", "soccer tackle (3).fbx"],
  fall: ["soccer trip.fbx", "fallen idle.fbx"],
  fallenIdle: ["fallen idle.fbx"],
  getUp: ["standing up.fbx"],
  transition: ["transition.fbx"],
  keeperSet: ["goalkeeper idle.fbx", "goalkeeper idle (2).fbx"],
  keeperPenaltyReady: ["transition.fbx"],
  keeperMove: ["goalkeeper sidestep.fbx", "goalkeeper sidestep (2).fbx"],
  keeperDirect: ["goalkeeper directing.fbx", "goalkeeper directing (2).fbx"],
  keeperCatch: ["goalkeeper catch.fbx", "goalkeeper catch (2).fbx", "goalkeeper catch (3).fbx", "goalkeeper catch (4).fbx"],
  keeperDiveLeft: ["goalkeeper diving save (2).fbx"],
  keeperDiveRight: ["goalkeeper diving save.fbx"],
  keeperDiveLowLeft: ["goalkeeper body block (2).fbx"],
  keeperDiveLowRight: ["goalkeeper body block (3).fbx"],
  keeperParry: ["goalkeeper body block.fbx", "goalkeeper body block (2).fbx", "goalkeeper body block (3).fbx"],
  keeperScoop: ["goalkeeper scoop.fbx"],
  keeperMiss: ["goalkeeper diving save.fbx", "goalkeeper diving save (2).fbx"],
  keeperPass: ["goalkeeper pass.fbx"],
  keeperDropKick: ["goalkeeper drop kick.fbx"],
  keeperThrow: ["goalkeeper overhand throw.fbx"],
  keeperPlace: ["goalkeeper placing ball.fbx", "goalkeeper placing ball (2).fbx"]
});

export function resolveMixamoClipCandidates(state, playerId = 0, diveSide = null) {
  if (state === "keeperMiss") {
    return [diveSide === "left" ? "goalkeeper diving save (2).fbx" : "goalkeeper diving save.fbx"];
  }
  const files = STATE_FILES[state] || STATE_FILES.idle;
  // Directional keeper saves are a matched left/right pair. Never rotate
  // their candidate order by player ID: doing so can silently swap the
  // intended mirrored clip for different keepers.
  if (["keeperDiveLeft", "keeperDiveRight", "keeperDiveLowLeft", "keeperDiveLowRight"].includes(state)) return [...files];
  if (files.length < 2) return [...files];
  const offset = Math.abs(Number(playerId) || 0) % files.length;
  return [...files.slice(offset), ...files.slice(0, offset)];
}

export function isMixamoClipFile(value) {
  return MIXAMO_ANIMATION_FILES.includes(String(value || ""));
}
