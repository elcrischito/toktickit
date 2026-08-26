import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const STORAGE_KEY = "toktickit.selectedRequester";

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
  it("renders the TokTickIT heading", () => {
    render(<App />);
        expect(screen.getAllByText(/TokTickIT/i).length).toBeGreaterThan(0);
  });

  it("shows Online and the seeded categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });
    render(<App />);
    await userEvent.click(screen.getByText("Check System"));
    expect(await screen.findByText(/Online/i)).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("down"));
    render(<App />);
    await userEvent.click(screen.getByText("Check System"));
    expect(await screen.findByText(/Offline/i)).toBeInTheDocument();
  });
});