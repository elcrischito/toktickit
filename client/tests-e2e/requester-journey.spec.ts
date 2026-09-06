import { test, expect } from "@playwright/test";

// Issue 7 — E2E critical path: select requester → create ticket →
// find it in My Tickets → open its detail.
test.describe("Requester critical journey", () => {
  test("select a requester, create a ticket, find it in My Tickets, and open its detail", async ({
    page,
  }) => {
    const uniqueSummary = `E2E test ticket ${Date.now()}`;

    // 1. Select a Development Requester
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Select Development Requester" })).toBeVisible();

    await page.locator("#requester-select").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Continue →" }).click();

    // 2. Navigate to Create Ticket (scoped to the nav bar to avoid ambiguity
    // with the "+ Create Ticket" button on My Tickets)
    await page.locator("nav").getByRole("button", { name: "Create Ticket", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();

    // 3. Fill out and submit the form
    await page.locator("#category").selectOption({ index: 1 });
    await page.locator("#relatedSystem").selectOption({ index: 1 });
    await page.locator("#priority").selectOption("MEDIUM");
    await page.locator("#summary").fill(uniqueSummary);
    await page
      .locator("#description")
      .fill("This ticket was created automatically by a Playwright E2E test.");

    await page.getByRole("button", { name: "Submit Ticket" }).click();

    // 4. Confirm creation success screen
    await expect(page.getByText(/Ticket TKT-\d{4}-\d{6} created/)).toBeVisible();

    // 5. Go to My Tickets and find the new ticket
    await page.getByRole("button", { name: "View My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

    const searchBox = page.getByPlaceholder("Search by ticket number or summary…");
    await searchBox.fill(uniqueSummary);

    // Locate the row via a CSS+text filter rather than accessible role name,
    // since the row's accessible name mixes in badges/dates and won't match
    // a plain regex on the summary alone.
    const ticketRow = page.locator("tbody tr", { hasText: uniqueSummary });
    await expect(ticketRow).toBeVisible({ timeout: 10000 });

    // 6. Open the ticket's detail page
    await ticketRow.click();
    await expect(page.getByText(uniqueSummary)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible();

    // 7. Navigate back to My Tickets
    await page.getByRole("button", { name: "← Back to My Tickets" }).click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  });
});