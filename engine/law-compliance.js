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

  function offsideLine(players, team, direction, ballProjection, opponentGoalLineProjection) {
    const defenders = players
      .filter(p => p.team !== team && !p.out)
      .map(p => p.x * direction)
      .sort((a, b) => b - a);
    const secondLast = defenders.length >= 2 ? defenders[1] : opponentGoalLineProjection;
    return Math.max(ballProjection, secondLast);
  }

  function substitutionLimits(period, extraTimeAllowed) {
    const extraTime = !!extraTimeAllowed && (period === 3 || period === 4);
    return { substitutions: extraTime ? 6 : 5, windows: extraTime ? 4 : 3 };
  }

  function goalkeeperHoldExpired(seconds) {
    return Number.isFinite(seconds) && seconds > 8;
  }

  function abandoningTeam(players, minimum = 7) {
    for (let team = 0; team < 2; team++) {
      const count = players.filter(p => p.team === team && !p.out).length;
      if (count < minimum) return team;
    }
    return null;
  }

  root.PITCH11Law = Object.freeze({
    isBeyond, shootoutDecision, shootoutExclusions, shootoutOrder,
    offsideLine, substitutionLimits, goalkeeperHoldExpired, abandoningTeam
  });
})(globalThis);
