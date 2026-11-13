import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('./law-compliance.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const law = context.globalThis.PITCH11Law;

const base = {
  shooterTeam: 0, targetDirection: 1,
  left: 0, right: 100, top: 0, bottom: 60,
  centerY: 30, goalHalfWidth: 3.66, goalHeight: 2.44,
  radius: 0.11, elapsed: 2, maxSeconds: 8,
  ball: { x: 100.12, y: 30, z: 1, vx: 1, vy: 0, vz: 0, owner: null }
};

test('shootout goal requires the whole ball to cross inside the frame', () => {
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, x: 100.12 } }), 'goal');
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, x: 100.05 } }), 'live');
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, y: 3.60 } }), 'miss');
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, z: 2.40 } }), 'miss');
});

test('a goalkeeper catch ends the kick but a parry leaves it live', () => {
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, x: 95, owner: { team: 1 } } }), 'miss');
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, x: 95, vx: -1, owner: null, last: { team: 1 } } }), 'live');
});

test('a post rebound remains live until it stops or leaves the field', () => {
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, x: 95, vx: -2 } }), 'live');
  assert.equal(law.shootoutDecision({ ...base, ball: { ...base.ball, x: 95, y: 60.2, vx: 0 } }), 'miss');
  assert.equal(law.shootoutDecision({ ...base, elapsed: 8, ball: { ...base.ball, x: 95 } }), 'miss');
  assert.equal(law.shootoutDecision({ ...base, elapsed: 8, restartActive: true, ball: { ...base.ball, x: 95, owner: { team: 0 } } }), 'live');
});

test('shootout teams are reduced to equal numbers without removing goalkeepers', () => {
  const players = [];
  for (let team = 0; team < 2; team++) {
    for (let role = 0; role < 11; role++) players.push({ team, role, num: role + 1, gk: role === 0, out: team === 1 && role === 10 });
  }
  const excluded = law.shootoutExclusions(players);
  assert.equal(excluded.length, 1);
  assert.equal(excluded[0].team, 0);
  assert.equal(excluded[0].gk, false);
  assert.equal(excluded[0].role, 10);
});

test('production ball dimensions remain unchanged', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /GOALH=36\.6,GOALD=22,GOALZ=24,BR=4,BVR=1\.1,BALL_SCALE=1/);
});


test('shootout order includes every eligible player, including the goalkeeper, exactly once', () => {
  const players = [];
  for (let team = 0; team < 2; team++) {
    for (let role = 0; role < 11; role++) players.push({ team, role, num: role + 1, gk: role === 0, out: false });
  }
  players[7].out = true;
  const order = law.shootoutOrder(players, 0);
  assert.equal(order.length, 10);
  assert.equal(order.some(p => p.gk), true);
  assert.equal(new Set(order).size, 10);
  assert.equal(order.some(p => p.out), false);
  assert.equal(law.shootoutOrder(players, 1).length, 11);
});


test('Law 3 requires at least seven eligible players; dismissed players do not count', () => {
  const players = Array.from({ length: 11 }, (_, role) => ({ team: 0, role, out: false, inj: role === 6 }));
  assert.equal(law.hasMinimumPlayers(players, 0), true);
  for (const p of players.slice(0, 5)) p.out = true;
  assert.equal(law.hasMinimumPlayers(players, 0), false);
  assert.equal(law.hasMinimumPlayers(players, 1), false);
  assert.equal(law.hasMinimumPlayers(players, 0, 6), true);
});


test('substitution eligibility enforces five players and three stoppage opportunities', () => {
  const check = state => ({ ...law.substitutionEligibility(state) });
  assert.deepEqual(check({ used: 0, windows: 0, inStoppage: false, halftime: false, windowUsed: false }),
    { allowed: false, consumesWindow: false, reason: 'stoppage' });
  assert.deepEqual(check({ used: 0, windows: 0, inStoppage: true, halftime: false, windowUsed: false }),
    { allowed: true, consumesWindow: true, reason: 'new-window' });
  assert.deepEqual(check({ used: 2, windows: 1, inStoppage: true, halftime: false, windowUsed: true }),
    { allowed: true, consumesWindow: false, reason: 'same-window' });
  assert.deepEqual(check({ used: 2, windows: 3, inStoppage: true, halftime: false, windowUsed: false }),
    { allowed: false, consumesWindow: false, reason: 'windows' });
  assert.deepEqual(check({ used: 4, windows: 3, inStoppage: false, halftime: true, windowUsed: false }),
    { allowed: true, consumesWindow: false, reason: 'halftime' });
  assert.deepEqual(check({ used: 5, windows: 0, inStoppage: true, halftime: true, windowUsed: false }),
    { allowed: false, consumesWindow: false, reason: 'limit' });
});


