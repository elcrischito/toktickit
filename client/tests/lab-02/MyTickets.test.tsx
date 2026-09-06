import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const STORAGE_KEY = "toktickit.selectedRequester";

const sampleTicket = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "Laptop battery drains quickly",
  categoryId: 1,
  categoryName: "Hardware",
  requestedPriority: "MEDIUM" as const,
  itPriority: null,
  currentStatus: "NEW",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" })
  );
  vi.spyOn(api, "fetchCategories").mockResolvedValue([
    { id: 1, name: "Hardware" },
    { id: 2, name: "Software" },
  ]);
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("My Tickets", () => {
  it("shows the empty state when the requester has zero tickets", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });
    render(<App />);

    expect(await screen.findByText(/haven't created any tickets yet/i)).toBeInTheDocument();
  });

  it("shows the ticket list when tickets exist (AC-01 support)", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [sampleTicket],
      meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    });
    render(<App />);

    expect(await screen.findByText("TKT-2026-000001")).toBeInTheDocument();
    expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
  });

  it("shows a safe error state with Retry on API failure (BR-22)", async () => {
    vi.spyOn(api, "fetchTickets").mockRejectedValue(new Error("network down"));
    render(<App />);

    expect(await screen.findByText(/Unable to load your tickets/i)).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows the no-results state when a search returns nothing (AC-11)", async () => {
    const fetchSpy = vi
      .spyOn(api, "fetchTickets")
      .mockResolvedValueOnce({
        data: [sampleTicket],
        meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      })
      .mockResolvedValue({
        data: [],
        meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
      });

    render(<App />);
    await screen.findByText("TKT-2026-000001");

    await userEvent.type(
      screen.getByPlaceholderText(/Search by ticket number or summary/i),
      "zzz-no-match"
    );

    await waitFor(() =>
      expect(screen.getByText(/No tickets match your filters/i)).toBeInTheDocument()
    );
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("navigates to Create Ticket from the empty state button", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([{ id: 1, name: "Corporate Laptop" }]);

    render(<App />);
    await screen.findByText(/haven't created any tickets yet/i);

    const createButtons = screen.getAllByRole("button", { name: "Create Ticket" });
    await userEvent.click(createButtons[createButtons.length - 1]);

    expect(await screen.findByLabelText(/Category/i)).toBeInTheDocument();
  });
});