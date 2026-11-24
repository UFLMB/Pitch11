import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { MENU_MUSIC, SOURCES, resolveMenuMusicIntent, menuMusic, preloadAssets, unlock } from "./audio-assets.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const audioModule = read("./audio-assets.mjs");
const game = read("../index.html");

test("every registered menu audio source exists at its declared repository path", () => {
  const paths = [
    "../Audio/sounds/ui/navigation/click.wav",
    "../Audio/sounds/ui/navigation/hover.wav",
    "../Audio/sounds/ui/navigation/menu-open.wav",
    "../Audio/sounds/ui/navigation/transition.wav",
    "../Audio/sounds/ui/navigation/error.wav",
    "../Audio/sounds/ui/back/back.wav",
    "../Audio/sounds/ui/confirm/confirm.wav",
    "../Audio/sounds/ui/match-start/match-start.wav",
    "../Audio/music/menu/main-theme/hella%20bumps.mp3"
  ];
  for (const path of paths) {
    const decoded = path.replace("%20", " ");
    assert.ok(existsSync(new URL(decoded, import.meta.url)), "Missing audio asset: " + decoded);
    assert.ok(audioModule.includes(path), "Audio module does not register: " + path);
  }
  for (const [name, url] of Object.entries(SOURCES)) {
    assert.ok(existsSync(new URL(url)), "Registered sound file is missing: " + name);
  }
  assert.ok(existsSync(new URL(MENU_MUSIC)), "Registered menu music file is missing");
});

