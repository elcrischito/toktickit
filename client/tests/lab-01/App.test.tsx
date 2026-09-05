import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../src/App.js";

const STORAGE_KEY = "toktickit.selectedRequester";

// Lab 1's "Check System" button was removed once the real Requester flow
// (Lab 2) replaced the placeholder home screen. This test now just confirms
// the app shell renders once a Requester is selected.
beforeEach(() => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" })
  );
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("renders the TokTickIT heading in the app shell", () => {
    render(<App />);
    expect(screen.getAllByText(/TokTickIT/i).length).toBeGreaterThan(0);
  });
});