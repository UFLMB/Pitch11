/**
 * PITCH 11 audio asset bridge.
 *
 * All URLs resolve relative to this module, so the same paths work on GitHub
 * Pages under the repository subpath and when served from a local web server.
 * Only assets that actually exist in Audio/ are registered here.
 */
const SOURCES = Object.freeze({
  uiClick: new URL("../Audio/sounds/ui/navigation/click.wav", import.meta.url).href,
  menuOpen: new URL("../Audio/sounds/ui/navigation/menu-open.wav", import.meta.url).href,
  uiBack: new URL("../Audio/sounds/ui/back/back.wav", import.meta.url).href,
  uiConfirm: new URL("../Audio/sounds/ui/confirm/confirm.wav", import.meta.url).href,
  matchStart: new URL("../Audio/sounds/ui/match-start/match-start.wav", import.meta.url).href
});

const MENU_MUSIC = new URL("../Audio/music/menu/main-theme/hella%20bumps.mp3", import.meta.url).href;
const DEFAULT_SFX_VOLUME = 0.66;
const DEFAULT_MUSIC_VOLUME = 0.32;
let sfxVolume = DEFAULT_SFX_VOLUME;
let musicVolume = DEFAULT_MUSIC_VOLUME;
let unlocked = false;
let menuRequested = false;
let menuEnabled = true;
let musicAudio = null;
const pools = new Map();
const warned = new Set();

function warnOnce(key, error) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn("[PITCH 11 audio] " + key, error || "");
}

function getMusicAudio() {
  if (musicAudio) return musicAudio;
  if (typeof Audio === "undefined") return null;
  musicAudio = new Audio(MENU_MUSIC);
  musicAudio.preload = "auto";
  musicAudio.loop = true;
  musicAudio.volume = musicVolume;
  musicAudio.addEventListener("error", () => warnOnce("Menu music failed to load: " + MENU_MUSIC));
  return musicAudio;
}

function unlock() {
  unlocked = true;
  if (menuRequested && menuEnabled) startMenuMusic();
}

function startMenuMusic() {
  const audio = getMusicAudio();
  if (!audio || !unlocked) return false;
  audio.volume = musicVolume;
  if (!audio.paused) return true;
  const result = audio.play();
  if (result && typeof result.catch === "function") {
    result.catch(error => warnOnce("Menu music playback was blocked; it will retry after the next user gesture.", error));
  }
  return true;
}

function menuMusic(active, enabled = true, volume = DEFAULT_MUSIC_VOLUME) {
  menuRequested = !!active;
  menuEnabled = !!enabled;
  musicVolume = Math.max(0, Math.min(1, Number(volume) || 0));
  const audio = getMusicAudio();
  if (!audio) return false;
  audio.volume = musicVolume;
  if (menuRequested && menuEnabled) return startMenuMusic();
  if (!audio.paused) audio.pause();
  return true;
}

function play(name, gain = 1) {
  const src = SOURCES[name];
  if (!src || typeof Audio === "undefined") return false;
  const level = Math.max(0, Math.min(1, Number(gain) || 0)) * sfxVolume;
  if (level <= 0) return false;

  let pool = pools.get(name);
  if (!pool) {
    pool = [];
    pools.set(name, pool);
  }
  let audio = pool.find(item => item.paused || item.ended);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = "auto";
    audio.addEventListener("error", () => warnOnce("Sound failed to load: " + src));
    pool.push(audio);
  }
  audio.volume = level;
  try {
    audio.currentTime = 0;
  } catch (_) {
    // Some mobile browsers do not expose a seek position until metadata loads.
  }
  const result = audio.play();
  if (result && typeof result.catch === "function") {
    result.catch(error => warnOnce("Playback failed for " + name + ".", error));
  }
  return true;
}

function setLevels(levels = {}) {
  if (Number.isFinite(levels.sfx)) sfxVolume = Math.max(0, Math.min(1, levels.sfx));
  if (Number.isFinite(levels.music)) musicVolume = Math.max(0, Math.min(1, levels.music));
  if (musicAudio) musicAudio.volume = musicVolume;
}

function tick(state = {}) {
  if (Number.isFinite(state.volume)) sfxVolume = Math.max(0, Math.min(1, state.volume));
  if (typeof state.menu === "boolean") menuMusic(state.menu, state.music !== false, state.musicVolume ?? musicVolume);
}

function event() {}
function startAmbience() {}
function stopAmbience() {}

if (typeof window !== "undefined") {
  const gesture = () => unlock();
  window.addEventListener("pointerdown", gesture, { capture: true, passive: true });
  window.addEventListener("keydown", gesture, { capture: true, passive: true });
  window.P11AudioAssets = Object.freeze({
    sources: SOURCES,
    menuMusic,
    play,
    event,
    tick,
    startAmbience,
    stopAmbience,
    setLevels
  });
}

export { SOURCES, MENU_MUSIC, menuMusic, play, setLevels, tick };
