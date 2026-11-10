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
    let team = state.lastTouchedTeam === 1 ? 1 : 0;
    let goalkeeper = false;
    if (inLeft) { team = dirs[0] > 0 ? 0 : 1; goalkeeper = true; }
    else if (inRight) { team = dirs[0] < 0 ? 0 : 1; goalkeeper = true; }
    return { team, goalkeeper };
  }

  function kickoffPlayerPosition(state) {
    let x = state.x;
    let y = state.y;
    const dx = x - state.centerX;
    const dy = y - state.centerY;
    const distance = Math.hypot(dx, dy) || 0.1;
    if (distance < state.radius) {
      x = state.centerX + dx / distance * state.radius;
      y = state.centerY + dy / distance * state.radius;
    }
    const ownEdge = state.direction > 0 ? state.centerX - 1 : state.centerX + 1;
    if ((state.direction > 0 && x > ownEdge) || (state.direction < 0 && x < ownEdge)) {
      x = ownEdge;
      const edgeDx = x - state.centerX;
      if (edgeDx * edgeDx + (y - state.centerY) ** 2 < state.radius * state.radius) {
        const side = Math.sign(y - state.centerY) || state.side || 1;
        y = state.centerY + side * Math.sqrt(Math.max(0, state.radius * state.radius - edgeDx * edgeDx));
      }
      y = Math.max(state.pitchTop + 4, Math.min(state.pitchBottom - 4, y));
    }
    return { x, y };
  }

  function goalKickOpponentPosition(state) {
    const x = state.x;
    const y = state.y;
    const inPenaltyArea = (x - state.goalLine) * state.direction < state.penaltyDepth + state.clearance &&
      Math.abs(y - state.centerY) < state.halfWidth + state.clearance;
    return { x: inPenaltyArea ? state.goalLine + state.direction * (state.penaltyDepth + state.clearance) : x, y };
  }

  function goalkeeperHoldExpired(seconds) {
    return Number.isFinite(seconds) && seconds >= 8;
  }

  function goalkeeperHandControlDecision(insidePenaltyArea, seconds) {
    if (!insidePenaltyArea) return 'direct-free-kick';
    return goalkeeperHoldExpired(seconds) ? 'corner' : 'continue';
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

  function hasMinimumPlayers(players, team, minimum) {
    const limit = Number.isInteger(minimum) && minimum > 0 ? minimum : 7;
    return players.filter(p => p.team === team && !p.out).length >= limit;
  }

  function shootoutOrder(players, team) {
    // Every eligible player may take a kick, including the goalkeeper.
    return players
      .filter(p => p.team === team && !p.out)
      .sort((a, b) => (a.role === 0 ? 1 : 0) - (b.role === 0 ? 1 : 0) || a.role - b.role || a.num - b.num);
  }

  function shootoutExclusions(players) {
    const active = [0, 1].map(team =>
      players.filter(p => p.team === team && !p.out)
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

  root.PITCH11Law = Object.freeze({ hasMinimumPlayers, isBeyond, shootoutDecision, shootoutExclusions, shootoutOrder, substitutionEligibility, goalkeeperHoldExpired, goalkeeperHandControlDecision, droppedBallRecipient, goalKickOpponentPosition, kickoffPlayerPosition });
})(globalThis);
