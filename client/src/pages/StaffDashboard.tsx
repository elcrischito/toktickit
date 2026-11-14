import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export interface QueueDrillDownFilter {
  status?: string;
  priority?: string;
  unassigned?: boolean;
  ownerId?: string;
}

interface StaffDashboardProps {
  onNavigateQueue: (filter?: QueueDrillDownFilter) => void;
  onSelectTicket: (ticketId: string) => void;
  onNavigateAdminUsers?: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  onNavigateQueue,
  onSelectTicket,
  onNavigateAdminUsers,
}) => {
  const { user, token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/staff", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load IT Staff dashboard.");
      } else {
        setData(json);
      }
    } catch {
      setError("Network error while loading dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = data?.metrics || {
    newCount: 0,
    openCount: 0,
    inProgressCount: 0,
    waitingForRequesterCount: 0,
    unassignedCount: 0,
    myAssignedCount: 0,
    highPriorityOpenCount: 0,
    myActionsCount: 0,
  };

  const cards = [
    { label: "New Tickets", count: metrics.newCount, accent: "#1b4332", filter: { status: "NEW" } },
    { label: "Open Tickets", count: metrics.openCount, accent: "#2d6a4f", filter: { status: "OPEN" } },
    { label: "In Progress", count: metrics.inProgressCount, accent: "#0b7a46", filter: { status: "IN_PROGRESS" } },
    { label: "Waiting for Requester", count: metrics.waitingForRequesterCount, accent: "#b45309", filter: { status: "WAITING_FOR_REQUESTER" } },
    { label: "Unassigned Queue", count: metrics.unassignedCount, accent: "#991b1b", filter: { unassigned: true } },
    { label: "My Assigned Tickets", count: metrics.myAssignedCount, accent: "#1b4332", filter: { ownerId: "me" } },
    { label: "High Priority Open", count: metrics.highPriorityOpenCount, accent: "#b91c1c", filter: { priority: "HIGH" } },
    { label: "My Actions Taken", count: metrics.myActionsCount, accent: "#40916c", filter: undefined },
  ];

  return (
    <div style={{ padding: "24px 16px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, color: "#1b4332", fontSize: 24 }}>
            {user?.role === "ADMIN" ? "Administrator & IT Operations Dashboard" : "IT Staff Operations Dashboard"}
          </h2>
          <p style={{ margin: "4px 0 0 0", color: "#495057", fontSize: 14 }}>
            Welcome back, <strong>{user?.fullName}</strong>. Click any metric card to drill down into the filtered queue.
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
            onClick={() => onNavigateQueue()}
            style={{ backgroundColor: "#1b4332", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
          >
            Open Full Queue
          </button>
          {user?.role === "ADMIN" && onNavigateAdminUsers && (
            <button
              type="button"
              onClick={onNavigateAdminUsers}
              style={{ backgroundColor: "#52b788", color: "#1b4332", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
            >
              Manage Users
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" style={{ padding: 12, marginBottom: 16, backgroundColor: "#f8d7da", color: "#721c24", borderRadius: 6 }}>
          {error}
        </div>
      )}

      {/* Operational Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 24 }}>
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onNavigateQueue(c.filter)}
            style={{
              textAlign: "left",
              backgroundColor: "#ffffff",
              border: "1px solid #dee2e6",
              borderLeft: `5px solid ${c.accent}`,
              borderRadius: 8,
              padding: 16,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: 13, color: "#495057", fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1b4332", marginTop: 6 }}>{c.count}</div>
            <div style={{ fontSize: 12, color: "#2d6a4f", marginTop: 4 }}>View filtered tickets →</div>
          </button>
        ))}

        {data?.userSummary && (
          <button
            type="button"
            onClick={() => onNavigateAdminUsers && onNavigateAdminUsers()}
            style={{
              textAlign: "left",
              backgroundColor: "#d8f3dc",
              border: "1px solid #95d5b2",
              borderLeft: "5px solid #1b4332",
              borderRadius: 8,
              padding: 16,
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 13, color: "#1b4332", fontWeight: 700 }}>Active System Users</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1b4332", marginTop: 6 }}>
              {data.userSummary.activeUsers} / {data.userSummary.totalUsers}
            </div>
            <div style={{ fontSize: 12, color: "#1b4332", marginTop: 4 }}>Open User Admin →</div>
          </button>
        )}
      </div>

      {/* Recent Tickets & My Recent Actions Taken */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #dee2e6", borderRadius: 8, padding: 20 }}>
          <h3 style={{ margin: "0 0 14px 0", fontSize: 17, color: "#1b4332" }}>Recent Active Tickets</h3>
          {!data?.recentTickets?.length ? (
            <p style={{ color: "#6c757d", fontSize: 14 }}>No active tickets in the queue.</p>
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
                  <div style={{ fontSize: 12, color: "#6c757d", marginTop: 4 }}>
                    Requester: {t.requester?.fullName} • Owner: {t.owner?.fullName || "Unassigned"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ backgroundColor: "#ffffff", border: "1px solid #dee2e6", borderRadius: 8, padding: 20 }}>
          <h3 style={{ margin: "0 0 14px 0", fontSize: 17, color: "#1b4332" }}>My Recent Actions Taken</h3>
          {!data?.myRecentActions?.length ? (
            <p style={{ color: "#6c757d", fontSize: 14 }}>No Actions Taken recorded or assigned to you yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.myRecentActions.map((a: any) => (
                <div
                  key={a.id}
                  onClick={() => a.ticket?.id && onSelectTicket(a.ticket.id)}
                  style={{ padding: 12, border: "1px solid #e9ecef", borderRadius: 6, cursor: "pointer", backgroundColor: "#f8f9fa" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <strong style={{ color: "#1b4332" }}>{a.ticket?.ticketNumber}</strong>
                    <span style={{ padding: "2px 8px", borderRadius: 4, backgroundColor: "#e9ecef", color: "#212529", fontWeight: 700 }}>{a.status}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#212529" }}>{a.description}</div>
                  <div style={{ fontSize: 12, color: "#495057", marginTop: 4 }}>Result: {a.result}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
