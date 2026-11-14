// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { AttachmentsSection, validateAttachment } from "../../src/components/AttachmentsSection";
import { mockFetch } from "../helpers/mockFetch";

// Replaces the old Development Requester selection test: that screen was removed on
// purpose in Lab 3 (BR-24). These cover the Lab 2 attachment rules on Ticket Detail.
const ATTACHMENTS = [
  { id: "a1", fileName: "screenshot.png", mimeType: "image/png", sizeBytes: 2048, uploadedAt: "2026-09-06T08:00:00.000Z", isRemoved: false },
  { id: "a0", fileName: "old.pdf", mimeType: "application/pdf", sizeBytes: 4096, uploadedAt: "2026-09-05T08:00:00.000Z", isRemoved: true, removedAt: "2026-09-05T09:00:00.000Z", removalReason: "Wrong file" },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Attachments section (Lab 2 BR-13..BR-18)", () => {
  it("validates type, size and the 5-attachment limit on the client (BR-13/14/15)", () => {
    expect(validateAttachment(new File(["x"], "a.txt", { type: "text/plain" }), 0)).toMatch(/Only JPG/);
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    expect(validateAttachment(big, 0)).toMatch(/5 MB/);
    expect(validateAttachment(new File(["x"], "ok.png", { type: "image/png" }), 5)).toMatch(/at most 5/);
    expect(validateAttachment(new File(["x"], "ok.png", { type: "image/png" }), 4)).toBeNull();
  });

  it("lets the owning requester add and remove, and lists removed files separately (BR-16, BR-18)", async () => {
    mockFetch(() => ({ body: { data: ATTACHMENTS } }));
    render(<AttachmentsSection ticketId="t1" token="tok" canModify />);
    expect(await screen.findByText("screenshot.png")).toBeInTheDocument();
    expect(screen.getByText("+ Add Attachment")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(screen.getByText(/Removed attachments \(1\)/)).toBeInTheDocument();
  });

  it("is read-only for IT Staff: download only, no add/remove (BR-18)", async () => {
    mockFetch(() => ({ body: { data: ATTACHMENTS } }));
    render(<AttachmentsSection ticketId="t1" token="tok" canModify={false} />);
    expect(await screen.findByText("screenshot.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
    expect(screen.queryByText("+ Add Attachment")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("requires a 3-200 character removal reason before calling the API (BR-17)", async () => {
    const fetchMock = mockFetch((url, init) => {
      if (init?.method === "DELETE") return { body: { data: { id: "a1", isRemoved: true } } };
      return { body: { data: ATTACHMENTS } };
    });
    render(<AttachmentsSection ticketId="t1" token="tok" canModify />);
    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));
    fireEvent.change(screen.getByLabelText("Removal reason"), { target: { value: "no" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Remove" }));
    expect(await screen.findByText(/between 3 and 200 characters/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);

    fireEvent.change(screen.getByLabelText("Removal reason"), { target: { value: "Uploaded the wrong screenshot" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Remove" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(true));
    const del = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE")!;
    expect(String(del[0])).toBe("/api/attachments/a1");
    expect(JSON.parse(String(del[1]!.body))).toEqual({ removalReason: "Uploaded the wrong screenshot" });
  });
});
