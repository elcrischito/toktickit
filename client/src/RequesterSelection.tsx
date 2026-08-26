import { useEffect, useState } from "react";
import { DevRequester, fetchDevRequesters } from "./api.js";
import { useRequester } from "./RequesterContext.js";

type LoadState = "loading" | "success" | "empty" | "error";

export default function RequesterSelection() {
  const { selectRequester } = useRequester();
  const [requesters, setRequesters] = useState<DevRequester[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loadState, setLoadState] = useState<LoadState>("loading");

  function load() {
    setLoadState("loading");
    fetchDevRequesters()
      .then((data) => {
        setRequesters(data);
        setLoadState(data.length === 0 ? "empty" : "success");
      })
      .catch(() => setLoadState("error"));
  }

  useEffect(() => {
    load();
  }, []);

  function handleContinue() {
    const found = requesters.find((r) => String(r.id) === selectedId);
    if (found) {
      selectRequester(found);
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <div className="card shadow-sm">
        <div className="card-body p-4 text-center">
          <div
            className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
            style={{ width: 56, height: 56, backgroundColor: "#EAF6EF" }}
          >
            <span style={{ fontSize: 24 }}>👤</span>
          </div>
          <h1 className="h4 mb-2">Select Development Requester</h1>
          <p className="text-muted small mb-4">
            Choose a development requester to simulate the current requester context for
            Lab&nbsp;2. This is for testing only and is not a login screen.
          </p>

          {loadState === "loading" && (
            <div className="mb-3">
              <div className="placeholder-glow">
                <span className="placeholder col-12" style={{ height: 40, display: "block" }} />
              </div>
            </div>
          )}

          {loadState === "success" && (
            <div className="mb-3 text-start">
              <label htmlFor="requester-select" className="form-label fw-semibold">
                Development Requester <span className="text-danger">*</span>
              </label>
              <select
                id="requester-select"
                className="form-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="" disabled>
                  Choose a requester…
                </option>
                {requesters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <div className="alert alert-success py-2 px-3 mt-3 small mb-0">
                Only active development requesters are shown.
              </div>
            </div>
          )}

          {loadState === "empty" && (
            <div className="alert alert-warning small text-start">
              No active development requesters are available. Contact an administrator.
            </div>
          )}

          {loadState === "error" && (
            <div className="alert alert-danger small text-start">
              <p className="mb-2">Unable to load development requesters.</p>
              <button className="btn btn-sm btn-outline-danger" onClick={load}>
                Retry
              </button>
            </div>
          )}

          <div className="bg-light rounded p-3 mt-3 mb-4 text-start small text-muted">
            <strong>Authentication coming in Lab 3</strong>
            <br />
            In Lab 3, this selection will be replaced with secure authentication so you can
            access the system with your own account.
          </div>

          <button
            className="btn btn-success w-100"
            disabled={loadState !== "success" || !selectedId}
            onClick={handleContinue}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}