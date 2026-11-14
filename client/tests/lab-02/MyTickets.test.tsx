// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { AuthProvider } from "../../src/context/AuthContext";
import { RequesterTickets } from "../../src/pages/RequesterTickets";
import { mockFetch, loginAs } from "../helpers/mockFetch";

const CATEGORIES = [
  { id: "cat-hw", name: "Hardware" },
  { id: "cat-sw", name: "Software" },
];

const ticket = (n: number) => ({
  id: `t${n}`,
  ticketNumber: `TKT-2026-00000${n}`,
  summary: `Ticket summary ${n}`,
  requestedPriority: "MEDIUM",
  status: "NEW",
  category: { name: "Hardware" },
  owner: null,
});

const renderPage = (props: Partial<React.ComponentProps<typeof RequesterTickets>> = {}) =>
  render(
    <AuthProvider>
      <RequesterTickets onSelectTicket={vi.fn()} onCreateNew={vi.fn()} {...props} />
    </AuthProvider>
  );

beforeEach(() => {
  loginAs({ id: "r1", fullName: "Jennifer Anderson", email: "jennifer.anderson@toktickit.com", role: "REQUESTER" });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("My Tickets (Lab 2, migrated to the Lab 3 session)", () => {
  it("shows the ticket list when tickets exist (AC-01 support)", async () => {
    mockFetch((url) => {
      if (url.startsWith("/api/categories")) return { body: CATEGORIES };
      if (url.startsWith("/api/tickets")) return { body: { tickets: [ticket(1)], total: 1, page: 1, pageSize: 10, totalPages: 1 } };
    });
    renderPage();
    expect(await screen.findByText("TKT-2026-000001")).toBeInTheDocument();
    expect(screen.getByText("Ticket summary 1")).toBeInTheDocument();
  });

  it("shows the empty state when the requester has zero tickets and links to Create Ticket", async () => {
    mockFetch((url) => {
      if (url.startsWith("/api/categories")) return { body: CATEGORIES };
      if (url.startsWith("/api/tickets")) return { body: { tickets: [], total: 0, page: 1, pageSize: 10, totalPages: 1 } };
    });
    const onCreateNew = vi.fn();
    renderPage({ onCreateNew });
    expect(await screen.findByText(/haven't created any tickets yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Create your first ticket/i }));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it("shows the no-results state when a search returns nothing (AC-11)", async () => {
    mockFetch((url) => {
      if (url.startsWith("/api/categories")) return { body: CATEGORIES };
      if (url.startsWith("/api/tickets")) {
        return url.includes("search=")
          ? { body: { tickets: [], total: 0, page: 1, pageSize: 10, totalPages: 1 } }
          : { body: { tickets: [ticket(1)], total: 1, page: 1, pageSize: 10, totalPages: 1 } };
      }
    });
    renderPage();
    await screen.findByText("TKT-2026-000001");
    fireEvent.change(screen.getByLabelText(/Search tickets/i), { target: { value: "nothing-matches" } });
    expect(await screen.findByText(/No tickets match your search or filters/i)).toBeInTheDocument();
  });

  it("shows a safe error state with Retry on API failure (BR-22)", async () => {
    let fail = true;
    const fetchMock = mockFetch((url) => {
      if (url.startsWith("/api/categories")) return { body: CATEGORIES };
      if (url.startsWith("/api/tickets")) {
        return fail ? { status: 500, body: { error: "boom" } } : { body: { tickets: [ticket(2)], total: 1, page: 1, pageSize: 10, totalPages: 1 } };
      }
    });
    renderPage();
    expect(await screen.findByText(/Unable to load your tickets/i)).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(await screen.findByText("TKT-2026-000002")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([u]) => String(u).startsWith("/api/tickets")).length).toBe(2);
  });

  it("requests the next page and sends the category filter (BR-20)", async () => {
    const fetchMock = mockFetch((url) => {
      if (url.startsWith("/api/categories")) return { body: CATEGORIES };
      if (url.startsWith("/api/tickets")) return { body: { tickets: [ticket(1)], total: 12, page: 1, pageSize: 10, totalPages: 2 } };
    });
    renderPage();
    await screen.findByText("TKT-2026-000001");
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => String(u).includes("page=2"))).toBe(true)
    );

    await screen.findByRole("option", { name: "Software" });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "cat-sw" } });
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => String(u).includes("categoryId=cat-sw") && String(u).includes("page=1"))).toBe(true)
    );
  });
});
