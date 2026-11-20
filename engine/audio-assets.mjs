/**
 * PITCH 11 CC0 audio source bridge.
 * The source provider explicitly permits direct hotlink playback under CC0 1.0.
 * Local binary downloads are not bundled here: the build environment could not
 * resolve external hosts. If a source is unreachable, the existing Web Audio
 * synthesizers remain the fallback.
 */
const ROOT = "https://sfxmint.com/dl/";
const SOURCES = Object.freeze({
  kick: ROOT + "soccer-ball-kick-05.mp3",
  header: ROOT + "soccer-ball-kick-06.mp3",
  pass: ROOT + "soccer-ball-kick-08.mp3",
  net: ROOT + "soccer-ball-kick-09.mp3",
  post: ROOT + "soccer-ball-kick-10.mp3",
  bounce: ROOT + "soccer-ball-kick-04.mp3",
  dribble: ROOT + "soccer-ball-kick-02.mp3",
  grassStep: ROOT + "footsteps-grass-05.mp3",
  whistle: ROOT + "instrument-whistle-11.mp3",
  uiClick: ROOT + "ready-click-06.mp3",
  crowdGoal: ROOT + "stadium-crowd-02.mp3",
  crowdLoop: ROOT + "stadium-crowd-03.mp3",
  crowdApplause: ROOT + "stadium-crowd-05.mp3",
  crowdBoo: ROOT + "stadium-crowd-01.mp3",
  crowdWhistle: ROOT + "stadium-crowd-04.mp3"
});

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
    audio = new Audio(src);
    audio.preload = "none";
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
    ambience = new Audio(SOURCES.crowdLoop);
    ambience.loop = true;
    ambience.preload = "none";
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
