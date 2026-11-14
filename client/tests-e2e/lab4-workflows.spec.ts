import { test, expect, Page } from "@playwright/test";
import path from "path";

const EVIDENCE_DIR = path.resolve(process.cwd(), "../docs/evidence/lab-04");

async function loginAs(page: Page, email: string, password = "Password123!") {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  const loginResponse = page.waitForResponse((res) => res.url().includes("/api/auth/login"));
  await page.getByRole("button", { name: /sign in/i }).click();
  return loginResponse;
}

test.describe.serial("Lab 4 E2E - Dashboards, Actions Taken & Ticket Lifecycle", () => {
  test("E2E-01: IT Staff Dashboard metrics and filtered queue drill-down", async ({ page }, testInfo) => {
    await loginAs(page, "michael.brown@toktickit.com");

    await expect(page.getByRole("heading", { name: /IT Staff Operations Dashboard/i })).toBeVisible();
    await expect(page.getByText(/Recent Active Tickets/i)).toBeVisible();
    await expect(page.getByText(/My Recent Actions Taken/i)).toBeVisible();

    if (testInfo.project.name === "Desktop") {
      await page.screenshot({ path: path.join(EVIDENCE_DIR, "01-staff-dashboard-desktop.png"), fullPage: true });
    } else if (testInfo.project.name === "Mobile") {
      await page.screenshot({ path: path.join(EVIDENCE_DIR, "06-staff-dashboard-mobile.png"), fullPage: true });
    }

    await page.getByRole("button", { name: /Unassigned Queue/i }).click();
    await expect(page.getByRole("heading", { name: /IT Staff Ticket Queue/i })).toBeVisible();
    await expect(page.getByLabel(/Unassigned Only/i)).toBeChecked();

    await page.getByRole("button", { name: /Reset Filters/i }).click();
    await expect(page.getByLabel(/Unassigned Only/i)).not.toBeChecked();
  });

  test("E2E-02: Actions Taken CRUD and guarded Ticket Resolution workflow", async ({ page, request }, testInfo) => {
    const reqLogin = await request.post("http://localhost:5000/api/auth/login", {
      data: { email: "jennifer.anderson@toktickit.com", password: "Password123!" },
    });
    const { token: reqToken } = await reqLogin.json();
    const catRes = await request.get("http://localhost:5000/api/categories");
    const categories = await catRes.json();

    const createdTicketRes = await request.post("http://localhost:5000/api/tickets", {
      headers: { Authorization: `Bearer ${reqToken}` },
      data: {
        summary: `E2E Diagnostic (${testInfo.project.name})`,
        description: "Automated E2E verification of Actions Taken and ticket lifecycle.",
        categoryId: categories[0].id,
        requestedPriority: "HIGH",
      },
    });
    const createdTicket = await createdTicketRes.json();

    await loginAs(page, "michael.brown@toktickit.com");
    await page.getByRole("link", { name: /Ticket Queue/i }).click();
    await expect(page.getByRole("heading", { name: /IT Staff Ticket Queue/i })).toBeVisible();

    await page.getByPlaceholder(/Search ticket # or summary/i).fill(createdTicket.ticketNumber);
    const targetRow = page.locator("table tbody tr", { hasText: createdTicket.ticketNumber }).first();
    await expect(targetRow).toBeVisible();
    await targetRow.click();

    await page.getByRole("button", { name: /\+ Record Action Taken/i }).click();
    await page.getByLabel(/Action Description/i).fill("Inspected system diagnostics and cleared stale cache");
    await page.getByLabel(/Outcome \/ Result/i).fill("Root cause isolated and service stabilized");
    await page.getByRole("checkbox", { name: /Follow-Up Required/i }).check();
    await page.getByLabel(/Follow-Up Note/i).fill("Confirm stability with requester in 24h");
    await page.getByRole("button", { name: /Save Action Taken/i }).click();

    await expect(page.getByText("Inspected system diagnostics and cleared stale cache")).toBeVisible();

    await page.getByRole("button", { name: /Edit Action/i }).first().click();
    await page.getByRole("button", { name: /Update Action/i }).click();
    await expect(page.getByText("Inspected system diagnostics and cleared stale cache")).toBeVisible();

    if (testInfo.project.name === "Desktop") {
      await page.screenshot({ path: path.join(EVIDENCE_DIR, "02-ticket-detail-actions-taken.png"), fullPage: true });
    }

    const statusSelect = page.getByLabel(/Status \(Permitted Transitions\)/i);
    await statusSelect.selectOption("IN_PROGRESS");
    await page.getByRole("button", { name: /Save Ticket Updates/i }).click();
    await expect(page.getByText(/Ticket updated successfully/i)).toBeVisible();

    await statusSelect.selectOption("RESOLVED");
    await page.getByLabel(/Resolution Summary/i).fill("Cleared stale cache and verified full functionality.");
    await page.getByRole("button", { name: /Save Ticket Updates/i }).click();
    await expect(page.getByText(/Ticket updated successfully/i)).toBeVisible();
    await expect(page.getByText(/Resolution Summary/i).first()).toBeVisible();

    if (testInfo.project.name === "Desktop") {
      await page.screenshot({ path: path.join(EVIDENCE_DIR, "03-ticket-resolved-workflow.png"), fullPage: true });
    }
  });

  test("E2E-03: Requester Dashboard, read-only Actions Taken, and Ticket Reopen", async ({ page }, testInfo) => {
    await loginAs(page, "jennifer.anderson@toktickit.com");

    await expect(page.getByRole("heading", { name: /My Support Dashboard/i })).toBeVisible();
    await expect(page.getByText(/Needs Your Attention/i)).toBeVisible();

    if (testInfo.project.name === "Desktop") {
      await page.screenshot({ path: path.join(EVIDENCE_DIR, "04-requester-dashboard.png"), fullPage: true });
    }

    await page.getByRole("link", { name: /My Tickets/i }).click();
    await expect(page.getByRole("heading", { name: /My Support Tickets/i })).toBeVisible();

    const firstTicket = page.locator("table tbody tr").first();
    await expect(firstTicket).toBeVisible();
    await firstTicket.click();

    await expect(page.locator('section[aria-label="Actions Taken"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /\+ Record Action Taken/i })).toHaveCount(0);
    await expect(page.getByText(/Internal Notes/i)).toHaveCount(0);

    await page.getByRole("link", { name: /My Tickets/i }).click();
    // My Tickets now has several filters (status, category, priority), so target the Status one
    await page.getByLabel("Status", { exact: true }).selectOption("RESOLVED");
    const resolvedRows = page.locator("table tbody tr");
    await expect(resolvedRows.first().or(page.getByText(/No tickets match your search or filters/i))).toBeVisible();
    if ((await resolvedRows.count()) > 0) {
      await resolvedRows.first().click();
      const reopenBtn = page.getByRole("button", { name: /Reopen Ticket/i });
      if (await reopenBtn.isVisible()) {
        await reopenBtn.click();
        await expect(page.getByText(/Ticket has been reopened/i)).toBeVisible();
      }
    }
  });

  test("E2E-04: Administrator Dashboard user summary & RBAC navigation", async ({ page }, testInfo) => {
    const firstTry = await loginAs(page, "admin@toktickit.com", "Password123!");
    if (!firstTry.ok()) {
      await loginAs(page, "admin@toktickit.com", "AdminPass123!");
    }

    const changeHeading = page.getByRole("heading", { name: /Change Your Password/i });
    if (await changeHeading.isVisible()) {
      const pwInputs = page.locator('input[type="password"]');
      await pwInputs.nth(0).fill("Password123!");
      await pwInputs.nth(1).fill("AdminPass123!");
      await pwInputs.nth(2).fill("AdminPass123!");
      await page.getByRole("button", { name: /continue/i }).click();
    }

    await expect(page.getByRole("heading", { name: /Administrator & IT Operations Dashboard/i })).toBeVisible();
    await expect(page.getByText(/Active System Users/i)).toBeVisible();

    if (testInfo.project.name === "Desktop") {
      await page.screenshot({ path: path.join(EVIDENCE_DIR, "05-admin-dashboard-users.png"), fullPage: true });
    }

    await page.getByRole("button", { name: /Manage Users/i }).click();
    await expect(page.getByText(/User Management/i).first()).toBeVisible();
  });
});
