import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export const StaffQueue: React.FC = () => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ search, status, priority }).toString();
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
  }, [search, status, priority]);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h2 style={{ color: "#1b4332", marginBottom: 20 }}>IT Staff Ticket Queue</h2>
      
      {/* Search and Filters */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search ticket # or summary..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }}>
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }}>
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>

      {/* Ticket Table */}
      {loading ? (
        <p>Loading queue...</p>
      ) : (
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
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#6c757d" }}>No tickets found</td></tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #e9ecef" }}>
                  <td style={{ padding: 12, fontWeight: "bold", color: "#1b4332" }}>{t.ticketNumber}</td>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
