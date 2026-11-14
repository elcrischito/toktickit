// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ActionsTakenSection, ActionTakenItem } from "../../src/components/ActionsTakenSection";

const sampleActions: ActionTakenItem[] = [
  {
    id: "act-1",
    ticketId: "t-1",
    actionDateTime: "2026-11-12T09:30:00.000Z",
    description: "Ran battery health check",
    result: "Capacity at 48%",
    status: "COMPLETED",
    performedById: "staff-1",
    performedBy: { id: "staff-1", fullName: "Michael Brown", role: "IT_STAFF" },
    followUpRequired: true,
    followUpNote: "Order OEM battery",
    version: 1,
  },
];

describe("Lab 4 UI - Actions Taken Component (UI-03, AC-01..AC-05)", () => {
  afterEach(() => {
    cleanup();
  });

  it("UI-03a: renders read-only Actions Taken for Requester without create or edit buttons", () => {
    render(
      <ActionsTakenSection
        ticketId="t-1"
        token="req-token"
        isStaff={false}
        actions={sampleActions}
        agents={[]}
        onActionCreated={() => {}}
        onActionUpdated={() => {}}
        onRefreshAll={() => {}}
      />
    );

    expect(screen.getByText(/Ran battery health check/i)).toBeInTheDocument();
    expect(screen.getByText(/Order OEM battery/i)).toBeInTheDocument();
    expect(screen.queryByText(/\+ Record Action Taken/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Edit Action/i)).not.toBeInTheDocument();
  });

  it("UI-03b: validates conditional Follow-Up Note and preserves entered inputs on error", () => {
    render(
      <ActionsTakenSection
        ticketId="t-1"
        token="staff-token"
        isStaff={true}
        actions={sampleActions}
        agents={[{ id: "staff-1", fullName: "Michael Brown", role: "IT_STAFF" }]}
        onActionCreated={vi.fn()}
        onActionUpdated={vi.fn()}
        onRefreshAll={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /\+ Record Action Taken/i }));
    fireEvent.change(screen.getByLabelText(/Action Description/i), {
      target: { value: "Replaced thermal paste" },
    });
    fireEvent.change(screen.getByLabelText(/Outcome \/ Result/i), {
      target: { value: "Temps dropped 12C" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Follow-Up Required/i }));
    fireEvent.click(screen.getByRole("button", { name: /Save Action Taken/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/Follow-up Note is required/i);
    expect(screen.getByLabelText(/Action Description/i)).toHaveValue("Replaced thermal paste");
  });
});
