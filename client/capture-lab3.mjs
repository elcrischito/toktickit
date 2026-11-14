import { chromium } from "@playwright/test";
import path from "path";

const outDir = path.resolve("../docs/lab-03/screenshots");

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "msedge", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function run() {
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1. Login Screen (Desktop)
  await page.goto("http://localhost:5173");
  await page.waitForSelector("input[type='email']");
  await page.screenshot({ path: path.join(outDir, "01-login-desktop.png"), fullPage: true });

  // Login Error State
  await page.fill("input[type='email']", "wrong@toktickit.com");
  await page.fill("input[type='password']", "WrongPass1!");
  await page.click("button[type='submit']");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "02-login-error.png"), fullPage: true });

  // 2. Mandatory First-Login Password Change (simulated state)
  await page.evaluate(() => {
    localStorage.setItem("user", JSON.stringify({
      id: "demo-admin",
      fullName: "John Smith (Admin)",
      email: "admin@toktickit.com",
      role: "ADMIN",
      mustChangePassword: true
    }));
    localStorage.setItem("token", "demo-token");
  });
  await page.reload();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "03-change-password-mandatory.png"), fullPage: true });

  // 3. Real Login as IT Staff (Michael Brown)
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.fill("input[type='email']", "michael.brown@toktickit.com");
  await page.fill("input[type='password']", "Password123!");
  await page.click("button[type='submit']");
  await page.waitForSelector("table");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "04-staff-queue-desktop.png"), fullPage: true });

  // 4. IT Staff Ticket Detail (with Public Comments + Internal Notes)
  await page.click("tbody tr:first-child");
  await page.waitForSelector("text=Internal Notes");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "05-staff-ticket-detail-desktop.png"), fullPage: true });

  // Responsive: Tablet (768x1024) & Mobile (390x844) on Staff Queue
  await page.click("text=Back to Queue");
  await page.waitForSelector("table");
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, "06-staff-queue-tablet.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, "07-staff-queue-mobile.png"), fullPage: true });

  await page.setViewportSize({ width: 1280, height: 800 });

  // 5. Login as Requester (Jennifer Anderson)
  await page.click("text=Logout");
  await page.waitForSelector("input[type='email']");
  await page.fill("input[type='email']", "jennifer.anderson@toktickit.com");
  await page.fill("input[type='password']", "Password123!");
  await page.click("button[type='submit']");
  await page.waitForSelector("text=My Support Tickets");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "08-requester-my-tickets.png"), fullPage: true });

  // Requester Ticket Detail (No Internal Notes + Problem Appears Resolved button)
  await page.click("tbody tr:first-child");
  await page.waitForSelector("text=Problem Appears Resolved");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "09-requester-ticket-detail.png"), fullPage: true });

  // Requester Create Ticket
  await page.click("text=Create Ticket");
  await page.waitForSelector("text=Create Support Ticket");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "10-requester-create-ticket.png"), fullPage: true });

  // 6. Login as Admin (John Smith) -> User Management
  await page.click("text=Logout");
  await page.waitForSelector("input[type='email']");
  await page.fill("input[type='email']", "admin@toktickit.com");
  await page.fill("input[type='password']", "Password123!");
  await page.click("button[type='submit']");
  await page.waitForSelector("text=Admin Users");
  await page.click("text=Admin Users");
  await page.waitForSelector("table");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "11-admin-users-desktop.png"), fullPage: true });

  // Admin Create User Modal / Drawer
  await page.click("button:has-text('Create User')");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "12-admin-create-user.png"), fullPage: true });

  await browser.close();
  console.log("ALL 12 SCREENSHOTS CAPTURED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
