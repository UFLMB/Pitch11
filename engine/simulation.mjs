/**
 * PITCH 11 browser simulation core — isolated prototype.
 * Coordinates: metres; X = pitch length (0..105), Y = pitch width (0..68).
 * Team 0 attacks +X; team 1 attacks -X.
 * No DOM, renderer, audio, or animation dependencies.
 */
import { applyLeagueSoccerBallPhysics } from "./league-soccer-ballphysics.mjs";

export const SIM_VERSION = "0.3.0";
export const PITCH = Object.freeze({ length: 105, width: 68, goalWidth: 7.32, goalHeight: 2.44, ballRadius: 0.11 });
export const FIXED_DT = 1 / 60;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hypot = (x, y) => Math.hypot(x, y);
const dist = (a, b) => hypot(a.x - b.x, a.y - b.y);
const norm = (x, y) => { const n = hypot(x, y) || 1; return { x: x / n, y: y / n }; };
const FORMATIONS = {
  "4-3-3": [
    [0.055, .50], [0.19, .10], [0.17, .36], [0.17, .64], [0.19, .90],
    [0.39, .24], [0.36, .50], [0.39, .76], [0.64, .15], [0.67, .50], [0.64, .85]
  ],
  "4-4-2": [
    [0.055, .50], [0.19, .10], [0.17, .36], [0.17, .64], [0.19, .90],
    [0.40, .10], [0.38, .36], [0.38, .64], [0.40, .90], [0.68, .36], [0.68, .64]
  ],
  "4-2-3-1": [
    [0.055, .50], [0.19, .10], [0.17, .36], [0.17, .64], [0.19, .90],
    [0.35, .36], [0.35, .64], [0.55, .15], [0.60, .50], [0.55, .85], [0.72, .50]
  ]
};
const formationRole = (name, slot) => slot === 0 ? "GK" :
  slot < 5 ? "DEF" :
  name === "4-4-2" ? (slot < 9 ? "MID" : "FWD") :
  name === "4-2-3-1" ? (slot < 10 ? "MID" : "FWD") :
  (slot < 8 ? "MID" : "FWD");
const DEFAULT_STATS = { pace: .68, pass: .68, shoot: .62, dribble: .66, defend: .62, strength: .65, stamina: .82 };

function makePlayer(team, slot, formation = "4-3-3") {
  const [depth, lane] = FORMATIONS[formation][slot];
  const attack = team === 0 ? 1 : -1;
  const x = team === 0 ? 2 + depth * 101 : 103 - depth * 101;
  const y = 3 + lane * 62;
  const role = formationRole(formation, slot);
  return {
    id: team * 11 + slot, team, slot, role, x, y, vx: 0, vy: 0,
    homeX: x, homeY: y, attack, facing: attack > 0 ? 0 : Math.PI,
    stamina: 1, stats: { ...DEFAULT_STATS }, cooldown: 0, action: "idle",
    selected: false, hasBall: false, out: false, fouls: 0, yellowCards: 0, redCard: false, tackleUntil: 0, tackleCooldown: 0, targetX: x, targetY: y, intent: "shape"
  };
}
function makeBall() {
  return { x: 52.5, y: 34, z: PITCH.ballRadius, vx: 0, vy: 0, vz: 0, owner: -1, lastTouchTeam: -1, spin: 0, ignorePlayerId: -1, ignoreUntil: 0, offsidePlayerId: -1, offsideExempt: false };
}
function copyPlayer(p) {
  return { id:p.id,team:p.team,slot:p.slot,role:p.role,x:p.x,y:p.y,vx:p.vx,vy:p.vy,
    facing:p.facing,stamina:p.stamina,hasBall:p.hasBall,selected:p.selected,action:p.action,intent:p.intent,out:p.out,fouls:p.fouls,yellowCards:p.yellowCards,redCard:p.redCard };
}

