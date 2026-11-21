import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const audioModule = read("./audio-assets.mjs");
const game = read("../index.html");

test("every registered menu audio source exists at its declared repository path", () => {
  const paths = [
    "../Audio/sounds/ui/navigation/click.wav",
    "../Audio/sounds/ui/navigation/menu-open.wav",
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
});

test("menu audio actions are wired to their intended UI and match lifecycle events", () => {
  assert.match(audioModule, /uiClick:\s*new URL\("\.\.\/Audio\/sounds\/ui\/navigation\/click\.wav"/);
  assert.match(audioModule, /menuOpen:\s*new URL\("\.\.\/Audio\/sounds\/ui\/navigation\/menu-open\.wav"/);
  assert.match(audioModule, /uiBack:\s*new URL\("\.\.\/Audio\/sounds\/ui\/back\/back\.wav"/);
  assert.match(audioModule, /uiConfirm:\s*new URL\("\.\.\/Audio\/sounds\/ui\/confirm\/confirm\.wav"/);
  assert.match(audioModule, /matchStart:\s*new URL\("\.\.\/Audio\/sounds\/ui\/match-start\/match-start\.wav"/);
  assert.match(game, /AU\.musOn=function\(on\)\{window\.P11AudioAssets\?\.menuMusic\(!!on,!!G\.mus,\.32\);\};/);
  assert.match(game, /const go=s=>\{window\.P11AudioAssets\?\.play\('menuOpen'/);
  assert.match(game, /back=\(\)=>\{window\.P11AudioAssets\?\.play\('uiBack'/);
  assert.match(game, /function startGame\(\)\{window\.P11AudioAssets\?\.play\('uiConfirm'/);
  assert.match(game, /window\.P11AudioAssets\?\.play\('matchStart'/);
  assert.match(game, /const _uiT=uiTap;uiTap=function\(x,y\)\{AU\.click\(\);_uiT\(x,y\);\};/);
});

test("audio bridge keeps unsupported gameplay events unmapped instead of playing the wrong UI sound", () => {
  assert.match(audioModule, /function play\(name, gain = 1\)/);
  assert.match(audioModule, /if \(!src \|\| typeof Audio === "undefined"\) return false;/);
  assert.doesNotMatch(audioModule, /kick:\s*new URL|whistle:\s*new URL|grassStep:\s*new URL/);
});
