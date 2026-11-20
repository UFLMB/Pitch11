/**
 * PITCH 11 audio bridge.
 *
 * The previous SFXMint sound set has been removed. Keep this stable API so
 * gameplay callers remain safe while the newly selected, licensed recordings
 * are being prepared. The main-menu music is managed separately and is untouched.
 */
const SOURCES = Object.freeze({});

function play() {
  return false;
}

function event() {}

function tick() {}

function startAmbience() {}

function stopAmbience() {}

function setLevels() {}

window.P11AudioAssets = Object.freeze({
  sources: SOURCES,
  play,
  event,
  tick,
  startAmbience,
  stopAmbience,
  setLevels
});
