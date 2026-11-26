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
let musicFadeFrame = 0;
let musicTargetVolume = 0;
let pendingMusicRamp = null;
let audioPreloadPromise = null;
let audioPreloadState = "idle";
let audioPreloadProgress = { completed: 0, total: Object.keys(SOURCES).length + 1, failed: [] };
const pools = new Map();
const warned = new Set();

async function preloadAssets(onProgress = null) {
  if (audioPreloadPromise) return audioPreloadPromise;
  if (typeof fetch !== "function") {
    audioPreloadState = "error";
    return { state: audioPreloadState, ...audioPreloadProgress };
  }
  const assets = [...Object.entries(SOURCES), ["menuMusic", MENU_MUSIC]];
  audioPreloadState = "loading";
  audioPreloadProgress = { completed: 0, total: assets.length, failed: [] };
  const report = () => {
    if (typeof onProgress === "function") onProgress({ ...audioPreloadProgress, failed: [...audioPreloadProgress.failed] });
  };
  audioPreloadPromise = Promise.allSettled(assets.map(async ([name, url]) => {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) throw new Error(name + " audio preload failed: HTTP " + response.status);
    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength) throw new Error(name + " audio asset is empty");
    audioPreloadProgress.completed++;
    report();
    return { name, bytes: bytes.byteLength };
  })).then(results => {
    audioPreloadProgress.failed = results.flatMap((result, index) =>
      result.status === "rejected" ? [assets[index][0] + ": " + (result.reason?.message || String(result.reason))] : []
    );
    audioPreloadState = audioPreloadProgress.failed.length ? "error" : "ready";
    report();
    const result = { state: audioPreloadState, ...audioPreloadProgress, failed: [...audioPreloadProgress.failed] };
    // Allow a caller to retry transient network failures without reloading.
    if (audioPreloadState === "error") audioPreloadPromise = null;
    return result;
  }).catch(error => {
    audioPreloadState = "error";
    audioPreloadProgress.failed = [error?.message || String(error)];
    report();
    return { state: audioPreloadState, ...audioPreloadProgress, failed: [...audioPreloadProgress.failed] };
  });
  return audioPreloadPromise;
}

function retryPreloadAssets(onProgress = null) {
  audioPreloadPromise = null;
  audioPreloadState = "idle";
  audioPreloadProgress = { completed: 0, total: Object.keys(SOURCES).length + 1, failed: [] };
  return preloadAssets(onProgress);
}

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

function applyPendingMusicRamp() {
  if (!pendingMusicRamp || !menuRequested || !menuEnabled) return false;
  const pending = pendingMusicRamp;
  pendingMusicRamp = null;
  rampMusicVolume(pending.target, pending.duration, false);
  return true;
}

function startMenuMusic() {
  const audio = getMusicAudio();
  if (!audio || !unlocked || !menuRequested || !menuEnabled) return false;
  if (!audio.paused || musicPlayPending) return true;
  musicPlayPending = true;
  try {
    const result = audio.play();
    if (result && typeof result.then === "function") {
      result.then(() => {
        musicPlayPending = false;
        applyPendingMusicRamp();
      }).catch(error => {
        musicPlayPending = false;
        warnOnce("Menu music playback was blocked; it will retry after the next user gesture.", error);
      });
    } else {
      musicPlayPending = false;
      applyPendingMusicRamp();
    }
    return true;
  } catch (error) {
    musicPlayPending = false;
    warnOnce("Menu music playback failed.", error);
    return false;
  }
}