test('goalkeeper hand control expires only after eight full seconds', () => {
  assert.equal(law.goalkeeperHoldExpired(0), false);
  assert.equal(law.goalkeeperHoldExpired(7.999), false);
  assert.equal(law.goalkeeperHoldExpired(8), false);
  assert.equal(law.goalkeeperHoldExpired(8.0001), true);
  assert.equal(law.goalkeeperHoldExpired(8.5), true);
  assert.equal(law.goalkeeperHoldExpired(NaN), false);
});


test('dropped balls in either penalty area go to the defending goalkeeper', () => {
  const decide = law.droppedBallRecipient;
  assert.deepEqual({ ...decide({ x: 10, y: 50, left: 0, right: 100, centerY: 50, penaltyDepth: 20, penaltyHalfWidth: 20, directions: [1, -1], lastTouchedTeam: 1 }) }, { team: 0, goalkeeper: true });
  assert.deepEqual({ ...decide({ x: 90, y: 50, left: 0, right: 100, centerY: 50, penaltyDepth: 20, penaltyHalfWidth: 20, directions: [1, -1], lastTouchedTeam: 0 }) }, { team: 1, goalkeeper: true });
  assert.deepEqual({ ...decide({ x: 10, y: 50, left: 0, right: 100, centerY: 50, penaltyDepth: 20, penaltyHalfWidth: 20, directions: [-1, 1], lastTouchedTeam: 0 }) }, { team: 1, goalkeeper: true });
  assert.deepEqual({ ...decide({ x: 50, y: 50, left: 0, right: 100, centerY: 50, penaltyDepth: 20, penaltyHalfWidth: 20, directions: [1, -1], lastTouchedTeam: 1 }) }, { team: 1, goalkeeper: false });
});


test('goal-kick opponents are moved outside the penalty area, while players outside stay put', () => {
  const place = state => ({ ...law.goalKickOpponentPosition(state) });
  assert.deepEqual(place({ x: 80, y: 0, goalLine: 0, direction: 1, penaltyDepth: 165, halfWidth: 100, centerY: 0, clearance: 12 }), { x: 177, y: 0 });
  assert.deepEqual(place({ x: 120, y: 80, goalLine: 0, direction: 1, penaltyDepth: 165, halfWidth: 100, centerY: 0, clearance: 12 }), { x: 177, y: 80 });
  assert.deepEqual(place({ x: 190, y: 0, goalLine: 0, direction: 1, penaltyDepth: 165, halfWidth: 100, centerY: 0, clearance: 12 }), { x: 190, y: 0 });
  assert.deepEqual(place({ x: 920, y: 0, goalLine: 1000, direction: -1, penaltyDepth: 165, halfWidth: 100, centerY: 0, clearance: 12 }), { x: 823, y: 0 });
});

test('goalkeeper hand control outside the penalty area is a direct free kick; inside follows the eight-second clock', () => {
  assert.equal(law.goalkeeperHandControlDecision(false, 0), 'direct-free-kick');
  assert.equal(law.goalkeeperHandControlDecision(false, 8), 'direct-free-kick');
  assert.equal(law.goalkeeperHandControlDecision(true, 7.999), 'continue');
  assert.equal(law.goalkeeperHandControlDecision(true, 8), 'continue');
  assert.equal(law.goalkeeperHandControlDecision(true, 8.0001), 'corner');
});


test('goalkeeper illegal handling uses a direct free kick outside the area and an indirect free kick for a prohibited pass inside', () => {
  assert.equal(law.goalkeeperIllegalHandlingRestart(false, false), 'direct-free-kick');
  assert.equal(law.goalkeeperIllegalHandlingRestart(false, true), 'direct-free-kick');
  assert.equal(law.goalkeeperIllegalHandlingRestart(true, true), 'indirect-free-kick');
  assert.equal(law.goalkeeperIllegalHandlingRestart(true, false), null);
});


