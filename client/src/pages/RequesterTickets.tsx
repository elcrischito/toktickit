import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface RequesterTicketsProps {
  onSelectTicket: (id: string) => void;
  onCreateNew: () => void;
  initialStatus?: string;
}

export const RequesterTickets: React.FC<RequesterTicketsProps> = ({ onSelectTicket, onCreateNew, initialStatus }) => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialStatus !== undefined) {
      setStatus(initialStatus);
    }
  }, [initialStatus]);

  const fetchMyTickets = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ search, status }).toString();
      const res = await fetch(`/api/tickets?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setTickets(data.tickets || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, [search, status]);

  return (
    <div style={{ padding: "24px 16px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h2 style={{ color: "#1b4332", margin: 0 }}>My Support Tickets</h2>
        <button
          onClick={onCreateNew}
          style={{ backgroundColor: "#1b4332", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}
        >
          + Create Ticket
        </button>
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
          <option value="OPEN_ALL">All Open / Active</option>
          <option value="NEW">New</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
          <option value="REOPENED">Reopened</option>
        </select>
      </div>

      {loading ? (
        <p>Loading your tickets...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#ffffff", border: "1px solid #e9ecef" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #e9ecef", textAlign: "left" }}>
                <th style={{ padding: 12 }}>Ticket No</th>
                <th style={{ padding: 12 }}>Summary</th>
                <th style={{ padding: 12 }}>Category</th>
                <th style={{ padding: 12 }}>Priority</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Owner</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#6c757d" }}>You have no tickets matching this filter.</td></tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket(t.id)}
                    style={{ borderBottom: "1px solid #e9ecef", cursor: "pointer" }}
                  >
                    <td style={{ padding: 12, fontWeight: "bold", color: "#1b4332", textDecoration: "underline" }}>{t.ticketNumber}</td>
                    <td style={{ padding: 12 }}>{t.summary}</td>
                    <td style={{ padding: 12 }}>{t.category?.name}</td>
                    <td style={{ padding: 12 }}>{t.requestedPriority}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ padding: "4px 8px", borderRadius: 4, backgroundColor: "#d1e7dd", color: "#0f5132", fontSize: 12, fontWeight: "bold" }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>{t.owner?.fullName || "Unassigned"}</td>
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
