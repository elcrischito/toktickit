import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface RequesterTicketsProps {
  onSelectTicket: (id: string) => void;
  onCreateNew: () => void;
  initialStatus?: string;
}

interface Category {
  id: string;
  name: string;
}

const PAGE_SIZES = [10, 25, 50]; // BR-20

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_REQUESTER: "Waiting for Requester",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
};

// Text label + colour, contrast >= 4.5:1 (UI spec: never colour alone)
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  NEW: { bg: "#cfe2ff", fg: "#084298" },
  OPEN: { bg: "#d8f3dc", fg: "#1b4332" },
  IN_PROGRESS: { bg: "#fff3cd", fg: "#664d03" },
  WAITING_FOR_REQUESTER: { bg: "#ffe5d0", fg: "#842029" },
  RESOLVED: { bg: "#d1e7dd", fg: "#0f5132" },
  CLOSED: { bg: "#e2e3e5", fg: "#41464b" },
  REOPENED: { bg: "#f8d7da", fg: "#842029" },
  CANCELLED: { bg: "#e2e3e5", fg: "#41464b" },
};

const fieldStyle: React.CSSProperties = { padding: 10, borderRadius: 4, border: "1px solid #ccc" };
const srOnly: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", border: 0,
};

export const RequesterTickets: React.FC<RequesterTicketsProps> = ({ onSelectTicket, onCreateNew, initialStatus }) => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus || "");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialStatus !== undefined) {
      setStatus(initialStatus);
      setPage(1);
    }
  }, [initialStatus]);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  const hasFilters = Boolean(search || status || categoryId || priority);

  const fetchMyTickets = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (categoryId) params.set("categoryId", categoryId);
      if (priority) params.set("priority", priority);
      const res = await fetch(`/api/tickets?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setTickets(data.tickets || []);
      setTotal(data.total ?? (data.tickets || []).length);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      // BR-22: safe error state with Retry, never a blank screen
      setError("Unable to load your tickets. Please check your connection and try again.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, categoryId, priority, page, pageSize]);

  // Any filter change goes back to page 1
  const onFilter = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setCategoryId("");
    setPriority("");
    setPage(1);
  };

  const renderBody = () => {
    if (loading) return <p>Loading your tickets...</p>;

    if (error) {
      return (
        <div role="alert" style={{ padding: 16, backgroundColor: "#f8d7da", color: "#721c24", borderRadius: 4 }}>
          {error}{" "}
          <button type="button" onClick={fetchMyTickets} style={{ marginLeft: 8, padding: "6px 12px" }}>
            Retry
          </button>
        </div>
      );
    }

    if (tickets.length === 0 && !hasFilters) {
      return (
        <div style={{ padding: 32, textAlign: "center", backgroundColor: "#ffffff", border: "1px solid #e9ecef", borderRadius: 8 }}>
          <p style={{ color: "#6c757d", marginTop: 0 }}>You haven't created any tickets yet.</p>
          <button
            type="button"
            onClick={onCreateNew}
            style={{ backgroundColor: "#1b4332", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}
          >
            Create your first ticket
          </button>
        </div>
      );
    }

    if (tickets.length === 0) {
      return (
        <div style={{ padding: 24, textAlign: "center", color: "#6c757d", backgroundColor: "#ffffff", border: "1px solid #e9ecef", borderRadius: 8 }}>
          No tickets match your search or filters.{" "}
          <button type="button" onClick={resetFilters} style={{ marginLeft: 8, padding: "6px 12px" }}>
            Clear filters
          </button>
        </div>
      );
    }

    return (
      <>
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
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => onSelectTicket(t.id)}
                  style={{ borderBottom: "1px solid #e9ecef", cursor: "pointer" }}
                >
                  <td style={{ padding: 12 }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSelectTicket(t.id); }}
                      style={{ background: "none", border: "none", padding: 0, fontWeight: "bold", color: "#1b4332", textDecoration: "underline", cursor: "pointer" }}
                    >
                      {t.ticketNumber}
                    </button>
                  </td>
                  <td style={{ padding: 12 }}>{t.summary}</td>
                  <td style={{ padding: 12 }}>{t.category?.name}</td>
                  <td style={{ padding: 12 }}>{t.requestedPriority}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{ padding: "4px 8px", borderRadius: 4, backgroundColor: (STATUS_COLORS[t.status] || STATUS_COLORS.CLOSED).bg, color: (STATUS_COLORS[t.status] || STATUS_COLORS.CLOSED).fg, fontSize: 12, fontWeight: "bold", whiteSpace: "nowrap" }}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>{t.owner?.fullName || "Unassigned"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <nav aria-label="Pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
          <span style={{ color: "#6c757d", fontSize: 14 }}>
            {total} ticket{total === 1 ? "" : "s"} · Page {page} of {totalPages}
          </span>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label htmlFor="page-size" style={{ fontSize: 14 }}>Per page</label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} style={{ padding: "6px 12px" }}>
              Previous
            </button>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} style={{ padding: "6px 12px" }}>
              Next
            </button>
          </span>
        </nav>
      </>
    );
  };

  return (
    <div style={{ padding: "24px 16px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h2 style={{ color: "#1b4332", margin: 0 }}>My Support Tickets</h2>
        <button
          type="button"
          onClick={onCreateNew}
          style={{ backgroundColor: "#1b4332", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}
        >
          + Create Ticket
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <label htmlFor="ticket-search" style={srOnly}>Search tickets</label>
        <input
          id="ticket-search"
          type="text"
          placeholder="Search ticket # or summary..."
          value={search}
          onChange={onFilter(setSearch)}
          style={{ ...fieldStyle, flex: 1, minWidth: 200 }}
        />
        <label htmlFor="filter-status" style={srOnly}>Status</label>
        <select id="filter-status" value={status} onChange={onFilter(setStatus)} style={fieldStyle}>
          <option value="">All Statuses</option>
          <option value="OPEN_ALL">All Open / Active</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <label htmlFor="filter-category" style={srOnly}>Category</label>
        <select id="filter-category" value={categoryId} onChange={onFilter(setCategoryId)} style={fieldStyle}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label htmlFor="filter-priority" style={srOnly}>Priority</label>
        <select id="filter-priority" value={priority} onChange={onFilter(setPriority)} style={fieldStyle}>
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>

      {renderBody()}
    </div>
  );
};