test('the goalkeeper second-hand-touch marker is created only after actual hand control', () => {
  const keeper = { gk: true, team: 0 };
  const outfielder = { gk: false, team: 0 };
  assert.equal(law.goalkeeperReleaseMarker(keeper, true), keeper);
  assert.equal(law.goalkeeperReleaseMarker(keeper, false), null);
  assert.equal(law.goalkeeperReleaseMarker(outfielder, true), null);
  assert.equal(law.goalkeeperReleaseMarker(null, true), null);
});

test('Law 12 cautions reckless challenges, sends off serious foul play, and handles a second yellow', () => {
  assert.equal(law.foulCardDecision({ reckless: false, alreadyBooked: false }), 0);
  assert.equal(law.foulCardDecision({ reckless: true, alreadyBooked: false }), 1);
  assert.equal(law.foulCardDecision({ reckless: true, alreadyBooked: true }), 3);
  assert.equal(law.foulCardDecision({ seriousFoulPlay: true, reckless: false, alreadyBooked: false }), 2);
  assert.equal(law.foulCardDecision({ seriousFoulPlay: true, reckless: true, alreadyBooked: true }), 2);
});

test('VAR checks are limited to the five 2026/27 review categories and clear errors', () => {
  const silentGoal = law.varReviewDecision({ category: 'goal' });
  assert.equal(silentGoal.eligible, true);
  assert.equal(silentGoal.review, false);
  assert.equal(silentGoal.reason, 'silent-check');
  assert.equal(law.varReviewDecision({ category: 'goal', clearAndObviousError: true }).review, true);
  assert.equal(law.varReviewDecision({ category: 'penalty', seriousMissedIncident: true }).review, true);
  assert.equal(law.varReviewDecision({ category: 'throw-in', clearAndObviousError: true }).eligible, false);
});

test('VAR restart restrictions preserve only mistaken identity and serious sending-off reviews', () => {
  assert.equal(law.varReviewDecision({ category: 'goal', clearAndObviousError: true, restartOccurred: true }).review, false);
  assert.equal(law.varReviewDecision({ category: 'penalty', seriousMissedIncident: true, restartOccurred: true }).review, false);
  assert.equal(law.varReviewDecision({ category: 'mistaken-identity', clearAndObviousError: true, restartOccurred: true }).review, true);
  assert.equal(law.varReviewDecision({ category: 'red-card', seriousMissedIncident: true, violentConduct: true, restartOccurred: true }).review, true);
  assert.equal(law.varReviewDecision({ category: 'red-card', seriousMissedIncident: true, spitting: true, restartOccurred: true }).review, true);
  assert.equal(law.varReviewDecision({ category: 'red-card', seriousMissedIncident: true, biting: true, restartOccurred: true }).review, true);
  assert.equal(law.varReviewDecision({ category: 'red-card', seriousMissedIncident: true, abusiveAction: true, restartOccurred: true }).review, true);
  assert.equal(law.varReviewDecision({ category: 'red-card', clearAndObviousError: true, restartOccurred: true }).review, false);
});

test('corner VAR is competition-enabled and must be immediate before the restart', () => {
  assert.equal(law.varReviewDecision({ category: 'corner', clearAndObviousError: true }).eligible, false);
  assert.equal(law.varReviewDecision({ category: 'corner', clearAndObviousError: true, cornerReviewEnabled: true }).review, true);
  assert.equal(law.varReviewDecision({ category: 'corner', clearAndObviousError: true, cornerReviewEnabled: true, restartOccurred: true }).review, false);
});