export class FootballSimulation {
  constructor(options = {}) {
    this.formations = [options.homeFormation ?? "4-3-3", options.awayFormation ?? "4-3-3"];
    for (const name of this.formations) if (!FORMATIONS[name]) throw new RangeError("Unsupported formation: " + name);
    this.seed = options.seed ?? 11;
    this.weather = { windX: options.windX ?? 0, windY: options.windY ?? 0, wetness: clamp(Number(options.wetness) || 0, 0, 1) };
    this.rngState = (this.seed >>> 0) || 1;
    this.accumulator = 0;
    this.time = 0;
    this.tick = 0;
    this.period = 1;
    this.halfLengthSeconds = options.halfLengthSeconds ?? 2700;
    this.matchTimeScale = options.matchTimeScale ?? 1;
    this.score = [0, 0];
    this.phase = "kickoff";
    this.restart = null;
    this.players = Array.from({ length: 22 }, (_, i) => makePlayer(i < 11 ? 0 : 1, i % 11, this.formations[i < 11 ? 0 : 1]));
    this.ball = makeBall();
    this.humanTeam = options.humanTeam ?? 0;
    this.selectedPlayer = this.humanTeam * 11 + 9;
    this.players[this.selectedPlayer].selected = true;
    this.commands = [];
    this.events = [];
    this.matchSeconds = 0;
    this.lastSnapshot = null;
    this.resetKickoff();
  }
  random() {
    let x = this.rngState;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.rngState = x >>> 0;
    return this.rngState / 4294967296;
  }
  resetKickoff() {
    for (const p of this.players) {
      if (p.out) continue;
      const [depth, lane] = FORMATIONS[this.formations[p.team]][p.slot];
      p.role = formationRole(this.formations[p.team], p.slot);
      p.x = p.team === 0 ? 2 + depth * 101 : 103 - depth * 101;
      p.y = 3 + lane * 62;
      p.homeX = p.x; p.homeY = p.y; p.vx = 0; p.vy = 0;
      p.hasBall = false; p.action = "idle"; p.intent = "shape";
    }
    this.ball = makeBall();
    this.restart = null;
    const kickoff = this.players[this.humanTeam * 11 + 9];
    kickoff.x = 51.2; kickoff.y = 34; kickoff.hasBall = true;
    this.ball.owner = kickoff.id; this.ball.lastTouchTeam = this.humanTeam;
    this.phase = "playing";
  }
  setFormation(team, name) {
    if (team !== 0 && team !== 1) return false;
    if (!FORMATIONS[name]) return false;
    this.formations[team] = name;
    for (const p of this.players) if (p.team === team && !p.out) {
      const [depth, lane] = FORMATIONS[name][p.slot];
      p.role = formationRole(name, p.slot);
      p.homeX = team === 0 ? 2 + depth * 101 : 103 - depth * 101;
      p.homeY = 3 + lane * 62;
      p.targetX = p.homeX; p.targetY = p.homeY;
    }
    return true;
  }
  setWeather(windX = 0, windY = 0, wetness = 0) {
    this.weather = { windX: Number(windX) || 0, windY: Number(windY) || 0, wetness: clamp(Number(wetness) || 0, 0, 1) };
  }
  setPlayerStats(playerId, stats) {
    const p = this.players[playerId];
    if (!p) return false;
    for (const key of Object.keys(DEFAULT_STATS)) if (Number.isFinite(stats[key])) p.stats[key] = clamp(stats[key], 0, 1);
    return true;
  }
  selectPlayer(playerId) {
    const p = this.players[playerId];
    if (!p || p.out || p.team !== this.humanTeam) return false;
    this.players[this.selectedPlayer].selected = false;
    this.selectedPlayer = playerId;
    p.selected = true;
    return true;
  }
  command(command) {
    if (!command || typeof command.type !== "string") return false;
    this.commands.push({ ...command });
    return true;
  }
  update(realDelta) {
    const frame = clamp(Number(realDelta) || 0, 0, .1);
    this.accumulator += frame;
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < 6) {
      this.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === 6 && this.accumulator > FIXED_DT * 6) this.accumulator = 0;
    return this.getSnapshot();
  }
  step(dt) {
    this.tick++;
    this.time += dt;
    this.events.length = 0;
    for (const p of this.players) { p.cooldown = Math.max(0, p.cooldown - dt); p.tackleCooldown = Math.max(0, p.tackleCooldown - dt); }
    this.applyCommands();
    if (this.phase !== "playing") return;
    this.matchSeconds += dt * this.matchTimeScale;
    this.updateAI(dt);
    this.movePlayers(dt);
    this.resolvePlayerSeparation();
    this.resolveTackles();
    this.resolveGoalkeeperSaves();
    this.updateBall(dt);
    this.resolvePlayerBallContacts();
    this.resolveBoundaries();
    this.updateMatchPhase();
  }
  applyCommands() {
    const cmds = this.commands.splice(0);
    for (const c of cmds) {
      if (c.type === "continue" && this.phase === "halfTime" && this.period === 1) {
        this.period = 2;
        this.resetKickoff();
        this.events.push({ type: "secondHalfStarted" });
        continue;
      }
      if (c.type === "restart") { this.takeRestart(); continue; }
      const p = this.players[this.selectedPlayer];
      if (!p) continue;
      if (c.type === "move") {
        let ix = clamp(Number(c.x) || 0, -1, 1), iy = clamp(Number(c.y) || 0, -1, 1);
        const inputMagnitude = hypot(ix, iy);
        if (inputMagnitude > 1) { ix /= inputMagnitude; iy /= inputMagnitude; }
        p.inputMagnitude = Math.min(1, inputMagnitude);
        p.inputX = Math.abs(ix) < .001 ? 0 : ix;
        p.inputY = Math.abs(iy) < .001 ? 0 : iy;
        p.sprinting = !!c.sprint;
      } else if (c.type === "releaseMove") {
        p.inputX = 0; p.inputY = 0; p.sprinting = false;
      } else if (c.type === "switch") {
        const candidates = this.players.filter(q => q.team === this.humanTeam && !q.out && q.role !== "GK");
        candidates.sort((a,b) => dist(a,this.ball)-dist(b,this.ball));
        const next = candidates.find(q => q.id !== this.selectedPlayer) || candidates[0];
        if (next) this.selectPlayer(next.id);
      } else if (c.type === "pass" && p.team === this.humanTeam && this.ball.owner === p.id) {
        this.passBall(p, c.targetId);
      } else if (c.type === "shoot" && p.team === this.humanTeam && this.ball.owner === p.id) {
        this.shootBall(p, c.power);
      } else if (c.type === "tackle") {
        p.tackleUntil = this.time + .24;
        p.action = "tackle";
      }
    }
  }
  updateAI(dt) {
    const owner = this.players[this.ball.owner];
    for (const p of this.players) {
      if (p.out) continue;
      if (p.id === this.selectedPlayer && p.team === this.humanTeam) {
        p.intent = "manual";
        continue;
      }
      if (owner && owner.id === p.id) {
        this.decideOnBall(p);
        continue;
      }
      const attacking = owner && owner.team === p.team;
      if (owner && owner.team !== p.team && p.role !== "GK" && dist(p, owner) < 1.15 && p.tackleCooldown <= 0) {
        p.tackleUntil = this.time + .12;
        p.tackleCooldown = 1.1;
        p.action = "press-tackle";
      }
      const nearestOpponent = this.players.filter(q => q.team !== p.team && !q.out).sort((a,b) => dist(a,p)-dist(b,p))[0];
      const ballDistance = dist(p, this.ball);
      if (!attacking && (!owner || owner.team !== p.team) && ballDistance < 24 && p.role !== "GK") {
        const nearest = this.players.filter(q => q.team === p.team && q.role !== "GK").sort((a,b) => dist(a,this.ball)-dist(b,this.ball))[0];
        if (nearest && nearest.id === p.id) {
          p.targetX = this.ball.x; p.targetY = this.ball.y; p.intent = "press";
        } else this.setShapeTarget(p, owner);
      } else if (attacking) {
        const forward = p.attack;
        const laneOffset = (p.homeY - 34) * .35;
        p.targetX = clamp(p.homeX + forward * (p.role === "FWD" ? 9 : 4), 3, 102);
        p.targetY = clamp(p.homeY + laneOffset * .18, 3, 65);
        if (nearestOpponent && dist(nearestOpponent,p) < 7) p.targetY = clamp(p.targetY + (p.y < 34 ? -5 : 5), 2, 66);
        p.intent = "support";
      } else this.setShapeTarget(p, owner);
      p.targetX = clamp(p.targetX, 1.5, 103.5);
      p.targetY = clamp(p.targetY, 1.5, 66.5);
    }
    // Goalkeepers stay goal-side and only attack the ball when it enters their box.
    for (const team of [0,1]) {
      const gk = this.players[team*11];
      const ownGoal = team === 0 ? 0 : 105;
      const threat = this.ball.x < 20 || this.ball.x > 85;
      gk.targetX = ownGoal === 0 ? clamp(this.ball.x, 2, 8) : clamp(this.ball.x, 97, 103);
      gk.targetY = clamp(this.ball.y, 24, 44);
      if (!threat || (team === 0 ? this.ball.x > 20 : this.ball.x < 85)) {
        gk.targetX = ownGoal === 0 ? 5 : 100;
        gk.targetY = 34 + (this.ball.y - 34) * .18;
      }
      gk.intent = "goalkeeper";
    }
  }
  setShapeTarget(p, owner) {
    const shiftX = owner ? clamp((owner.x - 52.5) * .18, -8, 8) : 0;
    const shiftY = owner ? clamp((owner.y - 34) * .12, -5, 5) : 0;
    p.targetX = p.homeX + shiftX;
    p.targetY = p.homeY + shiftY;
    p.intent = "shape";
  }
  decideOnBall(p) {
    const goalX = p.team === 0 ? 105 : 0;
    const goalDist = Math.abs(goalX - p.x);
    const goalLane = Math.abs(p.y - 34);
    const pressure = this.players.filter(q => q.team !== p.team && !q.out).reduce((best,q) => Math.min(best,dist(q,p)),99);
    if (goalDist < 22 && goalLane < 18 && pressure > 2.5) {
      this.shootBall(p, .72 + p.stats.shoot * .25);
      return;
    }
    const forward = p.attack;
    const options = this.players.filter(q => q.team === p.team && q.id !== p.id && q.role !== "GK" && !this.isOffside(q, p.team))
      .map(q => ({ p:q, score: forward*(q.x-p.x) - Math.abs(q.y-p.y)*.28 - this.players.filter(o=>o.team!==p.team).filter(o=>this.distanceToSegment(o,p,q)<3.2).length*9 }))
      .filter(o => o.score > 4).sort((a,b)=>b.score-a.score);
    if (pressure < 3.5 && options.length && this.random() < .045) {
      this.passBall(p, options[0].p.id);
      return;
    }
    p.targetX = clamp(p.x + forward * 8, 2, 103);
    p.targetY = clamp(p.y + clamp(34-p.y,-5,5)*.12, 2, 66);
    p.intent = "dribble";
  }
  distanceToSegment(p,a,b) {
    const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy||1;
    const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l2,0,1);
    return hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
  }
  movePlayers(dt) {
    for (const p of this.players) {
      if (p.out) { p.vx = 0; p.vy = 0; continue; }
      const manual = p.id === this.selectedPlayer && p.team === this.humanTeam;
      let tx=p.targetX, ty=p.targetY, sprint=false;
      if (manual) {
        const ix=p.inputX||0, iy=p.inputY||0;
        if (Math.abs(ix)+Math.abs(iy)>.01) { tx=p.x+ix*10; ty=p.y+iy*10; sprint=!!p.sprinting; }
        else { tx=p.x; ty=p.y; }
      }
      const d=norm(tx-p.x,ty-p.y), gap=dist(p,{x:tx,y:ty});
      const speed=(5.0+p.stats.pace*2.5)*(manual?(p.inputMagnitude||0):1)*(sprint?1.32:1)*(0.55+p.stamina*.45);
      const desired=gap<.15?0:Math.min(speed,gap/dt);
      const accel=clamp(desired-hypot(p.vx,p.vy),-12*dt,12*dt);
      const current=norm(p.vx,p.vy);
      const nv=Math.max(0,hypot(p.vx,p.vy)+accel);
      p.vx=current.x*nv + d.x*Math.min(2.2*dt, .12);
      p.vy=current.y*nv + d.y*Math.min(2.2*dt, .12);
      const max=speed;
      const v=hypot(p.vx,p.vy);
      if(v>max){p.vx=p.vx/v*max;p.vy=p.vy/v*max;}
      p.x=clamp(p.x+p.vx*dt, .5, 104.5);
      p.y=clamp(p.y+p.vy*dt, .5, 67.5);
      if (hypot(p.vx,p.vy)>.15) p.facing=Math.atan2(p.vy,p.vx);
      p.stamina=clamp(p.stamina-(sprint?.0008:.00022)*dt*60, .25, 1);
      p.action = manual && (p.inputX||p.inputY) ? (sprint?"sprint":"run") : p.intent;
    }
  }
  passBall(p,targetId) {
    let target=this.players[targetId];
    if (!target || target.team!==p.team || target.id===p.id) {
      const candidates=this.players.filter(q=>q.team===p.team&&!q.out&&q.id!==p.id&&q.role!=="GK")
        .sort((a,b)=> (p.attack*(b.x-p.x)-Math.abs(b.y-p.y)*.2) - (p.attack*(a.x-p.x)-Math.abs(a.y-p.y)*.2));
      target=candidates[0];
    }
    if(!target)return false;
    this.ball.offsidePlayerId = !this.ball.offsideExempt && this.isOffside(target, p.team) ? target.id : -1;
    this.ball.offsideExempt = false;
    const d=norm(target.x-p.x,target.y-p.y);
    const lead=Math.min(3,dist(p,target)*.07);
    this.releaseBall(p,d.x*(15+p.stats.pass*7)+target.vx*.35,d.y*(15+p.stats.pass*7)+target.vy*.35,2.1+lead*.15);
    this.events.push({type:"pass",from:p.id,to:target.id});
    return true;
  }
  shootBall(p,power=1) {
    const goalX=p.team===0?105:0, aimY=clamp(34+(this.random()-.5)*(9-p.stats.shoot*6),30,38);
    const d=norm(goalX-p.x,aimY-p.y),strength=clamp(Number(power)||1,.35,1.35);
    this.releaseBall(p,d.x*(21+strength*12),d.y*(21+strength*12),2.5+strength*3);
    this.events.push({type:"shot",player:p.id});
    return true;
  }
  releaseBall(p,vx,vy,vz) {
    p.hasBall=false; p.action="kick";
    this.ball.owner=-1; this.ball.lastTouchTeam=p.team;
    this.ball.x=p.x+p.attack*.55; this.ball.y=p.y;
    this.ball.vx=vx; this.ball.vy=vy; this.ball.vz=vz;
    this.ball.ignorePlayerId=p.id; this.ball.ignoreUntil=this.time+.22;
  }
  resolvePlayerSeparation() {
    const minDistance = .62;
    for (let i = 0; i < this.players.length; i++) {
      const a = this.players[i];
      if (a.out) continue;
      for (let j = i + 1; j < this.players.length; j++) {
        const b = this.players[j];
        if (b.out) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = hypot(dx, dy);
        if (d >= minDistance) continue;
        const nx = d > 1e-8 ? dx / d : (a.id < b.id ? 1 : -1);
        const ny = d > 1e-8 ? dy / d : 0;
        const push = (minDistance - d) * .5;
        a.x = clamp(a.x - nx * push, .5, 104.5);
        a.y = clamp(a.y - ny * push, .5, 67.5);
        b.x = clamp(b.x + nx * push, .5, 104.5);
        b.y = clamp(b.y + ny * push, .5, 67.5);
      }
    }
  }
  resolveTackles() {
    const owner = this.players[this.ball.owner];
    if (!owner) return;
    for (const tackler of this.players) {
      if (tackler.out || tackler.team === owner.team || (tackler.tackleUntil || 0) < this.time) continue;
      const separation = dist(tackler, owner);
      if (separation > 1.45) continue;
      const chance = separation < .65 ? 1 : clamp(.28 + tackler.stats.defend * .42 + tackler.stats.strength * .22, .28, .92);
      tackler.tackleUntil = 0;
      if (this.random() <= chance) {
        owner.hasBall = false;
        tackler.hasBall = true;
        tackler.action = "tackle-win";
        this.ball.owner = tackler.id;
        this.ball.lastTouchTeam = tackler.team;
        this.ball.vx = 0; this.ball.vy = 0; this.ball.vz = 0;
        this.events.push({ type: "tackleWon", player: tackler.id, dispossessed: owner.id });
        break;
      } else {
        tackler.action = "tackle-missed";
        this.events.push({ type: "tackleMissed", player: tackler.id });
        if (separation < 1.05 && this.random() < .18) {
          this.callFoul(tackler, owner, { card: this.random() < .08 });
          break;
        }
      }
    }
  }
  callFoul(tackler, victim, options = {}) {
    if (!tackler || !victim || tackler.team === victim.team || tackler.out) return false;
    tackler.fouls++;
    let cardEvent = null;
    if (options.card) {
      tackler.yellowCards++;
      cardEvent = { type: "yellowCard", player: tackler.id, count: tackler.yellowCards };
      if (tackler.yellowCards >= 2) {
        tackler.redCard = true;
        tackler.out = true;
        tackler.hasBall = false;
        cardEvent = { type: "redCard", player: tackler.id, reason: "secondYellow" };
      }
    }
    const inPenaltyArea = victim.team === 0
      ? victim.x > 88.5 && victim.y > 13.8 && victim.y < 54.2
      : victim.x < 16.5 && victim.y > 13.8 && victim.y < 54.2;
    const restartType = inPenaltyArea ? "penalty" : "freeKick";
    const restartX = inPenaltyArea ? (victim.team === 0 ? 94 : 11) : this.ball.x;
    const restartY = inPenaltyArea ? 34 : this.ball.y;
    this.events.push({ type: "foul", player: tackler.id, victim: victim.id, team: victim.team });
    if (cardEvent) this.events.push(cardEvent);
    this.awardRestart(victim.team, restartType, restartX, restartY);
    return true;
  }
  resolveGoalkeeperSaves() {
    const b = this.ball;
    if (b.owner >= 0 || Math.hypot(b.vx, b.vy) < 2) return;
    for (const team of [0,1]) {
      const ownGoal = team === 0 ? 0 : 105;
      const movingTowardGoal = team === 0 ? b.vx < -1 : b.vx > 1;
      if (!movingTowardGoal || b.lastTouchTeam === team) continue;
      const t = (ownGoal - b.x) / b.vx;
      if (t < 0 || t > 1.25) continue;
      const predictedY = b.y + b.vy * t;
      const predictedZ = b.z + b.vz * t - 4.905 * t * t;
      if (predictedZ < .12 || predictedZ > PITCH.goalHeight + .45) continue;
      const keeper = this.players[team * 11];
      if (Math.abs(predictedY - keeper.y) > 2.0) continue;
      const reach = clamp(1.8 - predictedZ * .25, .85, 1.8);
      if (Math.abs(keeper.x - ownGoal) > 10 || Math.abs(predictedY - keeper.y) > reach) continue;
      const speed = Math.hypot(b.vx,b.vy,b.vz);
      if (speed < 10) {
        b.owner = keeper.id; keeper.hasBall = true; keeper.action = "keeper-catch";
        b.vx = 0; b.vy = 0; b.vz = 0;
      } else {
        b.x = ownGoal === 0 ? .28 : 104.72;
        b.vx = ownGoal === 0 ? Math.abs(b.vx) * .55 : -Math.abs(b.vx) * .55;
        b.vy += clamp((predictedY - keeper.y) * .45, -2.5, 2.5);
        b.vz = Math.max(.8, Math.abs(b.vz) * .35);
        keeper.action = "keeper-parry";
      }
      this.events.push({ type: "keeperSave", keeper: keeper.id, team, caught: b.owner === keeper.id });
      return;
    }
  }
  updateBall(dt) {
    const owner=this.players[this.ball.owner];
    if(owner) {
      const offset=owner.attack*.72;
      this.ball.x=owner.x+offset; this.ball.y=owner.y+Math.sin(this.time*8)*.07;
      this.ball.z=PITCH.ballRadius; this.ball.vx=owner.vx; this.ball.vy=owner.vy; this.ball.vz=0;
      return;
    }
    const b=this.ball;
    applyLeagueSoccerBallPhysics(b,dt,this.weather);
    // Upstream applies forces first, then advances the position by the updated momentum.
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.z+=b.vz*dt;
    if(Math.abs(b.vx)+Math.abs(b.vy)+Math.abs(b.vz)<.06&&b.z<=PITCH.ballRadius+.01){b.vx=0;b.vy=0;b.vz=0;}
  }
  resolvePlayerBallContacts() {
    if(this.ball.owner>=0)return;
    const b=this.ball;
    const nearby=this.players.filter(p=>!p.out&&(p.role!=="GK"||b.x<12||b.x>93))
      .filter(p=>p.id!==b.ignorePlayerId||this.time>=b.ignoreUntil)
      .map(p=>({p,d:dist(p,b)})).filter(v=>v.d<1.15&&b.z<1.5)
      .sort((a,c)=>a.d-c.d);
    if(!nearby.length)return;
    const p=nearby[0].p;
    if (this.ball.offsidePlayerId === p.id && this.ball.lastTouchTeam === p.team) {
      this.events.push({ type: "offside", player: p.id, team: p.team });
      this.awardRestart(1 - p.team, "freeKick", this.ball.x, this.ball.y);
      this.ball.offsidePlayerId = -1;
      return;
    }
    if (p.team !== this.ball.lastTouchTeam) this.ball.offsidePlayerId = -1;
    const opponent=this.players.filter(q=>q.team!==p.team&&!q.out).some(q=>dist(q,p)<1.35);
    if(opponent&&p.team!==b.lastTouchTeam&&this.random()>.38)return;
    b.owner=p.id;b.lastTouchTeam=p.team;p.hasBall=true;p.action=p.role==="GK"?"keeper-claim":"control";
    this.events.push({type:p.role==="GK"?"keeperSave":"possession",player:p.id,team:p.team});
  }
  resolveGoalFrameCollisions() {
    const b = this.ball;
    const radius = PITCH.ballRadius + .07;
    for (const gx of [0, 105]) {
      for (const gy of [34 - PITCH.goalWidth / 2, 34 + PITCH.goalWidth / 2]) {
        const dx = b.x - gx, dy = b.y - gy;
        const d = Math.hypot(dx, dy);
        if (b.z < PITCH.goalHeight + radius && d < radius) {
          const nx = d > 1e-8 ? dx / d : (gx === 0 ? 1 : -1);
          const ny = d > 1e-8 ? dy / d : 0;
          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) { b.vx -= 1.72 * dot * nx; b.vy -= 1.72 * dot * ny; }
          b.x = gx + nx * radius; b.y = gy + ny * radius;
          this.events.push({ type: "goalpostHit" });
        }
      }
      const dx = b.x - gx, dz = b.z - PITCH.goalHeight;
      const d = Math.hypot(dx, dz);
      if (Math.abs(b.y - 34) < PITCH.goalWidth / 2 + radius && d < radius) {
        const nx = d > 1e-8 ? dx / d : (gx === 0 ? 1 : -1);
        const nz = d > 1e-8 ? dz / d : -1;
        const dot = b.vx * nx + b.vz * nz;
        if (dot < 0) { b.vx -= 1.72 * dot * nx; b.vz -= 1.72 * dot * nz; }
        b.x = gx + nx * radius; b.z = PITCH.goalHeight + nz * radius;
        this.events.push({ type: "crossbarHit" });
      }
    }
  }
  updateMatchPhase() {
    if (this.period === 1 && this.matchSeconds >= this.halfLengthSeconds) {
      this.matchSeconds = this.halfLengthSeconds;
      this.phase = "halfTime";
      this.events.push({ type: "halfTime", score: [...this.score] });
    } else if (this.period === 2 && this.matchSeconds >= this.halfLengthSeconds * 2) {
      this.matchSeconds = this.halfLengthSeconds * 2;
      this.phase = "fullTime";
      this.events.push({ type: "fullTime", score: [...this.score] });
    }
  }
  isOffside(target, attackingTeam) {
    if (!target || target.team !== attackingTeam) return false;
    const opponents = this.players.filter(p => p.team !== attackingTeam).map(p => p.x);
    opponents.sort((a,b) => attackingTeam === 0 ? b-a : a-b);
    const secondLast = opponents[1] ?? (attackingTeam === 0 ? 105 : 0);
    if (attackingTeam === 0) return target.x > 52.5 && target.x > this.ball.x && target.x > secondLast;
    return target.x < 52.5 && target.x < this.ball.x && target.x < secondLast;
  }
  awardRestart(team, type, x, y) {
    for (const p of this.players) p.hasBall = false;
    this.ball.owner = -1;
    this.ball.offsidePlayerId = -1; this.ball.offsideExempt = false;
    this.ball.vx = 0; this.ball.vy = 0; this.ball.vz = 0;
    this.ball.x = clamp(x, 0, 105); this.ball.y = clamp(y, 0, 68);
    this.phase = "restart";
    this.restart = { team, type, x: this.ball.x, y: this.ball.y };
    this.events.push({ type: "restartAwarded", restartType: type, team, x: this.ball.x, y: this.ball.y });
  }
  takeRestart() {
    if (this.phase !== "restart" || !this.restart) return false;
    const r = this.restart;
    const candidates = this.players.filter(p => p.team === r.team && !p.out && p.role !== "GK");
    candidates.sort((a,b) => dist(a,r)-dist(b,r));
    const taker = candidates[0];
    if (!taker) return false;
    const restartX = clamp(r.x, .7, 104.3);
    const restartY = clamp(r.y, .7, 67.3);
    taker.x = restartX - taker.attack * .72;
    taker.y = restartY;
    taker.vx = 0; taker.vy = 0;
    taker.hasBall = true; taker.action = "restart";
    this.ball.owner = taker.id;
    this.ball.lastTouchTeam = r.team;
    this.ball.x = restartX; this.ball.y = restartY; this.ball.z = PITCH.ballRadius;
    this.ball.offsidePlayerId = -1;
    this.ball.offsideExempt = ["throwIn", "goalKick", "corner"].includes(r.type);
    this.restart = null;
    this.phase = "playing";
    this.events.push({ type: "restartTaken", player: taker.id, team: taker.team, restartType: r.type });
    return true;
  }
  resolveBoundaries() {
    const b=this.ball;
    this.resolveGoalFrameCollisions();
    if(b.x<0||b.x>105) {
      const attackingTeam = b.x > 105 ? 0 : 1;
      const inGoal = Math.abs(b.y-34) < PITCH.goalWidth/2 && b.z < PITCH.goalHeight;
      if(inGoal) {
        const scoring = attackingTeam;
        this.score[scoring]++;
        this.events.push({type:"goal",team:scoring,score:[...this.score]});
        this.resetKickoff();
      } else if (b.lastTouchTeam === attackingTeam) {
        this.awardRestart(1-attackingTeam, "goalKick", attackingTeam===0?99:6, 34);
      } else {
        this.awardRestart(attackingTeam, "corner", b.x < 0 ? 0 : 105, b.y < 34 ? 0 : 68);
      }
      return;
    }
    if(b.y<0||b.y>68) {
      const team = b.lastTouchTeam < 0 ? 1 : 1-b.lastTouchTeam;
      this.awardRestart(team, "throwIn", b.x, b.y < 0 ? 0 : 68);
    }
  }
  getSnapshot() {
    const snapshot={version:SIM_VERSION,tick:this.tick,time:this.time,matchSeconds:this.matchSeconds,period:this.period,formations:[...this.formations],
      phase:this.phase,restart:this.restart?{...this.restart}:null,score:[...this.score],humanTeam:this.humanTeam,selectedPlayer:this.selectedPlayer,
      ball:{...this.ball},players:this.players.map(copyPlayer),events:this.events.slice()};
    this.lastSnapshot=snapshot;
    return snapshot;
  }
}
export function createSimulation(options) { return new FootballSimulation(options); }
