import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const artifacts = "artifacts";
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-dev-shm-usage"]
});
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  page.on("pageerror", error => console.error("PAGE ERROR:", error.message));
  page.on("console", message => { if (message.type() === "error") console.error("CONSOLE ERROR:", message.text()); });
  await page.goto("http://127.0.0.1:4173/goalkeeper-lab.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => /^3D KEEPER/.test((document.querySelector("#status")?.textContent || "").trim()), undefined, { timeout: 60000 });
  await page.waitForFunction(() => /Fingertip colliders: [1-9]/.test(document.querySelector("#readout")?.innerText || ""), undefined, { timeout: 20000 });
  await page.locator("#load-keeper-anims").click();
  await page.waitForFunction(() => (document.querySelector("#load-keeper-anims")?.textContent || "").includes("RELOAD GK ANIMS"), undefined, { timeout: 30000 });
  const targets = [];
  for (const x of [-1.8, -0.9, 0, 0.9, 1.8]) {
    for (const y of [1.3, 1.7, 2.1, 2.4]) targets.push({ x, y });
  }
  let readout = "";
  let contactTarget = null;
  let attempts = 0;
  for (const target of targets) {
    attempts++;
    console.log("Testing fingertip target", attempts, target);
    await page.evaluate(({ x, y }) => window.__GK_SET_FINGERTIP_TARGET(x, y), target);
    await page.locator('[data-action="fingertip-test"]').click();
    await page.waitForFunction(() => /Fingertip test: RUNNING/.test(document.querySelector("#readout")?.innerText || ""), undefined, { timeout: 5000 });
    await page.waitForFunction(() => /Fingertip test: (?:PASS|FAIL)/.test(document.querySelector("#readout")?.innerText || ""), undefined, { timeout: 10000 });
    readout = await page.locator("#readout").innerText();
    if (/Fingertip test: PASS/.test(readout)) { contactTarget = target; break; }
  }
  await page.screenshot({ path: artifacts + "/goalkeeper-fingertip-contact.png", fullPage: true });
  console.log(JSON.stringify({ result: contactTarget ? "PASS" : "FAIL", contactTarget, attempts, readout }, null, 2));
  assert.ok(contactTarget, "Fingertip animation did not contact any of the tested in-goal ball trajectories");

} finally {
  await browser.close();
}