function cancelMusicFade() {
  if (musicFadeFrame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(musicFadeFrame);
  musicFadeFrame = 0;
}

function rampMusicVolume(target, seconds, pauseAtEnd = false) {
  const audio = getMusicAudio();
  if (!audio) return false;
  cancelMusicFade();
  const destination = Math.max(0, Math.min(1, Number(target) || 0));
  const duration = Math.max(0, Number(seconds) || 0);
  const start = Number.isFinite(audio.volume) ? audio.volume : 0;
  if (duration <= 0 || Math.abs(destination - start) < 0.001 || typeof requestAnimationFrame !== "function") {
    audio.volume = destination;
    if (pauseAtEnd) audio.pause();
    return true;
  }
  const startedAt = performance.now();
  const step = now => {
    const progress = Math.max(0, Math.min(1, (now - startedAt) / (duration * 1000)));
    const eased = progress * (2 - progress);
    audio.volume = start + (destination - start) * eased;
    if (progress < 1) musicFadeFrame = requestAnimationFrame(step);
    else {
      musicFadeFrame = 0;
      audio.volume = destination;
      if (pauseAtEnd) audio.pause();
    }
  };
  musicFadeFrame = requestAnimationFrame(step);
  return true;
}

function menuMusic(active, enabled = true, volume = DEFAULT_MUSIC_VOLUME, fadeSeconds = 0) {
  const nextRequested = !!active;
  const nextEnabled = !!enabled;
  const nextVolume = Math.max(0, Math.min(1, Number(volume) || 0));
  const target = nextRequested && nextEnabled ? nextVolume : 0;
  const unchanged = nextRequested === menuRequested && nextEnabled === menuEnabled &&
    Math.abs(target - musicTargetVolume) < 0.001;
  menuRequested = nextRequested;
  menuEnabled = nextEnabled;
  musicVolume = nextVolume;
  const audio = getMusicAudio();
  if (!audio) return false;
  if (unchanged) return true;
  musicTargetVolume = target;
  const duration = Math.max(0, Number(fadeSeconds) || 0);
  if (target > 0) {
    if (audio.paused) {
      cancelMusicFade();
      pendingMusicRamp = duration > 0 ? { target, duration } : null;
      audio.volume = duration > 0 ? 0 : target;
      startMenuMusic();
      if (duration <= 0 && unlocked) audio.volume = target;
    } else {
      pendingMusicRamp = null;
      rampMusicVolume(target, duration, false);
    }
  } else {
    pendingMusicRamp = null;
    musicPlayPending = false;
    if (audio.paused) {
      cancelMusicFade();
      audio.volume = 0;
      return true;
    }
    rampMusicVolume(0, duration, true);
  }
  return true;
}

function resolveMenuMusicIntent(mode, walkoutActive = false, cutsceneActive = false, subsReturnMode = "play", substitutionScreenActive = false, manualPauseActive = false) {
  // Cutscenes and the walkout are not musical stoppages; fade out during the walkout.
  if (walkoutActive) return { active: false, fadeSeconds: 3.25 };
  if (cutsceneActive) return { active: false, fadeSeconds: 0 };
  // The menu, half-time, and full-time are approved; a pause hub is not a substitution.
  if (mode === "menu" || mode === "half" || mode === "full") {
    return { active: true, fadeSeconds: 0 };
  }
  // Music is also allowed when the player explicitly opens PAUSED during live play.
  // Automatic whistle/injury/goal stoppages do not set manualPauseActive.
  if (mode === "subs" && manualPauseActive && subsReturnMode === "play") {
    return { active: true, fadeSeconds: 0 };
  }
  // Require the actual SUBS panel for a substitution stoppage, and exclude injuries/free kicks.
  if (mode === "subs" && substitutionScreenActive && ["play", "half", "full"].includes(subsReturnMode)) {
    return { active: true, fadeSeconds: 0 };
  }
  return { active: false, fadeSeconds: 0 };
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
    menuMusic(state.menu, state.music !== false, state.musicVolume ?? musicVolume, state.fadeSeconds ?? 0);
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
      musicPlayPending = false;
      if (musicAudio && !musicAudio.paused) musicAudio.pause();
    } else if (menuRequested && menuEnabled && unlocked) {
      startMenuMusic();
    }
  });
  window.P11AudioAssets = Object.freeze({
    sources: SOURCES,
    preloadAssets,
    retryPreloadAssets,
    get preloadState() { return audioPreloadState; },
    get preloadProgress() { return { ...audioPreloadProgress, failed: [...audioPreloadProgress.failed] }; },
    menuMusic,
    resolveMenuMusicIntent,
    play,
    event,
    tick,
    startAmbience,
    stopAmbience,
    setLevels
  });
}

export { SOURCES, MENU_MUSIC, menuMusic, preloadAssets, retryPreloadAssets, resolveMenuMusicIntent, play, setLevels, tick, unlock };