test('Law 14 goalkeeper must keep at least part of one foot on or behind the goal line', () => {
  assert.equal(law.goalkeeperPenaltyLineOffence({ keeperX: 96, goalLine: 100, attackDirection: 1, footReach: 4.5 }), false);
  assert.equal(law.goalkeeperPenaltyLineOffence({ keeperX: 94, goalLine: 100, attackDirection: 1, footReach: 4.5 }), true);
  assert.equal(law.goalkeeperPenaltyLineOffence({ keeperX: 104, goalLine: 100, attackDirection: 1, footReach: 4.5 }), false);
  assert.equal(law.goalkeeperPenaltyLineOffence({ keeperX: 96, goalLine: 100, attackDirection: 1, footReach: 4.5, betweenPosts: false }), true);
  assert.equal(law.goalkeeperPenaltyLineOffence({ keeperX: NaN, goalLine: 100, attackDirection: 1, footReach: 4.5 }), false);
  assert.equal(law.goalkeeperPenaltyLineOffence({ keeperX: 8, goalLine: 0, attackDirection: -1, footReach: 4.5 }), true);
  assert.equal(law.goalkeeperPenaltyLineOffence({ keeperX: 4, goalLine: 0, attackDirection: -1, footReach: 4.5 }), false);
  assert.equal(law.goalkeeperPenaltyLineOffence({ keeperX: -4, goalLine: 0, attackDirection: -1, footReach: 4.5 }), false);
});

test('Law 14 retakes a saved penalty after keeper infringement but awards a goal if scored', () => {
  assert.equal(law.penaltyKeeperDecision({ keeperOffLine: false, keeperSaved: true }), 'continue');
  assert.equal(law.penaltyKeeperDecision({ keeperOffLine: true, goalScored: true, keeperSaved: true }), 'goal');
  assert.equal(law.penaltyKeeperDecision({ keeperOffLine: true, keeperSaved: true }), 'retake');
  assert.equal(law.penaltyKeeperDecision({ keeperOffLine: true, impactedKicker: true }), 'retake');
  assert.equal(law.penaltyKeeperDecision({ keeperOffLine: true }), 'continue');
});

test('Law 11 preserves offside after opponent deflections and deliberate saves', () => {
  assert.equal(law.offsideTouchAction({ sameTeam: false, deliberatePlay: false }), 'preserve');
  assert.equal(law.offsideTouchAction({ sameTeam: false, deliberatePlay: true, deliberateSave: true }), 'preserve');
  assert.equal(law.offsideTouchAction({ sameTeam: false, deliberatePlay: true, deliberateSave: false }), 'reset');
  assert.equal(law.offsideTouchAction({ sameTeam: true, deliberatePlay: false }), 'recalculate');
  assert.equal(law.offsideTouchAction({ sameTeam: true, deliberatePlay: true, deliberateSave: true }), 'preserve');
});

test('Law 14 requires a penalty kick to travel forward toward the opponents goal', () => {
  assert.equal(law.penaltyKickDirectionLegal({ vx: 120, attackDirection: 1 }), true);
  assert.equal(law.penaltyKickDirectionLegal({ vx: -120, attackDirection: 1 }), false);
  assert.equal(law.penaltyKickDirectionLegal({ vx: -120, attackDirection: -1 }), true);
  assert.equal(law.penaltyKickDirectionLegal({ vx: 120, attackDirection: -1 }), false);
  assert.equal(law.penaltyKickDirectionLegal({ vx: 0, attackDirection: 1 }), false);
});

test('Law 14 keeper-save retakes require the penalty shot to be on target', () => {
  const base = { x: 900, y: 400, z: 4, vx: 200, vy: 0, vz: 0, goalLine: 1000, attackDirection: 1, centerY: 400, goalHalfWidth: 36.6, goalHeight: 24, radius: 4, gravity: 300, maxTime: 2 };
  assert.equal(law.penaltyShotOnTarget(base), true);
  assert.equal(law.penaltyShotOnTarget({ ...base, y: 450 }), false);
  assert.equal(law.penaltyShotOnTarget({ ...base, z: 30, vz: 80 }), false);
  assert.equal(law.penaltyShotOnTarget({ ...base, vx: -200 }), false);
  assert.equal(law.penaltyShotOnTarget({ ...base, x: 100, goalLine: 0, vx: -200, attackDirection: -1 }), true);
  assert.equal(law.penaltyShotOnTarget({ ...base, maxTime: 0.2 }), false);
});

