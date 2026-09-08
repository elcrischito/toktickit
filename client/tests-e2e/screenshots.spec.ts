import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const FIXTURE_DIR = path.join(process.cwd(), "tests-e2e", "fixtures");
const FIXTURE_FILE = path.join(FIXTURE_DIR, "test-attachment.png");

test.beforeAll(() => {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  if (!fs.existsSync(FIXTURE_FILE)) {
    const tinyPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64"
    );
    fs.writeFileSync(FIXTURE_FILE, tinyPng);
  }
});

// Issue 7 — Visual/responsive evidence capture (Lab 2).
// Generates the screenshots required by the Lab 2 handout under
// artifacts/lab-02/screenshots/<screen>/<viewport>-<state>.png
//
// Run with: npx playwright test tests-e2e/screenshots.spec.ts
// (runs once per configured project: Desktop, Tablet, Mobile)

const OUTPUT_ROOT = path.join(process.cwd(), "..", "artifacts", "lab-02", "screenshots");

function outPath(screen: string, filename: string) {
  const dir = path.join(OUTPUT_ROOT, screen);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
}

async function selectRequester(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Select Development Requester" })).toBeVisible();
  await page.locator("#requester-select").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continue →" }).click();
}

test.describe("Lab 2 screenshot capture", () => {
  test("Create Ticket — initial state", async ({ page }, testInfo) => {
    await selectRequester(page);
    await page.locator("nav").getByRole("button", { name: "Create Ticket", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
    await page.screenshot({
      path: outPath("create-ticket", `${testInfo.project.name.toLowerCase()}-initial.png`),
      fullPage: true,
    });
  });

  test("Create Ticket — validation failure state", async ({ page }, testInfo) => {
    await selectRequester(page);
    await page.locator("nav").getByRole("button", { name: "Create Ticket", exact: true }).click();
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    // Field-level errors render synchronously on submit; small settle wait
    // keeps the screenshot stable across viewport sizes.
    await page.waitForTimeout(150);
    await page.screenshot({
      path: outPath("create-ticket", `${testInfo.project.name.toLowerCase()}-validation-failure.png`),
      fullPage: true,
    });
  });

  test("Create Ticket — success state", async ({ page }, testInfo) => {
    await selectRequester(page);
    await page.locator("nav").getByRole("button", { name: "Create Ticket", exact: true }).click();
    await page.locator("#category").selectOption({ index: 1 });
    await page.locator("#relatedSystem").selectOption({ index: 1 });
    await page.locator("#priority").selectOption("MEDIUM");
    await page.locator("#summary").fill(`Screenshot ticket ${Date.now()}`);
    await page
      .locator("#description")
      .fill("This ticket was created to capture the success-state screenshot.");
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByText(/Ticket TKT-\d{4}-\d{6} created/)).toBeVisible();
    await page.screenshot({
      path: outPath("create-ticket", `${testInfo.project.name.toLowerCase()}-success.png`),
      fullPage: true,
    });
  });

  test("Create Ticket — API failure state", async ({ page }, testInfo) => {
    await selectRequester(page);
    await page.locator("nav").getByRole("button", { name: "Create Ticket", exact: true }).click();
    // Simulate a backend failure by intercepting the create-ticket call.
    await page.route("**/api/tickets", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 500, body: "{}" });
      }
      return route.continue();
    });
    await page.locator("#category").selectOption({ index: 1 });
    await page.locator("#relatedSystem").selectOption({ index: 1 });
    await page.locator("#priority").selectOption("MEDIUM");
    await page.locator("#summary").fill("API failure screenshot ticket");
    await page
      .locator("#description")
      .fill("This submission is expected to fail so we can capture the error state.");
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByText(/Unable to create ticket/i)).toBeVisible();
    await page.screenshot({
      path: outPath("create-ticket", `${testInfo.project.name.toLowerCase()}-api-failure.png`),
      fullPage: true,
    });
  });

  test("My Tickets — populated list", async ({ page }, testInfo) => {
    await selectRequester(page);
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    // Ensure at least one ticket exists so the list isn't empty.
    const emptyState = page.getByText(/haven't created any tickets yet/i);
    if (await emptyState.isVisible().catch(() => false)) {
      await page.locator("nav").getByRole("button", { name: "Create Ticket", exact: true }).click();
      await page.locator("#category").selectOption({ index: 1 });
      await page.locator("#relatedSystem").selectOption({ index: 1 });
      await page.locator("#priority").selectOption("MEDIUM");
      await page.locator("#summary").fill(`Seed ticket for screenshot ${Date.now()}`);
      await page.locator("#description").fill("Seeded so My Tickets has at least one row.");
      await page.getByRole("button", { name: "Submit Ticket" }).click();
      await page.getByRole("button", { name: "View My Tickets" }).click();
    }
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await page.screenshot({
      path: outPath("my-tickets", `${testInfo.project.name.toLowerCase()}-populated.png`),
      fullPage: true,
    });
  });

  test("My Tickets — no-results state", async ({ page }, testInfo) => {
    await selectRequester(page);
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await page
      .getByPlaceholder("Search by ticket number or summary…")
      .fill("zzz-no-such-ticket-exists");
    await expect(page.getByText(/No tickets match your filters/i)).toBeVisible();
    await page.screenshot({
      path: outPath("my-tickets", `${testInfo.project.name.toLowerCase()}-no-results.png`),
      fullPage: true,
    });
  });

  test("Ticket Detail — owned ticket with attachments panel", async ({ page }, testInfo) => {
    await selectRequester(page);
    await page.locator("nav").getByRole("button", { name: "Create Ticket", exact: true }).click();
    await page.locator("#category").selectOption({ index: 1 });
    await page.locator("#relatedSystem").selectOption({ index: 1 });
    await page.locator("#priority").selectOption("HIGH");
    const uniqueSummary = `Detail screenshot ticket ${Date.now()}`;
    await page.locator("#summary").fill(uniqueSummary);
    await page.locator("#description").fill("Ticket created to capture the Ticket Detail screenshot.");
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByText(/Ticket TKT-\d{4}-\d{6} created/)).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "View My Tickets" }).click();
    await page.getByPlaceholder("Search by ticket number or summary…").fill(uniqueSummary);
    const ticketRow = page.locator("tbody tr", { hasText: uniqueSummary });
    await expect(ticketRow).toBeVisible({ timeout: 10000 });
    await ticketRow.click();
    await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible();

    // Upload a real attachment so this screenshot shows the attachment
    // lifecycle instead of an empty "No attachments yet." state.
    await page.setInputFiles('input[type="file"]', FIXTURE_FILE);
    await expect(page.getByText("test-attachment.png")).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: outPath("ticket-detail", `${testInfo.project.name.toLowerCase()}-owned-ticket.png`),
      fullPage: true,
    });
  });
});