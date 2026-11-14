import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface RequesterDashboardProps {
  onNavigateMyTickets: (statusFilter?: string) => void;
  onCreateTicket: () => void;
  onSelectTicket: (ticketId: string) => void;
}

export const RequesterDashboard: React.FC<RequesterDashboardProps> = ({
  onNavigateMyTickets,
  onCreateTicket,
  onSelectTicket,
}) => {
  const { user, token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/requester", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load your dashboard.");
      } else {
        setData(json);
      }
    } catch {
      setError("Network error while loading your dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = data?.metrics || {
    myOpenCount: 0,
    inProgressCount: 0,
    waitingForMeCount: 0,
    resolvedCount: 0,
    closedCount: 0,
  };

  const cards = [
    { label: "My Open Tickets", count: metrics.myOpenCount, accent: "#1b4332", filter: "OPEN_ALL" },
    { label: "In Progress", count: metrics.inProgressCount, accent: "#2d6a4f", filter: "IN_PROGRESS" },
    { label: "Waiting for Me", count: metrics.waitingForMeCount, accent: "#b45309", filter: "WAITING_FOR_REQUESTER" },
    { label: "Resolved", count: metrics.resolvedCount, accent: "#0b7a46", filter: "RESOLVED" },
    { label: "Closed", count: metrics.closedCount, accent: "#495057", filter: "CLOSED" },
  ];

  return (
    <div style={{ padding: "24px 16px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, color: "#1b4332", fontSize: 24 }}>My Support Dashboard</h2>
          <p style={{ margin: "4px 0 0 0", color: "#495057", fontSize: 14 }}>
            Hello <strong>{user?.fullName}</strong>, track your IT requests and view actions taken by support staff.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            style={{ backgroundColor: "#ffffff", color: "#1b4332", border: "1px solid #1b4332", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={onCreateTicket}
            style={{ backgroundColor: "#1b4332", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
          >
            + Create New Ticket
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ padding: 12, marginBottom: 16, backgroundColor: "#f8d7da", color: "#721c24", borderRadius: 6 }}>
          {error}
        </div>
      )}

      {/* Personal Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, marginBottom: 24 }}>
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onNavigateMyTickets(c.filter)}
            style={{
              textAlign: "left",
              backgroundColor: "#ffffff",
              border: "1px solid #dee2e6",
              borderLeft: `5px solid ${c.accent}`,
              borderRadius: 8,
              padding: 16,
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 13, color: "#495057", fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1b4332", marginTop: 6 }}>{c.count}</div>
            <div style={{ fontSize: 12, color: "#2d6a4f", marginTop: 4 }}>View tickets →</div>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Needs Your Attention */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #dee2e6", borderRadius: 8, padding: 20 }}>
          <h3 style={{ margin: "0 0 14px 0", fontSize: 17, color: "#1b4332" }}>Needs Your Attention</h3>
          {!data?.attentionTickets?.length ? (
            <p style={{ color: "#6c757d", fontSize: 14 }}>No tickets currently waiting on your response or confirmation.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.attentionTickets.map((t: any) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTicket(t.id)}
                  style={{ padding: 12, border: "1px solid #f0e1a0", borderRadius: 6, cursor: "pointer", backgroundColor: "#fffdf5" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <strong style={{ color: "#1b4332" }}>{t.ticketNumber}</strong>
                    <span style={{ padding: "2px 8px", borderRadius: 4, backgroundColor: "#fef3c7", color: "#92400e", fontWeight: 700 }}>{t.status}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#212529" }}>{t.summary}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Recent Tickets */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #dee2e6", borderRadius: 8, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17, color: "#1b4332" }}>My Recent Tickets</h3>
            <button
              type="button"
              onClick={() => onNavigateMyTickets("")}
              style={{ background: "none", border: "none", color: "#1b4332", textDecoration: "underline", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              View All
            </button>
          </div>
          {!data?.recentTickets?.length ? (
            <p style={{ color: "#6c757d", fontSize: 14 }}>You have not submitted any tickets yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.recentTickets.map((t: any) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTicket(t.id)}
                  style={{ padding: 12, border: "1px solid #e9ecef", borderRadius: 6, cursor: "pointer", backgroundColor: "#f8f9fa" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <strong style={{ color: "#1b4332" }}>{t.ticketNumber}</strong>
                    <span style={{ padding: "2px 8px", borderRadius: 4, backgroundColor: "#d8f3dc", color: "#1b4332", fontWeight: 700 }}>{t.status}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#212529" }}>{t.summary}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
