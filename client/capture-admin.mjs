import { chromium } from "@playwright/test";
import path from "path";

const outDir = path.resolve("../docs/lab-03/screenshots");

async function run() {
  let browser;
  try {
    browser = await chromium.launch({ channel: "msedge", headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto("http://localhost:5173");
  await page.fill("input[type='email']", "admin@toktickit.com");
  await page.fill("input[type='password']", "Password123!");
  await page.click("button[type='submit']");
  await page.waitForTimeout(500);

  // Passer mustChangePassword à false dans la session locale pour capturer l'espace Admin
  await page.evaluate(() => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    u.mustChangePassword = false;
    localStorage.setItem("user", JSON.stringify(u));
  });
  await page.reload();
  await page.waitForSelector("text=Admin Users");
  await page.click("text=Admin Users");
  await page.waitForSelector("table");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "11-admin-users-desktop.png"), fullPage: true });

  await page.click("button:has-text('+ Create User')");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "12-admin-create-user.png"), fullPage: true });

  await browser.close();
  console.log("ADMIN SCREENSHOTS 11 & 12 CAPTURED!");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
