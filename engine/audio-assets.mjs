/**
 * PITCH 11 audio asset bridge.
 *
 * Paths are resolved relative to this module, so they work from the repository
 * subpath on GitHub Pages and from a local web server. Only committed assets
 * are registered here; empty placeholder folders are never treated as audio.
 */
const SOURCES = Object.freeze({
  uiClick: new URL("../Audio/sounds/ui/navigation/click.wav", import.meta.url).href,
  uiHover: new URL("../Audio/sounds/ui/navigation/hover.wav", import.meta.url).href,
  menuOpen: new URL("../Audio/sounds/ui/navigation/menu-open.wav", import.meta.url).href,
  uiTransition: new URL("../Audio/sounds/ui/navigation/transition.wav", import.meta.url).href,
  uiError: new URL("../Audio/sounds/ui/navigation/error.wav", import.meta.url).href,
  uiBack: new URL("../Audio/sounds/ui/back/back.wav", import.meta.url).href,
  uiConfirm: new URL("../Audio/sounds/ui/confirm/confirm.wav", import.meta.url).href,
  matchStart: new URL("../Audio/sounds/ui/match-start/match-start.wav", import.meta.url).href
});

const MENU_MUSIC = new URL("../Audio/music/menu/main-theme/hella%20bumps.mp3", import.meta.url).href;
const DEFAULT_SFX_VOLUME = 0.66;
const DEFAULT_MUSIC_VOLUME = 0.32;
const MAX_VOICES_PER_SOUND = 3;
let sfxVolume = DEFAULT_SFX_VOLUME;
let musicVolume = DEFAULT_MUSIC_VOLUME;
let unlocked = false;
let menuRequested = false;
let menuEnabled = true;
let musicAudio = null;
let musicPlayPending = false;
const pools = new Map();
const warned = new Set();

function warnOnce(key, error) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn("[PITCH 11 audio] " + key, error || "");
}

function getMusicAudio() {
  if (musicAudio || typeof Audio === "undefined") return musicAudio;
  musicAudio = new Audio(MENU_MUSIC);
  musicAudio.preload = "auto";
  musicAudio.loop = true;
  musicAudio.volume = musicVolume;
  musicAudio.addEventListener("error", () => warnOnce("Menu music failed to load: " + MENU_MUSIC));
  return musicAudio;
}

function startMenuMusic() {
  const audio = getMusicAudio();
  if (!audio || !unlocked || !menuRequested || !menuEnabled) return false;
  if (!audio.paused || musicPlayPending) return true;
  musicPlayPending = true;
  try {
    const result = audio.play();
    if (result && typeof result.then === "function") {
      result.then(() => { musicPlayPending = false; }).catch(error => {
        musicPlayPending = false;
        warnOnce("Menu music playback was blocked; it will retry after the next user gesture.", error);
      });
    } else {
      musicPlayPending = false;
    }
    return true;
  } catch (error) {
    musicPlayPending = false;
    warnOnce("Menu music playback failed.", error);
    return false;
  }
}

function menuMusic(active, enabled = true, volume = DEFAULT_MUSIC_VOLUME) {
  menuRequested = !!active;
  menuEnabled = !!enabled;
  musicVolume = Math.max(0, Math.min(1, Number(volume) || 0));
  const audio = getMusicAudio();
  if (!audio) return false;
  audio.volume = musicVolume;
  if (menuRequested && menuEnabled) return startMenuMusic();
  musicPlayPending = false;
  if (!audio.paused) audio.pause();
  return true;
}

function unlock() {
  unlocked = true;
  if (menuRequested && menuEnabled) startMenuMusic();
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
    if (pool.length < MAX_VOICES_PER_SOUND) {
      audio = new Audio(src);
      audio.preload = "auto";
      audio.addEventListener("error", () => warnOnce("Sound failed to load: " + src));
      pool.push(audio);
    } else {
      audio = pool[0];
    }
  }
  audio.volume = level;
  try { audio.currentTime = 0; } catch (_) {}
  try {
    const result = audio.play();
    if (result && typeof result.catch === "function") {
      result.catch(error => warnOnce("Playback failed for " + name + ".", error));
    }
    return true;
  } catch (error) {
    warnOnce("Playback failed for " + name + ".", error);
    return false;
  }
}

function setLevels(levels = {}) {
  if (Number.isFinite(levels.sfx)) sfxVolume = Math.max(0, Math.min(1, levels.sfx));
  if (Number.isFinite(levels.music)) {
    musicVolume = Math.max(0, Math.min(1, levels.music));
    if (musicAudio) musicAudio.volume = musicVolume;
  }
}

function tick(state = {}) {
  if (Number.isFinite(state.volume)) sfxVolume = Math.max(0, Math.min(1, state.volume));
  if (typeof state.menu === "boolean") {
    menuMusic(state.menu, state.music !== false, state.musicVolume ?? musicVolume);
  }
}

function event() {}
function startAmbience() {}
function stopAmbience() {}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  window.addEventListener("keydown", unlock, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (musicAudio && !musicAudio.paused) musicAudio.pause();
    } else if (menuRequested && menuEnabled && unlocked) {
      startMenuMusic();
    }
  });
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