test("menu audio actions are wired to their intended UI and match lifecycle events", () => {
  assert.match(audioModule, /uiClick:\s*new URL\("\.\.\/Audio\/sounds\/ui\/navigation\/click\.wav"/);
  assert.match(audioModule, /uiHover:\s*new URL\("\.\.\/Audio\/sounds\/ui\/navigation\/hover\.wav"/);
  assert.match(audioModule, /uiTransition:\s*new URL\("\.\.\/Audio\/sounds\/ui\/navigation\/transition\.wav"/);
  assert.match(audioModule, /uiError:\s*new URL\("\.\.\/Audio\/sounds\/ui\/navigation\/error\.wav"/);
  assert.match(audioModule, /menuOpen:\s*new URL\("\.\.\/Audio\/sounds\/ui\/navigation\/menu-open\.wav"/);
  assert.match(audioModule, /uiBack:\s*new URL\("\.\.\/Audio\/sounds\/ui\/back\/back\.wav"/);
  assert.match(audioModule, /uiConfirm:\s*new URL\("\.\.\/Audio\/sounds\/ui\/confirm\/confirm\.wav"/);
  assert.match(audioModule, /matchStart:\s*new URL\("\.\.\/Audio\/sounds\/ui\/match-start\/match-start\.wav"/);
  assert.match(game, /AU\.musOn=function\(on,fadeSeconds=0\)\{window\.P11AudioAssets\?\.menuMusic\(!!on,!!G\.mus,window\.P11LoadingMusicRamp\?1:\.32,fadeSeconds\);\};/);
  assert.match(game, /window\.P11LoadingMusicRamp=true/);
  assert.match(game, /this\.musOn\(true,15\)/);
  assert.ok(game.includes("resolveMenuMusicIntent?.(S.mode,walkoutFade,!!(CUT.t>0),S.ret,M.pp==='subs',M.pp==='hub'&&S.ret==='play')"));
  assert.match(game, /const go=s=>\{p11UiSemanticSound=true;window\.P11AudioAssets\?\.play\('menuOpen'/);
  assert.match(game, /back=\(\)=>\{p11UiSemanticSound=true;window\.P11AudioAssets\?\.play\('uiBack'/);
  assert.match(game, /function startGame\(\)\{p11UiSemanticSound=true;window\.P11AudioAssets\?\.play\('uiConfirm'/);
  assert.match(game, /window\.P11AudioAssets\?\.play\('matchStart'/);
  assert.match(game, /play\('uiHover',\.28\)/);
  assert.match(game, /UI\.r\[UI\.r\.length-1\]\.kind='segment'/);
  assert.match(game, /const _uiT=uiTap;uiTap=function\(x,y\)\{[\s\S]*?p11UiSemanticSound=false;[\s\S]*?const handled=_uiT\(x,y\);[\s\S]*?if\(handled&&target&&!p11UiSemanticSound\)[\s\S]*?target\.kind==='segment'[\s\S]*?uiTransition[\s\S]*?AU\.click\(\)[\s\S]*?p11UiSemanticSound=false;/);
  assert.match(game, /if\(S\.t<0\.4&&S\.mode!=='subs'\)return false/);
  assert.match(game, /r\.fn\(\);return true/);
  assert.match(game, /UI\.def\(\);return true/);
});

test("audio bridge keeps unsupported gameplay events unmapped instead of playing the wrong UI sound", () => {
  assert.match(audioModule, /function play\(name, gain = 1\)/);
  assert.match(audioModule, /if \(!src \|\| typeof Audio === "undefined"\) return false;/);
  assert.doesNotMatch(audioModule, /kick:\s*new URL|whistle:\s*new URL|grassStep:\s*new URL/);
});


test("menu music is limited to menu, substitutions, half-time and full-time", () => {
  const on = { active: true, fadeSeconds: 0 };
  const off = { active: false, fadeSeconds: 0 };
  assert.deepEqual(resolveMenuMusicIntent("menu"), on);
  assert.deepEqual(resolveMenuMusicIntent("half"), on);
  assert.deepEqual(resolveMenuMusicIntent("full"), on);
  assert.deepEqual(resolveMenuMusicIntent("subs", false, false, "play", false, false), off, "automatic stoppage hub stays silent");
  assert.deepEqual(resolveMenuMusicIntent("subs", false, false, "play", false, true), on, "player-opened pause hub may play music");
  assert.deepEqual(resolveMenuMusicIntent("subs", false, false, "play", true, false), on, "actual substitution panel may play music");
  assert.deepEqual(resolveMenuMusicIntent("subs", false, false, "half", true), on);
  assert.deepEqual(resolveMenuMusicIntent("subs", false, false, "whistle", true), off);
  assert.deepEqual(resolveMenuMusicIntent("subs", false, false, "goal", true), off);
  for (const mode of ["whistle", "goal", "replay", "play", "kickoff"]) {
    assert.deepEqual(resolveMenuMusicIntent(mode), off, mode);
  }
  assert.deepEqual(resolveMenuMusicIntent("play", false, true), off);
  assert.deepEqual(resolveMenuMusicIntent("kickoff", true), { active: false, fadeSeconds: 3.25 });
});


test("loading music fade waits until browser audio unlock actually starts playback", async () => {
  const originalAudio = globalThis.Audio;
  const originalRaf = globalThis.requestAnimationFrame;
  const scheduled = [];
  let instance;
  class FakeAudio {
    constructor() {
      this.paused = true;
      this.volume = 0.32;
      this.listeners = {};
      instance = this;
    }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  globalThis.Audio = FakeAudio;
  globalThis.requestAnimationFrame = callback => {
    scheduled.push(callback);
    return scheduled.length;
  };
  try {
    menuMusic(true, true, 1, 15);
    assert.ok(instance, "menu audio element is created");
    assert.equal(instance.volume, 0, "music stays silent while browser autoplay is locked");
    assert.equal(scheduled.length, 0, "fade timer does not run before playback");
    unlock();
    await Promise.resolve();
    assert.equal(scheduled.length, 1, "15-second fade begins after playback is accepted");
    scheduled[0](15000);
    assert.ok(Math.abs(instance.volume - 1) < 0.001, "music reaches target volume after the full fade");
  } finally {
    globalThis.Audio = originalAudio;
    globalThis.requestAnimationFrame = originalRaf;
  }
});


test("startup audio preload verifies every registered sound and the menu music", async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  const progress = [];
  globalThis.fetch = async url => {
    requested.push(String(url));
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(16) };
  };
  try {
    const result = await preloadAssets(value => progress.push(value.completed));
    assert.equal(result.state, "ready");
    assert.equal(result.completed, 9);
    assert.equal(result.total, 9);
    assert.equal(requested.length, 9);
    assert.ok(requested.includes(MENU_MUSIC));
    for (const url of Object.values(SOURCES)) assert.ok(requested.includes(url));
    assert.ok(progress.includes(9));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
