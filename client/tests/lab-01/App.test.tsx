// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import App from "../../src/App";
import { mockFetch, loginAs } from "../helpers/mockFetch";

// Lab 1 app-shell test, updated for the Lab 3 login flow (the Lab 2
// Development Requester selector was intentionally removed, see BR-24).
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("shows the TokTickIT sign-in screen when nobody is logged in", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /TokTickIT — Sign In/i })).toBeInTheDocument();
  });

  it("renders the TokTickIT app shell for a logged-in user", async () => {
    loginAs({ id: "r1", fullName: "Jennifer Anderson", email: "jennifer.anderson@toktickit.com", role: "REQUESTER" });
    mockFetch(() => ({ body: {} }));
    render(<App />);
    expect((await screen.findAllByText(/TokTickIT/i)).length).toBeGreaterThan(0);
  });
});
