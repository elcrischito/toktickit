// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { AuthProvider } from "../../src/context/AuthContext";
import { RequesterCreateTicket } from "../../src/pages/RequesterCreateTicket";
import { mockFetch, loginAs } from "../helpers/mockFetch";

const lookups = (url: string) => {
  if (url.startsWith("/api/categories")) return { body: [{ id: "cat-hw", name: "Hardware" }] };
  if (url.startsWith("/api/related-systems")) return { body: [{ id: "sys-1", name: "Email" }] };
  return undefined;
};

const renderPage = () =>
  render(
    <AuthProvider>
      <RequesterCreateTicket onSuccess={vi.fn()} onCancel={vi.fn()} onViewTicket={vi.fn()} />
    </AuthProvider>
  );

const fillValidForm = async () => {
  await screen.findByRole("option", { name: "Hardware" });
  fireEvent.change(screen.getByLabelText(/Category/), { target: { value: "cat-hw" } });
  fireEvent.change(screen.getByLabelText(/Ticket Summary/), { target: { value: "Laptop will not boot" } });
  fireEvent.change(screen.getByLabelText(/Description/), { target: { value: "Black screen after the latest update." } });
};

beforeEach(() => {
  loginAs({ id: "r1", fullName: "Jennifer Anderson", email: "jennifer.anderson@toktickit.com", role: "REQUESTER" });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("Create Ticket (Lab 2, migrated to the Lab 3 session)", () => {
  it("shows a field-level message when Summary is empty and does not call the API (AC-04)", async () => {
    const fetchMock = mockFetch((url) => lookups(url));
    renderPage();
    await screen.findByRole("option", { name: "Hardware" });
    fireEvent.change(screen.getByLabelText(/Category/), { target: { value: "cat-hw" } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: "Black screen after the latest update." } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    expect(await screen.findByText("Summary is required.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("shows the busy state and disables Submit while the request is in flight (BR-11)", async () => {
    let release: () => void = () => {};
    mockFetch((url, init) => lookups(url) ?? (init?.method === "POST" ? { status: 201, body: { id: "t1", ticketNumber: "TKT-2026-000001" } } : undefined));
    const original = global.fetch;
    global.fetch = vi.fn(async (input: any, init?: any) => {
      if (init?.method === "POST") await new Promise<void>((r) => (release = r));
      return original(input, init);
    }) as any;

    renderPage();
    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));
    const busy = await screen.findByRole("button", { name: /Submitting/i });
    expect(busy).toBeDisabled();
    release();
    expect(await screen.findByText(/Ticket TKT-2026-000001 created/)).toBeInTheDocument();
  });

  it("preserves entered values after an API failure (BR-12)", async () => {
    mockFetch((url, init) => lookups(url) ?? (init?.method === "POST" ? { status: 500, body: { error: "Failed to create ticket" } } : undefined));
    renderPage();
    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    expect(await screen.findByText("Failed to create ticket")).toBeInTheDocument();
    expect(screen.getByLabelText(/Ticket Summary/)).toHaveValue("Laptop will not boot");
    expect(screen.getByLabelText(/Description/)).toHaveValue("Black screen after the latest update.");
  });

  it("shows the success state with the generated Ticket Number (AC-01)", async () => {
    mockFetch((url, init) => lookups(url) ?? (init?.method === "POST" ? { status: 201, body: { id: "t9", ticketNumber: "TKT-2026-123456" } } : undefined));
    renderPage();
    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    expect(await screen.findByRole("heading", { name: "Ticket TKT-2026-123456 created" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View My Tickets" })).toBeInTheDocument();
  });

  it("rejects an unsupported attachment type before upload (BR-13)", async () => {
    mockFetch((url) => lookups(url));
    renderPage();
    await screen.findByRole("option", { name: "Hardware" });
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText(/Attachments/), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/Only JPG, PNG, WEBP, and PDF files are allowed/)).toBeInTheDocument());
  });
});
