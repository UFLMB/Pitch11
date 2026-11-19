import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.env.GK_LAB_URL || "http://127.0.0.1:4173/goalkeeper-lab.html";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"]
});
const results = [];
const runtimeErrors = [];

async function runViewport(label, viewport, isMobile, cases) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile, hasTouch: isMobile });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => runtimeErrors.push(label + " pageerror: " + error.message));
  page.on("console", message => { if (message.type() === "error") runtimeErrors.push(label + " console: " + message.text()); });
  page.on("requestfailed", request => runtimeErrors.push(label + " request failed: " + request.url()));
  await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForFunction(() => /^3D KEEPER/i.test(document.querySelector("#status")?.textContent?.trim() || ""), undefined, { timeout: 45000 });
  await page.waitForFunction(() => /Rig colliders: 15/.test(document.querySelector("#readout")?.innerText || ""), undefined, { timeout: 15000 });
  await page.locator("#ai-mode").click();

  for (const test of cases) {
    const [shot, side, seconds] = test;
    await page.locator('[data-action="reset"]').click();
    await page.waitForFunction(() => /^Phase: IDLE/m.test(document.querySelector("#readout")?.innerText || ""), undefined, { timeout: 12000 });
    await page.evaluate(value => { window.__GK_TEST_FLIGHT_TIME = value; }, seconds);
    await page.locator('[data-shot="' + shot + '"]').click();
    await page.waitForFunction(() => {
      const text = document.querySelector("#readout")?.innerText || "";
      return /AI v2: (?:LEFT|RIGHT|CENTER) \/ (?:LOW|MID|HIGH) \/ /.test(text) &&
        (/Contact: (?!—)/.test(text) || /GOAL · NO ANIMATED RIG CONTACT|KEEPER CANNOT REACH/.test(text));
    }, undefined, { timeout: 18000 });
    const readout = await page.locator("#readout").innerText();
    const contact = /Contact: (?!—)/.test(readout);
    const closest = readout.match(/Min gap: ([^<\n]+)/)?.[1] || "unavailable";
    const active = readout.match(/Active FBX: ([^·\n]+)/)?.[1]?.trim() || "unavailable";
    results.push({ viewport: label, shot, side, flightTime: seconds, contact, closest, active, readout });
    console.log(JSON.stringify(results[results.length - 1]));
  }
  await context.close();
}

try {
  await runViewport("desktop", { width: 1365, height: 900 }, false, [
    ["left-high", "left", 1.5], ["right-high", "right", 1.5],
    ["left-high", "left", 2.0], ["right-high", "right", 2.0]
  ]);
  await runViewport("mobile", { width: 384, height: 850 }, true, [
    ["left-high", "left", 1.5], ["right-high", "right", 1.5]
  ]);
  assert.deepEqual(runtimeErrors, [], "Browser runtime errors");
  assert.equal(results.length, 6, "All six timing probes must complete");
  console.log(JSON.stringify({ result: "DIAGNOSTIC_COMPLETE", contactCount: results.filter(x => x.contact).length, probes: results }, null, 2));
} finally {
  await browser.close();
}
