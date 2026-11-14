// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { AuthProvider } from "../../src/context/AuthContext";
import { StaffDashboard } from "../../src/pages/StaffDashboard";

describe("Lab 4 UI - IT Staff & Admin Dashboard (UI-01, FR-06)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("UI-01: renders operational metrics, recent lists, and triggers filtered queue drill-down", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "staff-1",
        fullName: "Michael Brown",
        email: "michael.brown@toktickit.com",
        role: "IT_STAFF",
        mustChangePassword: false,
      })
    );
    localStorage.setItem("token", "staff-token");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: {
          newCount: 3,
          openCount: 4,
          inProgressCount: 2,
          waitingForRequesterCount: 1,
          unassignedCount: 5,
          myAssignedCount: 2,
          highPriorityOpenCount: 2,
          myActionsCount: 6,
        },
        recentTickets: [
          {
            id: "t-1",
            ticketNumber: "TKT-2026-001234",
            summary: "Laptop battery drains quickly",
            status: "IN_PROGRESS",
            requester: { fullName: "Jennifer Anderson" },
            owner: { fullName: "Michael Brown" },
          },
        ],
        myRecentActions: [
          {
            id: "a-1",
            status: "COMPLETED",
            description: "Ran powercfg diagnostic",
            result: "Battery degraded to 48%",
            ticket: { id: "t-1", ticketNumber: "TKT-2026-001234" },
          },
        ],
      }),
    }) as any;

    const onNavigateQueue = vi.fn();
    const onSelectTicket = vi.fn();

    render(
      <AuthProvider>
        <StaffDashboard onNavigateQueue={onNavigateQueue} onSelectTicket={onSelectTicket} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/IT Staff Operations Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText("TKT-2026-001234")).toBeInTheDocument();
      expect(screen.getByText(/Ran powercfg diagnostic/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Unassigned Queue/i));
    expect(onNavigateQueue).toHaveBeenCalledWith({ unassigned: true });
  });
});
