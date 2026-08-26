import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("Development Requester Selection", () => {
  it("shows the Selection screen when no Requester is selected (AC-02)", async () => {
    vi.spyOn(api, "fetchDevRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
    ]);
    render(<App />);
    expect(await screen.findByText(/Select Development Requester/i)).toBeInTheDocument();
  });

  it("does not list an inactive requester in the dropdown (AC-15, BR-04)", async () => {
    vi.spyOn(api, "fetchDevRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
      { id: 2, name: "Michael Brown", email: "michael.brown@example.com" },
    ]);
    render(<App />);
    await screen.findByLabelText(/Development Requester/i);
    expect(screen.queryByText("Robert Wilson")).not.toBeInTheDocument();
  });

  it("shows a safe error state with Retry when the API call fails (BR-22)", async () => {
    vi.spyOn(api, "fetchDevRequesters").mockRejectedValue(new Error("network down"));
    render(<App />);
    expect(await screen.findByText(/Unable to load development requesters/i)).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows an empty state when there are no active requesters (BR-21)", async () => {
    vi.spyOn(api, "fetchDevRequesters").mockResolvedValue([]);
    render(<App />);
    expect(
      await screen.findByText(/No active development requesters are available/i)
    ).toBeInTheDocument();
  });

  it("selects a requester, continues into the app, and persists across reload", async () => {
    vi.spyOn(api, "fetchDevRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
    ]);
    vi.spyOn(api, "checkSystem").mockResolvedValue({ online: true, categories: [] });

    const { unmount } = render(<App />);
    const select = await screen.findByLabelText(/Development Requester/i);
    await userEvent.selectOptions(select, "1");
    await userEvent.click(screen.getByText(/Continue/i));

    expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
    expect(localStorage.getItem("toktickit.selectedRequester")).toContain("Jennifer Anderson");

    unmount();
    render(<App />);
    expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();
  });

  it("returns to the Selection screen when Change Requester is clicked", async () => {
    vi.spyOn(api, "fetchDevRequesters").mockResolvedValue([
      { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
    ]);

    render(<App />);
    const select = await screen.findByLabelText(/Development Requester/i);
    await userEvent.selectOptions(select, "1");
    await userEvent.click(screen.getByText(/Continue/i));

    await screen.findByText("Jennifer Anderson");
    await userEvent.click(screen.getByText(/Change Requester/i));

    expect(await screen.findByText(/Select Development Requester/i)).toBeInTheDocument();
    expect(localStorage.getItem("toktickit.selectedRequester")).toBeNull();
  });
});