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
    "--ignore-gpu-blocklist",
    "--disable-dev-shm-usage"
  ]
});

const failures = [];
async function openLab(context, label) {
  const page = await context.newPage();
  page.on("pageerror", error => failures.push(label + " pageerror: " + error.message));
  await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => {
    const status = document.querySelector("#status")?.textContent || "";
    return /3D KEEPER|FALLBACK MODEL|MODEL ERROR/.test(status);
  }, { timeout: 90000 });
  const status = await page.locator("#status").innerText();
  assert.match(status, /3D KEEPER/i, label + " did not load the Mixamo goalkeeper model: " + status);
  await page.waitForFunction(() => {
    const text = document.querySelector("#readout")?.innerText || "";
    return text.includes("Rig colliders: 9");
  }, { timeout: 30000 });
  return page;
}

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1365, height: 900 }, deviceScaleFactor: 1 });
  const desktop = await openLab(desktopContext, "desktop");
  await desktop.screenshot({ path: artifacts + "/goalkeeper-lab-desktop-ready.png", fullPage: true });

  await desktop.locator("#ai-sequence").click();
  await desktop.waitForFunction(() => (document.querySelector("#readout")?.innerText || "").includes("5-SHOT TEST COMPLETE"), { timeout: 150000 });
  const desktopReadout = await desktop.locator("#readout").innerText();
  assert.match(desktopReadout, /Rig colliders: 9/);
  await desktop.screenshot({ path: artifacts + "/goalkeeper-lab-desktop-sequence.png", fullPage: true });

  const mobileContext = await browser.newContext({
    viewport: { width: 384, height: 850 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true
  });
  const mobile = await openLab(mobileContext, "mobile");
  await mobile.screenshot({ path: artifacts + "/goalkeeper-lab-mobile-ready.png", fullPage: true });
  const mobileReadout = await mobile.locator("#readout").innerText();
  assert.match(mobileReadout, /Rig colliders: 9/);

  assert.deepEqual(failures, [], "Browser runtime errors");
  console.log(JSON.stringify({
    result: "PASS",
    desktop: { status: await desktop.locator("#status").innerText(), sequence: desktopReadout },
    mobile: { status: await mobile.locator("#status").innerText(), diagnostics: mobileReadout },
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
