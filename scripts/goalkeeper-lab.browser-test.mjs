import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL = process.env.GK_LAB_URL || "http://127.0.0.1:4173/goalkeeper-lab.html";
const artifacts = process.env.GK_ARTIFACT_DIR || "artifacts";
await mkdir(artifacts, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-webgl",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--disable-dev-shm-usage"
  ]
});

const failures = [];
const testFailures = [];
async function openLab(context, label) {
  const page = await context.newPage();
  page.on("pageerror", error => failures.push(label + " pageerror: " + error.message));
  page.on("console", message => { if (message.type() === "error") failures.push(label + " console: " + message.text()); });
  page.on("requestfailed", request => failures.push(label + " request failed: " + request.url() + " · " + (request.failure()?.errorText || "unknown")));
  await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30000 });
  try {
    await page.waitForFunction(() => {
      const status = document.querySelector("#status")?.textContent || "";
      return /^(?:3D KEEPER|FALLBACK MODEL|MODEL ERROR)/.test(status.trim());
    }, undefined, { timeout: 90000 });
  } catch (error) {
    const status = await page.locator("#status").innerText().catch(() => "status unavailable");
    const diagnostics = await page.locator("#readout").innerText().catch(() => "readout unavailable");
    console.log(JSON.stringify({ label, status, diagnostics, pageErrors: failures }, null, 2));
    await page.screenshot({ path: artifacts + "/goalkeeper-lab-" + label + "-load-failure.png", fullPage: true }).catch(() => {});
    throw error;
  }
  const status = await page.locator("#status").innerText();
  assert.match(status, /^3D KEEPER/i, label + " did not load the Mixamo goalkeeper model: " + status);
  try {
    await page.waitForFunction(() => {
      const text = document.querySelector("#readout")?.innerText || "";
      return /Rig colliders: [1-9]/.test(text);
    }, undefined, { timeout: 15000 });
  } catch (error) {
    const diagnostics = await page.locator("#readout").innerText().catch(() => "readout unavailable");
    console.log(JSON.stringify({ label, status, diagnostics, pageErrors: failures }, null, 2));
    await page.screenshot({ path: artifacts + "/goalkeeper-lab-" + label + "-diagnostic.png", fullPage: true }).catch(() => {});
    throw error;
  }
  const diagnostics = await page.locator("#readout").innerText();
  console.log(label + " initial diagnostics: " + diagnostics.replace(/\n/g, " | "));
  return page;
}

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1365, height: 900 }, deviceScaleFactor: 1 });
  const desktop = await openLab(desktopContext, "desktop");
  await desktop.screenshot({ path: artifacts + "/goalkeeper-lab-desktop-ready.png", fullPage: true });

  await desktop.locator("#ai-sequence").click();
  await desktop.waitForFunction(() => (document.querySelector("#readout")?.innerText || "").includes("5-SHOT TEST COMPLETE"), undefined, { timeout: 150000 });
  const desktopSequenceReadout = await desktop.locator("#readout").innerText();
  assert.match(desktopSequenceReadout, /Rig colliders: 15/);
  await desktop.screenshot({ path: artifacts + "/goalkeeper-lab-desktop-sequence.png", fullPage: true });

  async function verifyDirectionalShot(page, label, shot, expectedSide, expectedHeight, expectedState, expectedFile) {
    await page.locator('[data-action="reset"]').click();
    await page.waitForFunction(() => /^Phase: IDLE/m.test(document.querySelector("#readout")?.innerText || ""), undefined, { timeout: 15000 });
    await page.locator('[data-shot="' + shot + '"]').click();
    try {
      await page.waitForFunction(() => {
        const text = document.querySelector("#readout")?.innerText || "";
        return /AI v2: (?:LEFT|RIGHT|CENTER) \/ (?:LOW|MID|HIGH) \/ /.test(text) &&
          (/Contact: (?!—)/.test(text) || /GOAL · NO ANIMATED RIG CONTACT/.test(text));
      }, undefined, { timeout: 60000 });
    } catch (error) {
      const diagnostics = await page.locator("#readout").innerText().catch(() => "readout unavailable");
      console.log(JSON.stringify({ label, shot, diagnostics, pageErrors: failures }, null, 2));
      await page.screenshot({ path: artifacts + "/goalkeeper-lab-" + label + "-" + shot + "-failure.png", fullPage: true }).catch(() => {});
      throw error;
    }
    const diagnostics = await page.locator("#readout").innerText();
    await page.screenshot({ path: artifacts + "/goalkeeper-lab-" + label + "-" + shot + "-attempt.png", fullPage: true });
    console.log(label + " " + shot + " diagnostics: " + diagnostics.replace(/\\n/g, " | "));
    assert.match(diagnostics, new RegExp("AI v2: " + expectedSide.toUpperCase() + " / " + expectedHeight.toUpperCase() + " /"), label + " AI decision side/height mismatch for " + shot);
    assert.match(diagnostics, /Rig colliders: 15/, label + " rig collider count mismatch for " + shot);
    assert.match(diagnostics, /REACHABLE/, label + " controlled calibration shot must be physically reachable for " + shot);
    assert.ok(diagnostics.includes("Active FBX: " + expectedFile.replace(/\.fbx$/i, "")), label + " did not play the expected FBX file for " + shot + "; diagnostics: " + diagnostics);
    assert.doesNotMatch(diagnostics, /Contact: —/, label + " reachable calibration shot had no rig contact for " + shot);
    await page.screenshot({ path: artifacts + "/goalkeeper-lab-" + label + "-" + shot + ".png", fullPage: true });
    console.log(label + " " + shot + ": " + diagnostics.replace(/\n/g, " | "));
    return diagnostics;
  }

  const cornerCases = [
    ["left-low", "left", "low", "keeperDiveLowLeft", "goalkeeper body block (2).fbx"],
    ["right-low", "right", "low", "keeperDiveLowRight", "goalkeeper body block (3).fbx"],
    ["left-high", "left", "high", "keeperDiveLeft", "goalkeeper diving save (2).fbx"],
    ["right-high", "right", "high", "keeperDiveRight", "goalkeeper diving save.fbx"]
  ];
  const desktopCornerResults = [];
  for (const test of cornerCases) {
    try { desktopCornerResults.push(await verifyDirectionalShot(desktop, "desktop", ...test)); }
    catch (error) { testFailures.push("desktop " + test[0] + ": " + error.message); console.log("CONTINUING AFTER DESKTOP CASE FAILURE: " + test[0]); }
  }
  const desktopReadout = desktopCornerResults.join("\n");

  const mobileContext = await browser.newContext({
    viewport: { width: 384, height: 850 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true
  });
  const mobile = await openLab(mobileContext, "mobile");
  await mobile.screenshot({ path: artifacts + "/goalkeeper-lab-mobile-ready.png", fullPage: true });
  const mobileReadout = await mobile.locator("#readout").innerText();
  assert.match(mobileReadout, /Rig colliders: 15/);
  await mobile.locator("#ai-mode").click();
  const mobileCornerResults = [];
  for (const test of cornerCases) {
    try { mobileCornerResults.push(await verifyDirectionalShot(mobile, "mobile", ...test)); }
    catch (error) { testFailures.push("mobile " + test[0] + ": " + error.message); console.log("CONTINUING AFTER MOBILE CASE FAILURE: " + test[0]); }
  }
  const mobileContactReadout = mobileCornerResults.join("\\n");

  assert.deepEqual(failures, [], "Browser runtime errors");
  assert.deepEqual(testFailures, [], "Goalkeeper directional contact regressions");
  console.log(JSON.stringify({
    result: "PASS",
    desktop: { status: await desktop.locator("#status").innerText(), sequence: desktopSequenceReadout, contact: desktopReadout },
    mobile: { status: await mobile.locator("#status").innerText(), diagnostics: mobileContactReadout },
    screenshots: [
      artifacts + "/goalkeeper-lab-desktop-ready.png",
      artifacts + "/goalkeeper-lab-desktop-sequence.png",
      artifacts + "/goalkeeper-lab-mobile-ready.png"
    ]
  }, null, 2));
  await desktopContext.close();
  await mobileContext.close();
} finally {
  await browser.close();
}
