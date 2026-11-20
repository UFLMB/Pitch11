/**
 * PITCH 11 CC0 audio source bridge.
 * The source provider explicitly permits direct hotlink playback under CC0 1.0.
 * MP3 files are downloaded by the GitHub Pages build into Audio/ subfolders.
 * If a local build-time download is unavailable, the approved direct stream is
 * used as fallback; synthesized Web Audio remains the final fallback.
 */
const REMOTE_ROOT = "https://sfxmint.com/dl/";
const SOURCES = Object.freeze({
  kick: "./Audio/sounds/gameplay/ball/shot/hard-kick-05.mp3",
  header: "./Audio/sounds/gameplay/ball/header/header-06.mp3",
  pass: "./Audio/sounds/gameplay/ball/pass/long-pass-08.mp3",
  net: "./Audio/sounds/gameplay/goal/net/net-hit-09.mp3",
  post: "./Audio/sounds/gameplay/goal/post/post-hit-10.mp3",
  bounce: "./Audio/sounds/gameplay/ball/bounce/grass-bounce-04.mp3",
  dribble: "./Audio/sounds/gameplay/ball/touch/dribble-02.mp3",
  grassStep: "./Audio/sounds/gameplay/player/shoe/grass-step/single-step-05.mp3",
  whistle: "./Audio/sounds/gameplay/referee/whistle/single-sharp-11.mp3",
  uiClick: "./Audio/sounds/ui/navigation/ui-click-06.mp3",
  crowdGoal: "./Audio/sounds/stadium/goal-reaction/goal-cheer-02.mp3",
  crowdLoop: "./Audio/sounds/stadium/ambience/murmuring-loop-03.mp3",
  crowdApplause: "./Audio/sounds/stadium/applause/applause-05.mp3",
  crowdBoo: "./Audio/sounds/stadium/booing/booing-01.mp3",
  crowdWhistle: "./Audio/sounds/stadium/goal-reaction/crowd-whistle-04.mp3"
});
const REMOTE_SOURCES = Object.freeze({
  kick: "soccer-ball-kick-05.mp3",
  header: "soccer-ball-kick-06.mp3",
  pass: "soccer-ball-kick-08.mp3",
  net: "soccer-ball-kick-09.mp3",
  post: "soccer-ball-kick-10.mp3",
  bounce: "soccer-ball-kick-04.mp3",
  dribble: "soccer-ball-kick-02.mp3",
  grassStep: "footsteps-grass-05.mp3",
  whistle: "instrument-whistle-11.mp3",
  uiClick: "ready-click-06.mp3",
  crowdGoal: "stadium-crowd-02.mp3",
  crowdLoop: "stadium-crowd-03.mp3",
  crowdApplause: "stadium-crowd-05.mp3",
  crowdBoo: "stadium-crowd-01.mp3",
  crowdWhistle: "stadium-crowd-04.mp3"
});

function createAudio(key) {
  const audio = new Audio(SOURCES[key]);
  audio.preload = "none";
  audio.addEventListener("error", () => {
    if (audio.dataset.remoteFallback) return;
    audio.dataset.remoteFallback = "1";
    audio.src = REMOTE_ROOT + REMOTE_SOURCES[key];
    audio.load();
    const result = audio.play();
    if (result && typeof result.catch === "function") result.catch(() => {});
  });
  return audio;
}

const pools = new Map();
let ambience = null;
let userVolume = 1;
let crowdVolume = 1;

function audioFor(key) {
  const src = SOURCES[key];
  if (!src) return null;
  let pool = pools.get(key);
  if (!pool) {
    pool = [];
    pools.set(key, pool);
  }
  let audio = pool.find(item => item.paused || item.ended);
  if (!audio && pool.length < 4) {
    audio = createAudio(key);
    pool.push(audio);
  }
  if (!audio) return null;
  audio.pause();
  audio.currentTime = 0;
  return audio;
}

function play(key, gain = 1) {
  if (!userVolume || gain <= 0) return false;
  const audio = audioFor(key);
  if (!audio) return false;
  audio.volume = Math.max(0, Math.min(1, userVolume * gain));
  const result = audio.play();
  if (result && typeof result.catch === "function") result.catch(() => {});
  return true;
}

function startAmbience() {
  if (!ambience) {
    ambience = createAudio("crowdLoop");
    ambience.loop = true;
  }
  if (ambience.paused) {
    ambience.volume = Math.max(0, Math.min(.32, userVolume * crowdVolume * .2));
    const result = ambience.play();
    if (result && typeof result.catch === "function") result.catch(() => {});
  }
}

function stopAmbience() {
  if (ambience && !ambience.paused) ambience.pause();
}

function setLevels(volume, crowd) {
  userVolume = Math.max(0, Math.min(1, Number(volume) || 0));
  crowdVolume = Math.max(0, Math.min(1, Number(crowd) || 0));
  if (ambience && !ambience.paused) {
    ambience.volume = Math.max(0, Math.min(.32, userVolume * crowdVolume * .2));
  }
}

const EVENT_SOUNDS = Object.freeze({
  goal: ["crowdGoal", .9],
  keeperSave: ["crowdWhistle", .48],
  tackleWon: ["crowdApplause", .24],
  tackleMissed: ["crowdBoo", .18],
  foul: ["crowdBoo", .2],
  yellowCard: ["crowdBoo", .25],
  redCard: ["crowdBoo", .38],
  offside: ["crowdWhistle", .24],
  bigChance: ["crowdWhistle", .2]
});

function event(type) {
  const item = EVENT_SOUNDS[type];
  if (item && crowdVolume > 0) play(item[0], item[1]);
}

function tick({ active, volume, crowd }) {
  setLevels(volume, crowd);
  if (active && crowdVolume > 0 && userVolume > 0) startAmbience();
  else stopAmbience();
}

window.P11AudioAssets = Object.freeze({
  sources: SOURCES,
  play,
  event,
  tick,
  startAmbience,
  stopAmbience,
  setLevels
});
