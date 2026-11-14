import { test, expect } from "@playwright/test";

// Lab 2 critical path (Issue 7), updated for the Lab 3 login that replaced the
// Development Requester selector: log in → create ticket with an attachment →
// find it in My Tickets → open its detail → see the attachment.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

test.describe("Requester critical journey", () => {
  test("log in, create a ticket with an attachment, find it in My Tickets, and open its detail", async ({ page }) => {
    const uniqueSummary = `E2E test ticket ${Date.now()}`;

    // 1. Log in as the seeded requester
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('input[type="email"]').fill("jennifer.anderson@toktickit.com");
    await page.locator('input[type="password"]').fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // 2. Open Create Ticket from the nav bar
    await page.getByRole("link", { name: "Create Ticket", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create Support Ticket" })).toBeVisible();

    // 3. Fill the form, attach a screenshot and submit
    await page.getByLabel(/Category/).selectOption({ label: "Hardware" });
    await page.getByLabel(/Ticket Summary/).fill(uniqueSummary);
    await page.getByLabel(/Description/).fill("Laptop screen flickers after waking from sleep.");
    await page.getByLabel(/Attachments/).setInputFiles({ name: "flicker.png", mimeType: "image/png", buffer: PNG });
    await page.getByRole("button", { name: "Submit Ticket" }).click();

    // 4. Success state shows the generated Ticket Number (AC-01)
    await expect(page.getByText(/Ticket TKT-\d{4}-\d{6} created/)).toBeVisible();

    // 5. Go to My Tickets and find the new ticket via search
    await page.getByRole("button", { name: "View My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "My Support Tickets" })).toBeVisible();
    await page.getByLabel("Search tickets").fill(uniqueSummary);
    await expect(page.getByText(uniqueSummary)).toBeVisible();

    // 6. Open the detail and check the attachment is listed
    await page.getByText(uniqueSummary).click();
    await expect(page.getByRole("heading", { name: uniqueSummary })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Attachments/ })).toBeVisible();
    await expect(page.getByText("flicker.png")).toBeVisible();
  });
});