test('Law 14 additional time continues only until the penalty kick is completed', () => {
  assert.equal(law.penaltyAdditionalTimeDecision({ penaltyRestart: true }), 'defer');
  assert.equal(law.penaltyAdditionalTimeDecision({ penaltyInFlight: true, otherPlayerTouched: false }), 'defer');
  assert.equal(law.penaltyAdditionalTimeDecision({ penaltyInFlight: true, otherPlayerTouched: true }), 'end');
  assert.equal(law.penaltyAdditionalTimeDecision({ penaltyInFlight: true, otherPlayerTouched: true, keeperRetake: true }), 'defer');
  assert.equal(law.penaltyAdditionalTimeDecision({ retakePending: true }), 'defer');
  assert.equal(law.penaltyAdditionalTimeDecision({}), 'end');
});

test('Law 12 distinguishes DOGSO, the penalty-area exception, SPA and serious foul play', () => {
  assert.equal(law.foulCardDecision({ dogso: true, penaltyArea: false, attemptToPlayBall: true }), 2);
  assert.equal(law.foulCardDecision({ dogso: true, penaltyArea: true, attemptToPlayBall: true }), 1);
  assert.equal(law.foulCardDecision({ dogso: true, penaltyArea: true, attemptToPlayBall: false }), 2);
  assert.equal(law.foulCardDecision({ dogso: true, penaltyArea: true, attemptToPlayBall: true, alreadyBooked: true }), 3);
  assert.equal(law.foulCardDecision({ stopsPromisingAttack: true }), 1);
  assert.equal(law.foulCardDecision({ stopsPromisingAttack: true, alreadyBooked: true }), 3);
  assert.equal(law.foulCardDecision({ seriousFoulPlay: true, alreadyBooked: true }), 2);
});

test('DOGSO requires proximity, control, forward direction and no more than one defender ahead', () => {
  const base = { distanceToGoal: 240, lateralDistance: 80, defendersAhead: 1, attackersAhead: 0, ballControl: true, towardGoal: true };
  assert.equal(law.dogsoOpportunity(base), true);
  assert.equal(law.dogsoOpportunity({ ...base, defendersAhead: 2 }), false);
  assert.equal(law.dogsoOpportunity({ ...base, distanceToGoal: 420 }), false);
  assert.equal(law.dogsoOpportunity({ ...base, ballControl: false }), false);
  assert.equal(law.dogsoOpportunity({ ...base, towardGoal: false }), false);
});

test('DOGSO also considers numerical attacking support under the 2026/27 Law 12 wording', () => {
  const base = { distanceToGoal: 240, lateralDistance: 80, defendersAhead: 3, attackersAhead: 4, ballControl: true, towardGoal: true };
  assert.equal(law.dogsoOpportunity(base), true);
  assert.equal(law.dogsoOpportunity({ ...base, attackersAhead: 3 }), false);
});


test('Law 11 detects an offside attacker clearly blocking the goalkeeper\'s line of sight', () => {
  const base = { offside: true, attackerX: 5, attackerY: 5, keeperX: 0, keeperY: 0, ballX: 10, ballY: 10, radius: 1 };
  assert.equal(law.offsideLineOfSightInterference(base), true);
  assert.equal(law.offsideLineOfSightInterference({ ...base, attackerY: 8 }), false);
  assert.equal(law.offsideLineOfSightInterference({ ...base, attackerX: -1, attackerY: -1 }), false);
  assert.equal(law.offsideLineOfSightInterference({ ...base, offside: false }), false);
  assert.equal(law.offsideLineOfSightInterference({ ...base, radius: NaN }), false);
});


test('2026/27 Laws 15 and 16 require a referee countdown signal before reversing a delayed restart', () => {
  assert.equal(law.restartDelayDecision({ kind: 'throw', seconds: 5, signalled: false }), 'continue');
  assert.equal(law.restartDelayDecision({ kind: 'throw', seconds: 4.999, signalled: true }), 'continue');
  assert.equal(law.restartDelayDecision({ kind: 'throw', seconds: 5, signalled: true }), 'opponent-throw-in');
  assert.equal(law.restartDelayDecision({ kind: 'gk', seconds: 5, signalled: true }), 'opponent-corner');
  assert.equal(law.restartDelayDecision({ kind: 'corner', seconds: 8, signalled: true }), 'continue');
  assert.equal(law.restartDelayDecision({ kind: 'throw', seconds: NaN, signalled: true }), 'continue');
});


