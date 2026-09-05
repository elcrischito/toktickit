import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const STORAGE_KEY = "toktickit.selectedRequester";

beforeEach(() => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" })
  );
  vi.spyOn(api, "fetchCategories").mockResolvedValue([
    { id: 1, name: "Hardware" },
    { id: 2, name: "Software" },
  ]);
  vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([
    { id: 1, name: "Corporate Laptop" },
    { id: 2, name: "Campus Wi-Fi" },
  ]);
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

async function goToCreateTicket() {
  render(<App />);
  const navButtons = await screen.findAllByText("Create Ticket");
  await userEvent.click(navButtons[0]);
    await screen.findByLabelText(/Category/i);
}

describe("Create Ticket", () => {
  it("shows a field-level message when Summary is empty (AC-04)", async () => {
    vi.spyOn(api, "createTicket");
    await goToCreateTicket();

    await userEvent.selectOptions(screen.getByLabelText(/Category/i), "1");
    await userEvent.selectOptions(screen.getByLabelText(/Related System/i), "1");
    await userEvent.selectOptions(screen.getByLabelText(/Requested Priority/i), "MEDIUM");
    await userEvent.type(
      screen.getByLabelText(/Description/i),
      "The battery drains much faster than usual."
    );
    await userEvent.click(screen.getByText("Submit Ticket"));

    expect(api.createTicket).not.toHaveBeenCalled();
  });

  it("shows the busy state and disables Submit while the request is in flight (BR-11)", async () => {
    let resolveCreate: (value: any) => void = () => {};
    vi.spyOn(api, "createTicket").mockImplementation(
      () => new Promise((resolve) => (resolveCreate = resolve))
    );
    await goToCreateTicket();

    await userEvent.selectOptions(screen.getByLabelText(/Category/i), "1");
    await userEvent.selectOptions(screen.getByLabelText(/Related System/i), "1");
    await userEvent.selectOptions(screen.getByLabelText(/Requested Priority/i), "MEDIUM");
    await userEvent.type(screen.getByLabelText(/Ticket Summary/i), "Laptop battery drains quickly");
    await userEvent.type(
      screen.getByLabelText(/Description/i),
      "The battery drains much faster than usual."
    );
    await userEvent.click(screen.getByText("Submit Ticket"));

    expect(await screen.findByText("Submitting…")).toBeInTheDocument();
    resolveCreate({
      id: 1,
      ticketNumber: "TKT-2026-000001",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Laptop battery drains quickly",
      description: "The battery drains much faster than usual.",
      requestedPriority: "MEDIUM",
      itPriority: null,
      currentStatus: "NEW",
      createdAt: "",
      updatedAt: "",
    });
  });

  it("shows the success state with the generated Ticket Number (AC-01)", async () => {
    vi.spyOn(api, "createTicket").mockResolvedValue({
      id: 1,
      ticketNumber: "TKT-2026-000001",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Laptop battery drains quickly",
      description: "The battery drains much faster than usual.",
      requestedPriority: "MEDIUM",
      itPriority: null,
      currentStatus: "NEW",
      createdAt: "",
      updatedAt: "",
    });
    await goToCreateTicket();

    await userEvent.selectOptions(screen.getByLabelText(/Category/i), "1");
    await userEvent.selectOptions(screen.getByLabelText(/Related System/i), "1");
    await userEvent.selectOptions(screen.getByLabelText(/Requested Priority/i), "MEDIUM");
    await userEvent.type(screen.getByLabelText(/Ticket Summary/i), "Laptop battery drains quickly");
    await userEvent.type(
      screen.getByLabelText(/Description/i),
      "The battery drains much faster than usual."
    );
    await userEvent.click(screen.getByText("Submit Ticket"));

    expect(await screen.findByText(/TKT-2026-000001 created/i)).toBeInTheDocument();
  });

  it("preserves entered values after an API failure (BR-12)", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("Server down"));
    await goToCreateTicket();

    await userEvent.selectOptions(screen.getByLabelText(/Category/i), "1");
    await userEvent.selectOptions(screen.getByLabelText(/Related System/i), "1");
    await userEvent.selectOptions(screen.getByLabelText(/Requested Priority/i), "MEDIUM");
    await userEvent.type(screen.getByLabelText(/Ticket Summary/i), "Laptop battery drains quickly");
    await userEvent.type(
      screen.getByLabelText(/Description/i),
      "The battery drains much faster than usual."
    );
    await userEvent.click(screen.getByText("Submit Ticket"));

    await waitFor(() => expect(screen.getByText(/Server down/i)).toBeInTheDocument());
    expect(screen.getByDisplayValue("Laptop battery drains quickly")).toBeInTheDocument();
  });
});