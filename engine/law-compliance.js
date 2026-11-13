/* PITCH 11 — isolated IFAB law helpers. Classic-script build for the offline production game. */
(function (root) {
  'use strict';

  function isBeyond(value, line, direction, radius) {
    return direction > 0 ? value > line + radius : value < line - radius;
  }

  function shootoutDecision(state) {
    const b = state.ball;
    const dir = state.targetDirection;
    const targetLine = dir > 0 ? state.right : state.left;
    const crossedTarget = isBeyond(b.x, targetLine, dir, state.radius);
    const insideFrame =
      Math.abs(b.y - state.centerY) <= state.goalHalfWidth - state.radius &&
      b.z <= state.goalHeight - state.radius;

    if (crossedTarget && insideFrame) return 'goal';

    const out =
      b.x < state.left - state.radius ||
      b.x > state.right + state.radius ||
      b.y < state.top - state.radius ||
      b.y > state.bottom + state.radius;
    if (out) return 'miss';

    // A goalkeeper who catches the ball ends the kick. A parry/deflection does not:
    // the ball remains live and the kicker may play it after the goalkeeper's touch.
    if (b.owner && b.owner.team !== state.shooterTeam) return 'miss';

    const speed = Math.hypot(b.vx || 0, b.vy || 0);
    if (!b.owner && b.z <= 0 && Math.abs(b.vz || 0) < 0.5 && speed < 0.5) return 'miss';
    if (!state.restartActive && state.elapsed >= state.maxSeconds) return 'miss';
    return 'live';
  }

  function droppedBallRecipient(state) {
    const dirs = state.directions || [1, -1];
    const insideY = Math.abs(state.y - state.centerY) <= state.penaltyHalfWidth;
    const inLeft = state.x >= state.left && state.x <= state.left + state.penaltyDepth && insideY;
    const inRight = state.x <= state.right && state.x >= state.right - state.penaltyDepth && insideY;
    let team = state.possessionTeam === 0 || state.possessionTeam === 1
      ? state.possessionTeam
      : state.lastTouchedTeam === 1 ? 1 : 0;
    let goalkeeper = false;
    if (inLeft) { team = dirs[0] > 0 ? 0 : 1; goalkeeper = true; }
    else if (inRight) { team = dirs[0] < 0 ? 0 : 1; goalkeeper = true; }
    return { team, goalkeeper };
  }

  function refereeContactDecision(state) {
    const s = state || {};
    return s.directGoal === true || s.possessionChanged === true || s.promisingAttack === true
      ? 'dropped-ball'
      : 'continue';
  }

  function goalKickOpponentPosition(state) {
    const x = state.x;
    const y = state.y;
    const inPenaltyArea = (x - state.goalLine) * state.direction < state.penaltyDepth + state.clearance &&
      Math.abs(y - state.centerY) < state.halfWidth + state.clearance;
    return { x: inPenaltyArea ? state.goalLine + state.direction * (state.penaltyDepth + state.clearance) : x, y };
  }

  function offsideTouchAction(state) {
    const s = state || {};
    // A deliberate save never resets an opponent's offside phase. A team-mate's
    // touch creates a new offside snapshot; an opponent's deliberate play resets it.
    if (s.deliberateSave) return 'preserve';
    if (s.sameTeam) return 'recalculate';
    if (s.deliberatePlay) return 'reset';
    return 'preserve';
  }

  function varReviewDecision(state) {
    const s = state || {};
    const category = s.category;
    const supported = ['goal', 'penalty', 'red-card', 'mistaken-identity', 'corner'];
    if (!supported.includes(category)) return { eligible: false, review: false, reason: 'not-reviewable' };

    // The 2026/27 protocol permits corner reviews only when the competition
    // enables them and the decision can still be changed before the restart.
    if (category === 'corner' && (!s.cornerReviewEnabled || s.restartOccurred)) {
      return { eligible: false, review: false, reason: 'corner-option-or-restart' };
    }

    // Once play has restarted, only mistaken identity and specified serious
    // sending-off incidents (violent conduct etc.) remain reviewable.
    const seriousSendingOff = !!(s.violentConduct || s.spitting || s.biting || s.abusiveAction);
    if (s.restartOccurred && category !== 'mistaken-identity' &&
        !(category === 'red-card' && seriousSendingOff)) {
      return { eligible: false, review: false, reason: 'restart-already-taken' };
    }

    const trigger = !!(s.clearAndObviousError || s.seriousMissedIncident);
    return { eligible: true, review: trigger, reason: trigger ? 'review-required' : 'silent-check' };
  }

  function goalkeeperPenaltyLineOffence(state) {
    const s = state || {};
    if (![s.keeperX, s.goalLine, s.attackDirection, s.footReach].every(Number.isFinite) ||
        Math.abs(s.attackDirection) !== 1) return false;
    const lineDistance = (s.goalLine - s.keeperX) * s.attackDirection;
    return lineDistance > Math.max(0, s.footReach) + 1e-6 || s.betweenPosts === false;
  }

  function penaltyKickDirectionLegal(state) {
    const s = state || {};
    return Number.isFinite(s.vx) && Number.isFinite(s.attackDirection) &&
      Math.abs(s.attackDirection) === 1 && s.vx * s.attackDirection > 0;
  }

  function penaltyAdditionalTimeDecision(state) {
    const s = state || {};
    if (s.penaltyRestart || s.retakePending || s.keeperRetake) return 'defer';
    if (s.penaltyInFlight && !s.otherPlayerTouched) return 'defer';
    return 'end';
  }

  function penaltyShotOnTarget(state) {
    const s = state || {};
    const fields = [s.x, s.y, s.z, s.vx, s.vy, s.vz, s.goalLine, s.attackDirection,
      s.centerY, s.goalHalfWidth, s.goalHeight, s.radius, s.gravity, s.maxTime];
    if (!fields.every(Number.isFinite) || Math.abs(s.attackDirection) !== 1 ||
        s.vx * s.attackDirection <= 0) return false;
    const time = (s.goalLine - s.x) / s.vx;
    if (time <= 0 || time > s.maxTime) return false;
    const projectedY = s.y + s.vy * time;
    const projectedZ = s.z + s.vz * time - 0.5 * s.gravity * time * time;
    return Math.abs(projectedY - s.centerY) <= s.goalHalfWidth - s.radius &&
      projectedZ <= s.goalHeight - s.radius;
  }

  function penaltyKeeperDecision(state) {
    const s = state || {};
    if (!s.keeperOffLine) return 'continue';
    if (s.goalScored) return 'goal';
    if (s.keeperSaved || s.impactedKicker) return 'retake';
    return 'continue';
  }

  function dogsoOpportunity(state) {
    const s = state || {};
    const validPlayerCounts = Number.isInteger(s.attackersAhead) && s.attackersAhead >= 0 &&
      Number.isInteger(s.defendersAhead) && s.defendersAhead >= 0;
    if (!validPlayerCounts || !Number.isFinite(s.distanceToGoal) ||
        !Number.isFinite(s.lateralDistance) || s.lateralDistance < 0) return false;
    const numericalAdvantage = s.attackersAhead > s.defendersAhead;
    return s.distanceToGoal > 0 && s.distanceToGoal <= 380 &&
      s.lateralDistance <= 250 &&
      (s.defendersAhead <= 1 || numericalAdvantage) &&
      s.ballControl === true && s.towardGoal === true;
  }

  function foulCardDecision(state) {
    const s = state || {};
    const dogsoPenaltyException = !!(s.dogso && s.penaltyArea && s.attemptToPlayBall);
    if (s.seriousFoulPlay) return 2;
    if (s.dogso && !dogsoPenaltyException) return 2;
    const caution = !!(s.reckless || s.stopsPromisingAttack || dogsoPenaltyException);
    if (s.alreadyBooked && caution) return 3;
    if (caution) return 1;
    return 0;
  }

  function goalkeeperHoldExpired(seconds) {
    return Number.isFinite(seconds) && seconds > 8;
  }

  function goalkeeperHoldSanction(violations) {
    if (!Number.isInteger(violations) || violations < 2) return 'none';
    return violations === 2 ? 'yellow' : 'second-yellow';
  }

  function goalkeeperHandControlDecision(insidePenaltyArea, seconds) {
    if (!insidePenaltyArea) return 'direct-free-kick';
    return goalkeeperHoldExpired(seconds) ? 'corner' : 'continue';
  }

  function goalkeeperReleaseMarker(player, hadHandControl) {
    return player && player.gk && hadHandControl ? player : null;
  }

  function goalkeeperIllegalHandlingRestart(insidePenaltyArea, prohibitedPass) {
    if (!insidePenaltyArea) return 'direct-free-kick';
    return prohibitedPass ? 'indirect-free-kick' : null;
  }

  function substitutionEligibility(state) {
    const used = Number.isFinite(state.used) ? state.used : 0;
    const windows = Number.isFinite(state.windows) ? state.windows : 0;
    if (used >= 5) return { allowed: false, consumesWindow: false, reason: 'limit' };
    if (state.halftime) return { allowed: true, consumesWindow: false, reason: 'halftime' };
    if (!state.inStoppage) return { allowed: false, consumesWindow: false, reason: 'stoppage' };
    if (state.windowUsed) return { allowed: true, consumesWindow: false, reason: 'same-window' };
    if (windows >= 3) return { allowed: false, consumesWindow: false, reason: 'windows' };
    return { allowed: true, consumesWindow: true, reason: 'new-window' };
  }

  function timeLimitedSubstitutionExitDecision(state) {
    const s = state || {};
    if (s.injuryPreventsExit || s.safetyPreventsExit || s.goalkeeperReplacement) return 'allow';
    if (s.nearOrCrossingExit) return 'allow';
    if (!Number.isFinite(s.elapsedSeconds) || s.elapsedSeconds < 10) return 'wait';
    return 'delay-substitute';
  }

  function timeLimitedSubstitutionEntryDecision(state) {
    const s = state || {};
    return s.firstStoppage === true && s.playerExited === true &&
      Number.isFinite(s.elapsedSinceRestart) && s.elapsedSinceRestart >= 60 ? 'allow' : 'wait';
  }

  function hasMinimumPlayers(players, team, minimum) {
    const limit = Number.isInteger(minimum) && minimum > 0 ? minimum : 7;
    return players.filter(p => p.team === team &&
      (!p.out || p.tempOff === true || p.substitutionPending === true)).length >= limit;
  }

  function shootoutReplacementGoalkeeper(players, team) {
    if (!Array.isArray(players)) return null;
    return players
      .filter(player => player && player.team === team && !player.out &&
        player.gk !== true && player.soExcluded !== true && player.inj !== true && player.down !== true &&
        (player.tempOff !== true || player.substitutionPending === true))
      .sort((a, b) => (b.st && Number.isFinite(b.st.def) ? b.st.def : 0) -
        (a.st && Number.isFinite(a.st.def) ? a.st.def : 0) || a.role - b.role || a.num - b.num)[0] || null;
  }


  function shootoutExcludedGoalkeeper(players, team) {
    if (!Array.isArray(players)) return null;
    return players
      .filter(player => player && player.team === team && player.out === true &&
        player.soExcluded === true && player.gk !== true && player.inj !== true && player.soUnavailableInjured !== true)
      .sort((a, b) => (b.st && Number.isFinite(b.st.def) ? b.st.def : 0) -
        (a.st && Number.isFinite(a.st.def) ? a.st.def : 0) || a.role - b.role || a.num - b.num)[0] || null;
  }

  function shootoutInjuryDecision(state) {
    const s = state || {};
    if (s.goalkeeper !== true) return 'remove-and-equalise';
    if (s.excludedPlayerAvailable === true) return 'excluded-player';
    if (s.namedSubstituteAvailable === true) return 'named-substitute';
    return 'change-places';
  }

  function shootoutKickerGoalkeeperPosition(state) {
    const s = state || {};
    if (![s.ownGoalLine, s.centerY, s.penaltyHalfWidth].every(Number.isFinite) || s.penaltyHalfWidth < 0) {
      return { x: s.ownGoalLine, y: s.centerY };
    }
    return { x: s.ownGoalLine, y: s.centerY - s.penaltyHalfWidth };
  }

  function shootoutDirection(team, changeEnds) {
    const direction = team === 1 ? -1 : 1;
    return changeEnds === true ? -direction : direction;
  }

  function shootoutKeeperOffenceSanction(previousOffences, previousCautions) {
    const offences = (Number.isInteger(previousOffences) && previousOffences >= 0 ? previousOffences : 0) + 1;
    const cautions = Number.isInteger(previousCautions) && previousCautions >= 0 ? previousCautions : 0;
    if (offences === 1) return { offences, cautions, card: 'warning' };
    const nextCautions = cautions + 1;
    return { offences, cautions: nextCautions, card: nextCautions > 1 ? 'second-yellow' : 'yellow' };
  }

  function shootoutNextTeam(team0Kicks, team1Kicks, firstTeam) {
    const a = Number.isInteger(team0Kicks) && team0Kicks >= 0 ? team0Kicks : 0;
    const b = Number.isInteger(team1Kicks) && team1Kicks >= 0 ? team1Kicks : 0;
    const first = firstTeam === 1 ? 1 : 0;
    if (a < b) return 0;
    if (b < a) return 1;
    return first;
  }

  function shootoutOrder(players, team) {
    // Every eligible player may take a kick, including the goalkeeper.
    return players
      .filter(p => p.team === team && p.soExcluded !== true && (!p.out || p.tempOff === true || p.substitutionPending === true))
      .sort((a, b) => (a.role === 0 ? 1 : 0) - (b.role === 0 ? 1 : 0) || a.role - b.role || a.num - b.num);
  }

  function shootoutNextKicker(players, team, alreadyKicked) {
    const eligible = shootoutOrder(players, team);
    const taken = Array.isArray(alreadyKicked) ? alreadyKicked : [];
    return eligible.find(player => !taken.includes(player)) || eligible[0] || null;
  }

  function shootoutExclusions(players) {
    const active = [0, 1].map(team =>
      players.filter(p => p.team === team && p.soExcluded !== true && (!p.out || p.tempOff === true || p.substitutionPending === true))
    );
    const target = Math.min(active[0].length, active[1].length);
    const excluded = [];
    for (let team = 0; team < 2; team++) {
      const excess = active[team].length - target;
      if (excess <= 0) continue;
      // Preserve the goalkeeper and defensive balance; remove the most advanced
      // eligible outfield players first. The captain's choice is abstracted here.
      const candidates = active[team]
        .filter(p => !p.gk)
        .sort((a, b) => (b.role - a.role) || (b.num - a.num));
      excluded.push(...candidates.slice(0, excess));
    }
    return excluded;
  }


  function secondLastOpponentPosition(players, team, direction) {
    if (!Array.isArray(players) || ![0, 1].includes(team) || ![1, -1].includes(direction)) return null;
    const opponents = players
      .filter(player => player && player.team !== team && !player.out && Number.isFinite(player.x))
      .map(player => player.x)
      .sort((a, b) => (b - a) * direction);
    return opponents.length ? opponents[Math.min(1, opponents.length - 1)] : null;
  }

  function isOffsidePosition(state) {
    const s = state || {};
    const fields = [s.attackerX, s.ballX, s.secondLastOpponentX, s.direction, s.halfway];
    if (!fields.every(Number.isFinite) || ![1, -1].includes(s.direction)) return false;
    const progress = value => (value - s.halfway) * s.direction;
    return progress(s.attackerX) > 0 &&
      progress(s.attackerX) > progress(s.ballX) &&
      progress(s.attackerX) > progress(s.secondLastOpponentX);
  }

  function offsideLineOfSightInterference(state) {
    const s = state || {};
    const fields = [s.attackerX, s.attackerY, s.keeperX, s.keeperY, s.ballX, s.ballY, s.radius];
    if (s.offside !== true || !fields.every(Number.isFinite) || s.radius < 0) return false;
    const dx = s.ballX - s.keeperX;
    const dy = s.ballY - s.keeperY;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared <= 1e-9) return false;
    const projection = ((s.attackerX - s.keeperX) * dx + (s.attackerY - s.keeperY) * dy) / lengthSquared;
    if (projection <= 0 || projection >= 1) return false;
    const nearestX = s.keeperX + projection * dx;
    const nearestY = s.keeperY + projection * dy;
    return Math.hypot(s.attackerX - nearestX, s.attackerY - nearestY) <= s.radius;
  }

  function restartDelayDecision(state) {
    const s = state || {};
    if (s.signalled !== true || !['throw', 'gk'].includes(s.kind) || !Number.isFinite(s.seconds) || s.seconds < 5) return 'continue';
    return s.kind === 'throw' ? 'opponent-throw-in' : 'opponent-corner';
  }

  function goalKickDelayCornerY(state) {
    const s = state || {};
    if (![s.restartY, s.topY, s.bottomY].every(Number.isFinite)) return s.bottomY;
    return Math.abs(s.restartY - s.topY) <= Math.abs(s.restartY - s.bottomY) ? s.topY : s.bottomY;
  }

  function freeKickGoalAreaPosition(state) {
    const s = state || {};
    const fields = [s.x, s.y, s.goalLine, s.direction, s.centerY, s.depth, s.halfWidth];
    if (!fields.every(Number.isFinite) || Math.abs(s.direction) !== 1 || s.depth < 0 || s.halfWidth < 0) {
      return { x: s.x, y: s.y, adjusted: false };
    }
    const distanceFromGoal = (s.goalLine - s.x) * s.direction;
    if (!s.indirect || distanceFromGoal < -1e-6 || distanceFromGoal > s.depth + 1e-6 ||
        Math.abs(s.y - s.centerY) > s.halfWidth) {
      return { x: s.x, y: s.y, adjusted: false };
    }
    return {
      x: s.goalLine - s.direction * s.depth,
      y: Math.max(s.centerY - s.halfWidth, Math.min(s.centerY + s.halfWidth, s.y)),
      adjusted: true
    };
  }

  function replacementGoalkeeper(players, team) {
    if (!Array.isArray(players)) return null;
    return players.find(player => player && player.team === team && !player.out && !player.gk) || null;
  }

  function offsideChallengeInterference(state) {
    const s = state || {};
    const fields = [s.attackerX, s.attackerY, s.opponentX, s.opponentY, s.ballX, s.ballY, s.radius];
    if (s.offside !== true || s.approaching !== true || !fields.every(Number.isFinite) || s.radius < 0) return false;
    return Math.hypot(s.attackerX - s.ballX, s.attackerY - s.ballY) <= s.radius &&
      Math.hypot(s.opponentX - s.ballX, s.opponentY - s.ballY) <= s.radius &&
      Math.hypot(s.attackerX - s.opponentX, s.attackerY - s.opponentY) <= s.radius;
  }

  function matchAbandonmentDecision(players, team, minimum, shootout) {
    if (shootout) return 'continue';
    return hasMinimumPlayers(players, team, minimum || 7) ? 'continue' : 'abandon';
  }

  function offFieldTreatmentDecision(state) {
    const s = state || {};
    if (s.goalkeeper || s.sameTeamCollision || s.goalkeeperOutfieldCollision ||
        s.severeInjury || s.penaltyKicker || s.foulCautionOrSendingOff) return 'remain';
    return s.stoppedForInjury || s.assessedOnField || s.requestedMedicalAttention
      ? 'leave-one-minute'
      : 'remain';
  }

  function offFieldReturnDecision(state) {
    const s = state || {};
    if (s.periodRestart === true) return 'return';
    return Number.isFinite(s.elapsedMinutes) && s.elapsedMinutes >= 1 ? 'return' : 'wait';
  }

  function playerEquipmentIssues(equipment) {
    const e = equipment && typeof equipment === 'object' ? equipment : {};
    const missing = [];
    if (e.shirtWithSleeves !== true) missing.push('shirt');
    if (e.shorts !== true) missing.push('shorts');
    if (e.socks !== true) missing.push('socks');
    if (e.shinguards !== true || e.shinguardsCovered !== true) missing.push('shinguards');
    if (e.footwear !== true) missing.push('footwear');
    if (e.dangerousEquipment === true) missing.push('dangerous-equipment');
    if (e.uncoveredJewellery === true) missing.push('uncovered-jewellery');
    if (e.playerElectronicEquipment === true) missing.push('electronic-equipment');
    return missing;
  }

  function equipmentInspectionDecision(equipment) {
    const issues = playerEquipmentIssues(equipment);
    if (!issues.length) return 'allow';
    return issues.some(issue => issue === 'dangerous-equipment' ||
      issue === 'uncovered-jewellery' || issue === 'electronic-equipment')
      ? 'remove-item' : 'replace-item';
  }

  function addedTimeSeconds(lostSeconds, secondsPerMatchMinute) {
    if (!Number.isFinite(lostSeconds) || lostSeconds <= 0) return 0;
    const unit = Number.isFinite(secondsPerMatchMinute) && secondsPerMatchMinute > 0
      ? secondsPerMatchMinute : 4;
    return Math.ceil(lostSeconds / unit) * unit;
  }

  function periodEndDecision(state) {
    const s = state || {};
    if (!Number.isFinite(s.clock) || !Number.isFinite(s.regulationSeconds)) return 'continue';
    const added = Number.isFinite(s.addedSeconds) && s.addedSeconds > 0 ? s.addedSeconds : 0;
    if (s.clock < s.regulationSeconds + added) return 'continue';
    return s.inPlay === true ? 'end' : 'wait-for-play';
  }

  function addedTimeClockLabel(state) {
    const s = state || {};
    if (!Number.isFinite(s.clock) || !Number.isFinite(s.regulationSeconds) ||
        !Number.isFinite(s.secondsPerMatchMinute) || s.secondsPerMatchMinute <= 0 ||
        !Number.isFinite(s.baseMinute)) return '';
    if (s.clock < s.regulationSeconds) return '';
    const extraMinute = Math.floor((s.clock - s.regulationSeconds) / s.secondsPerMatchMinute) + 1;
    return String(s.baseMinute) + '+' + String(Math.max(1, extraMinute));
  }

  function goalkeeperThrowGoalDecision(state) {
    const s = state || {};
    if (s.releasedByGoalkeeper !== true || s.lastTouchIsThrower !== true) return 'goal';
    if (!Number.isInteger(s.keeperTeam) || !Number.isInteger(s.scoringTeam)) return 'goal-kick';
    return s.keeperTeam === s.scoringTeam ? 'corner' : 'goal-kick';
  }

  function directRestartGoalDecision(state) {
    const s = state || {};
    if (!Number.isInteger(s.restartKickerTeam) || !Number.isInteger(s.scoringTeam)) return 'goal';
    if (s.restartKind === 'drop') return s.restartKickerTeam === s.scoringTeam ? 'corner' : 'goal-kick';
    return s.restartKickerTeam === 1 - s.scoringTeam ? 'corner' : 'goal';
  }

  root.PITCH11Law = Object.freeze({ timeLimitedSubstitutionExitDecision, timeLimitedSubstitutionEntryDecision, offFieldTreatmentDecision, offFieldReturnDecision, playerEquipmentIssues, equipmentInspectionDecision, addedTimeSeconds, periodEndDecision, addedTimeClockLabel, dogsoOpportunity, offsideLineOfSightInterference, offsideChallengeInterference, secondLastOpponentPosition, isOffsidePosition, restartDelayDecision, goalKickDelayCornerY, freeKickGoalAreaPosition, replacementGoalkeeper, penaltyAdditionalTimeDecision, penaltyShotOnTarget, penaltyKickDirectionLegal, offsideTouchAction, goalkeeperPenaltyLineOffence, penaltyKeeperDecision, varReviewDecision, foulCardDecision, hasMinimumPlayers, matchAbandonmentDecision, isBeyond, shootoutDecision, shootoutExclusions, shootoutOrder, shootoutNextKicker, shootoutNextTeam, shootoutDirection, shootoutReplacementGoalkeeper, shootoutExcludedGoalkeeper, shootoutInjuryDecision, shootoutKickerGoalkeeperPosition, shootoutKeeperOffenceSanction, substitutionEligibility, goalkeeperHoldExpired, goalkeeperHoldSanction, goalkeeperHandControlDecision, refereeContactDecision, goalkeeperIllegalHandlingRestart, goalkeeperReleaseMarker, goalkeeperThrowGoalDecision, directRestartGoalDecision, droppedBallRecipient, goalKickOpponentPosition });
})(globalThis);
