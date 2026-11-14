// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { AuthProvider } from "../../src/context/AuthContext";
import { TicketDetail } from "../../src/pages/TicketDetail";

describe("Lab 4 UI - Ticket Workflow Transition Matrix (UI-04, FR-04, BR-06)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("UI-04: restricts Ticket status dropdown options to permitted transitions from NEW", async () => {
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

    global.fetch = vi.fn((url: any) => {
      if (String(url).endsWith("/comments")) return Promise.resolve({ ok: true, json: async () => [] });
      if (String(url).endsWith("/actions")) return Promise.resolve({ ok: true, json: async () => ({ actions: [] }) });
      if (String(url).endsWith("/notes")) return Promise.resolve({ ok: true, json: async () => [] });
      if (String(url).endsWith("/agents")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: "t-new",
          ticketNumber: "TKT-2026-001236",
          summary: "Request Adobe Creative Cloud license",
          description: "Need Creative Cloud access.",
          category: { name: "Software" },
          requester: { fullName: "Emily Davis" },
          requestedPriority: "LOW",
          itPriority: "LOW",
          status: "NEW",
          version: 1,
          createdAt: new Date().toISOString(),
        }),
      });
    }) as any;

    render(
      <AuthProvider>
        <TicketDetail ticketId="t-new" onBack={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Status \(Permitted Transitions\)/i)).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Status \(Permitted Transitions\)/i) as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(["NEW", "OPEN", "IN_PROGRESS", "CANCELLED"]);
    expect(options).not.toContain("CLOSED");
    expect(options).not.toContain("RESOLVED");
  });
});
