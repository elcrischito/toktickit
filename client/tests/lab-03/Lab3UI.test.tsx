// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { AuthProvider } from "../../src/context/AuthContext";
import { Login } from "../../src/pages/Login";
import { ChangePassword } from "../../src/pages/ChangePassword";
import { TicketDetail } from "../../src/pages/TicketDetail";
import { UserManagement } from "../../src/pages/UserManagement";

describe("Lab 3 - Frontend Role-Based UI & Security Components", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("UI-01: renders Login screen and displays error message on invalid credentials", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      text: async () => JSON.stringify({ error: "Invalid email or password" }),
    } as any);

    const { container } = render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );

    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "wrong@toktickit.com" } });
    fireEvent.change(passwordInput, { target: { value: "badpass" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it("UI-02: renders mandatory ChangePassword screen when mustChangePassword is active", () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "u1",
        fullName: "John Smith (Admin)",
        email: "admin@toktickit.com",
        role: "ADMIN",
        mustChangePassword: true,
      })
    );
    localStorage.setItem("token", "fake-token");

    render(
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    );

    expect(screen.getByText(/change your password/i)).toBeInTheDocument();
    expect(screen.getByText(/must change your initial password/i)).toBeInTheDocument();
  });

  it("UI-03: hides Internal Notes and shows 'Problem Appears Resolved' for REQUESTER on TicketDetail (BR-04, BR-05)", async () => {
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

    global.fetch = vi.fn((url: any) => {
      if (String(url).endsWith("/comments")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: "t1",
          ticketNumber: "TKT-2026-001234",
          summary: "Laptop battery drains quickly",
          description: "Battery drains fast.",
          category: { name: "Hardware" },
          relatedSystem: { name: "Corporate Laptop" },
          requester: { fullName: "Jennifer Anderson" },
          owner: { fullName: "Michael Brown" },
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          status: "IN_PROGRESS",
          createdAt: new Date().toISOString(),
        }),
      });
    }) as any;

    render(
      <AuthProvider>
        <TicketDetail ticketId="t1" onBack={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-001234")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /problem appears resolved/i })).toBeInTheDocument();
    expect(screen.queryByText(/internal notes/i)).not.toBeInTheDocument();
  });

  it("UI-04: shows Internal Notes and IT Staff triage controls for IT_STAFF on TicketDetail (AC-04)", async () => {
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
      if (String(url).endsWith("/notes")) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: "n1", content: "Secret staff note", author: { fullName: "Michael Brown", role: "IT_STAFF" }, createdAt: new Date().toISOString() },
          ],
        });
      }
      if (String(url).endsWith("/agents")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: "t1",
          ticketNumber: "TKT-2026-001234",
          summary: "Laptop battery drains quickly",
          description: "Battery drains fast.",
          category: { name: "Hardware" },
          requester: { fullName: "Jennifer Anderson" },
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          status: "IN_PROGRESS",
          createdAt: new Date().toISOString(),
        }),
      });
    }) as any;

    render(
      <AuthProvider>
        <TicketDetail ticketId="t1" onBack={() => {}} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/internal notes/i)).toBeInTheDocument();
      expect(screen.getByText(/secret staff note/i)).toBeInTheDocument();
    });
  });

  it("UI-05: renders UserManagement table for ADMIN", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ id: "adm-1", fullName: "John Smith", email: "admin@toktickit.com", role: "ADMIN", mustChangePassword: false })
    );
    localStorage.setItem("token", "adm-token");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "1", fullName: "John Smith (Admin)", email: "admin@toktickit.com", role: "ADMIN", isActive: true },
        { id: "2", fullName: "Michael Brown", email: "michael.brown@toktickit.com", role: "IT_STAFF", isActive: true },
      ],
    }) as any;

    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("John Smith (Admin)")).toBeInTheDocument();
      expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    });
  });
});