test('Law 13 moves an attacking indirect free kick out of the opponents goal area', () => {
  const decide = state => ({ ...law.freeKickGoalAreaPosition(state) });
  assert.deepEqual(decide({ x: 980, y: 30, goalLine: 1000, direction: 1, centerY: 50, depth: 55, halfWidth: 91.5, indirect: true }),
    { x: 945, y: 30, adjusted: true });
  assert.deepEqual(decide({ x: 20, y: 30, goalLine: 0, direction: 1, centerY: 50, depth: 55, halfWidth: 91.5, indirect: true }),
    { x: 20, y: 30, adjusted: false });
  assert.deepEqual(decide({ x: 980, y: 30, goalLine: 1000, direction: 1, centerY: 50, depth: 55, halfWidth: 91.5, indirect: false }),
    { x: 980, y: 30, adjusted: false });
});


test('Law 3 appoints an eligible on-field player when a goalkeeper is sent off', () => {
  const players = [
    { team: 0, gk: true, out: true, id: 'sent-off' },
    { team: 0, gk: false, out: false, id: 'first' },
    { team: 0, gk: false, out: true, id: 'dismissed' },
    { team: 1, gk: false, out: false, id: 'opponent' }
  ];
  assert.equal(law.replacementGoalkeeper(players, 0), players[1]);
  assert.equal(law.replacementGoalkeeper(players, 1), players[3]);
  assert.equal(law.replacementGoalkeeper([], 0), null);
});


test('Law 11 penalises an offside attacker actively challenging an opponent for a loose ball', () => {
  const base = { offside: true, approaching: true, attackerX: 4, attackerY: 4, opponentX: 10, opponentY: 4, ballX: 7, ballY: 4, radius: 15 };
  assert.equal(law.offsideChallengeInterference(base), true);
  assert.equal(law.offsideChallengeInterference({ ...base, approaching: false }), false);
  assert.equal(law.offsideChallengeInterference({ ...base, offside: false }), false);
  assert.equal(law.offsideChallengeInterference({ ...base, opponentX: 40 }), false);
  assert.equal(law.offsideChallengeInterference({ ...base, radius: NaN }), false);
});


test('Law 10 does not abandon a match for fewer than seven players during a penalty shoot-out', () => {
  const players = Array.from({ length: 6 }, (_, i) => ({ team: 0, out: false, id: i }));
  assert.equal(law.matchAbandonmentDecision(players, 0, 7, false), 'abandon');
  assert.equal(law.matchAbandonmentDecision(players, 0, 7, true), 'continue');
  players.push({ team: 0, out: false, id: 6 });
  assert.equal(law.matchAbandonmentDecision(players, 0, 7, false), 'continue');
});


test('Law 10 does not award a goal directly from a goalkeeper throw', () => {
  assert.equal(law.goalkeeperThrowGoalDecision({ releasedByGoalkeeper: true, lastTouchIsThrower: true, keeperTeam: 0, scoringTeam: 1 }), 'goal-kick');
  assert.equal(law.goalkeeperThrowGoalDecision({ releasedByGoalkeeper: true, lastTouchIsThrower: true, keeperTeam: 0, scoringTeam: 0 }), 'corner');
  assert.equal(law.goalkeeperThrowGoalDecision({ releasedByGoalkeeper: true, lastTouchIsThrower: false, keeperTeam: 0, scoringTeam: 1 }), 'goal');
  assert.equal(law.goalkeeperThrowGoalDecision({ releasedByGoalkeeper: false, lastTouchIsThrower: true, keeperTeam: 0, scoringTeam: 1 }), 'goal');
});


test('Laws 8, 13, 16 and 17 award a corner instead of an own goal from a direct restart', () => {
  assert.equal(law.directRestartGoalDecision({ restartKickerTeam: 0, scoringTeam: 1 }), 'corner');
  assert.equal(law.directRestartGoalDecision({ restartKickerTeam: 1, scoringTeam: 0 }), 'corner');
  assert.equal(law.directRestartGoalDecision({ restartKickerTeam: 0, scoringTeam: 0 }), 'goal');
  assert.equal(law.directRestartGoalDecision({ restartKickerTeam: null, scoringTeam: 0 }), 'goal');
});
