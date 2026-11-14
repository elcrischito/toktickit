import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { QueueDrillDownFilter } from "./StaffDashboard";

interface StaffQueueProps {
  onSelectTicket?: (id: string) => void;
  initialFilter?: QueueDrillDownFilter;
}

export const StaffQueue: React.FC<StaffQueueProps> = ({ onSelectTicket, initialFilter }) => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialFilter?.status || "");
  const [priority, setPriority] = useState(initialFilter?.priority || "");
  const [unassigned, setUnassigned] = useState(Boolean(initialFilter?.unassigned));
  const [ownerId, setOwnerId] = useState(initialFilter?.ownerId || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialFilter) {
      setStatus(initialFilter.status || "");
      setPriority(initialFilter.priority || "");
      setUnassigned(Boolean(initialFilter.unassigned));
      setOwnerId(initialFilter.ownerId || "");
    }
  }, [initialFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { search, status, priority };
      if (unassigned) params.unassigned = "true";
      if (ownerId) params.ownerId = ownerId;
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`/api/staff/tickets?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setTickets(data.tickets || []);
    } catch (err) {
      console.error("Failed to load queue", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [search, status, priority, unassigned, ownerId]);

  const hasActiveFilter = Boolean(search || status || priority || unassigned || ownerId);

  return (
    <div style={{ padding: "24px 16px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h2 style={{ color: "#1b4332", margin: 0 }}>IT Staff Ticket Queue</h2>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("");
              setPriority("");
              setUnassigned(false);
              setOwnerId("");
            }}
            style={{ backgroundColor: "#ffffff", border: "1px solid #1b4332", color: "#1b4332", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            Reset Filters
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search ticket # or summary..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }}>
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
          <option value="REOPENED">Reopened</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }}>
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
          <input type="checkbox" checked={unassigned} onChange={(e) => setUnassigned(e.target.checked)} />
          Unassigned Only
        </label>
      </div>

      {loading ? (
        <p>Loading queue...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#ffffff", border: "1px solid #e9ecef" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #e9ecef", textAlign: "left" }}>
                <th style={{ padding: 12 }}>Ticket No</th>
                <th style={{ padding: 12 }}>Summary</th>
                <th style={{ padding: 12 }}>Category</th>
                <th style={{ padding: 12 }}>IT Priority</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Requester</th>
                <th style={{ padding: 12 }}>Owner</th>
                <th style={{ padding: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: "#6c757d" }}>No tickets found</td></tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket && onSelectTicket(t.id)}
                    style={{ borderBottom: "1px solid #e9ecef", cursor: "pointer" }}
                  >
                    <td style={{ padding: 12, fontWeight: "bold", color: "#1b4332", textDecoration: "underline" }}>{t.ticketNumber}</td>
                    <td style={{ padding: 12 }}>{t.summary}</td>
                    <td style={{ padding: 12 }}>{t.category?.name}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ padding: "4px 8px", borderRadius: 4, backgroundColor: t.itPriority === "HIGH" ? "#f8d7da" : "#e2e3e5", color: t.itPriority === "HIGH" ? "#721c24" : "#383d41", fontSize: 12, fontWeight: "bold" }}>
                        {t.itPriority}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{ padding: "4px 8px", borderRadius: 4, backgroundColor: "#d1e7dd", color: "#0f5132", fontSize: 12, fontWeight: "bold" }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>{t.requester?.fullName}</td>
                    <td style={{ padding: 12 }}>{t.owner?.fullName || "Unassigned"}</td>
                    <td style={{ padding: 12 }}>{t._count?.actionsTaken ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
