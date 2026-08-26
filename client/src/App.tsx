import { useState } from "react";
import { checkSystem, Category } from "./api.js";
import { RequesterProvider, useRequester } from "./RequesterContext.js";
import RequesterSelection from "./RequesterSelection.js";

type UiState = "idle" | "loading" | "success" | "error";

function AppShell() {
  const { requester, changeRequester } = useRequester();
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCheck() {
    setState("loading");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }

  if (!requester) {
    return <RequesterSelection />;
  }

  return (
    <div>
      <nav className="navbar navbar-dark px-4" style={{ backgroundColor: "#006B3C" }}>
        <span className="navbar-brand mb-0 h1">TokTickIT</span>
        <div className="d-flex align-items-center text-white">
          <span className="me-3">{requester.name}</span>
          <button className="btn btn-sm btn-outline-light" onClick={changeRequester}>
            Change Requester
          </button>
        </div>
      </nav>

      <div className="container py-5" style={{ maxWidth: 640 }}>
        <h1 className="h3 mb-4">
          TokTickIT <span className="text-success">IT Service Desk</span>
        </h1>
        <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
          {state === "loading" ? "Loading…" : "Check System"}
        </button>
        {state === "loading" && <p className="mt-3">Loading…</p>}
        {state === "success" && (
          <div className="mt-3">
            <p className="text-success mb-2">System Status: Online</p>
            <p className="mb-1">Supported Request Categories</p>
            <ul>
              {categories.map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
          </div>
        )}
        {state === "error" && (
          <div className="mt-3 text-danger">
            <p className="mb-1">System Status: Offline</p>
            <p>Unable to connect to TokTickIT API — {errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <AppShell />
    </RequesterProvider>
  );
}