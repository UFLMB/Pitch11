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
  await page.waitForFunction(() => /Rig contact: [1-9]/.test(document.querySelector("#readout")?.innerText || ""), undefined, { timeout: 20000 });
  await page.locator('[data-action="fingertip-test"]').click();
  await page.waitForFunction(() => /Fingertip test: (?:PASS|FAIL)/.test(document.querySelector("#readout")?.innerText || ""), undefined, { timeout: 20000 });
  const readout = await page.locator("#readout").innerText();
  await page.screenshot({ path: artifacts + "/goalkeeper-fingertip-contact.png", fullPage: true });
  console.log(JSON.stringify({ result: /Fingertip test: PASS/.test(readout) ? "PASS" : "FAIL", readout }, null, 2));
  assert.match(readout, /Fingertip test: PASS/, "Fingertip animation did not make physical contact with the goal-line ball");
} finally {
  await browser.close();
}
