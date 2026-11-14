// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { AuthProvider } from "../../src/context/AuthContext";
import { RequesterDashboard } from "../../src/pages/RequesterDashboard";

describe("Lab 4 UI - Requester Dashboard (UI-02, FR-07)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("UI-02: renders personal ticket counts, Needs Your Attention list, and drills down to /my-tickets", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "req-1",
        fullName: "Jennifer Anderson",
        email: "jennifer.anderson@toktickit.com",
        role: "REQUESTER",
        mustChangePassword: false,
      })
    );
    localStorage.setItem("token", "req-token");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: {
          myOpenCount: 2,
          inProgressCount: 1,
          waitingForMeCount: 1,
          resolvedCount: 1,
          closedCount: 0,
        },
        attentionTickets: [
          {
            id: "t-4",
            ticketNumber: "TKT-2026-001237",
            summary: "Outlook calendar sync issue on mobile",
            status: "WAITING_FOR_REQUESTER",
          },
        ],
        recentTickets: [
          {
            id: "t-1",
            ticketNumber: "TKT-2026-001234",
            summary: "Laptop battery drains quickly",
            status: "IN_PROGRESS",
          },
        ],
      }),
    }) as any;

    const onNavigateMyTickets = vi.fn();

    render(
      <AuthProvider>
        <RequesterDashboard
          onNavigateMyTickets={onNavigateMyTickets}
          onCreateTicket={() => {}}
          onSelectTicket={() => {}}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/My Support Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText("TKT-2026-001237")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Waiting for Me/i));
    expect(onNavigateMyTickets).toHaveBeenCalledWith("WAITING_FOR_REQUESTER");
  });
});
