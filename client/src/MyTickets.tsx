import { useEffect, useState } from "react";
import { Category, TicketListItem, fetchCategories, fetchTickets } from "./api.js";
import { useRequester } from "./RequesterContext.js";

type LoadState = "loading" | "success" | "error";

interface Filters {
  search: string;
  categoryId: string;
  requestedPriority: string;
  itPriority: string;
  currentStatus: string;
}

const emptyFilters: Filters = {
  search: "",
  categoryId: "",
  requestedPriority: "",
  itPriority: "",
  currentStatus: "",
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-success-subtle text-success",
  MEDIUM: "bg-warning-subtle text-warning-emphasis",
  HIGH: "bg-danger-subtle text-danger",
};

interface Props {
  onCreateTicket: () => void;
}

// Issue 9 — My Tickets (Lab 2): search, filter, sort, paginate the current
// Requester's own Tickets.
export default function MyTickets({ onCreateTicket }: Props) {
  const { requester } = useRequester();
  const [state, setState] = useState<LoadState>("loading");
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasEverHadTickets, setHasEverHadTickets] = useState(true);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!requester) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requester, filters, sortBy, sortOrder, page, pageSize]);

  function load() {
    if (!requester) return;
    setState("loading");
    fetchTickets(requester.id, {
      search: filters.search || undefined,
      categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
      requestedPriority: filters.requestedPriority || undefined,
      itPriority: filters.itPriority || undefined,
      currentStatus: filters.currentStatus || undefined,
      sortBy,
      sortOrder,
      page,
      pageSize,
    })
      .then((res) => {
        setTickets(res.data);
        setTotalItems(res.meta.totalItems);
        setTotalPages(res.meta.totalPages);
        const noFiltersActive =
          !filters.search &&
          !filters.categoryId &&
          !filters.requestedPriority &&
          !filters.itPriority &&
          !filters.currentStatus;
        if (noFiltersActive) {
          setHasEverHadTickets(res.meta.totalItems > 0 || hasEverHadTickets);
        }
        setState("success");
      })
      .catch(() => setState("error"));
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setPage(1);
  }

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  const hasActiveFilters =
    filters.search ||
    filters.categoryId ||
    filters.requestedPriority ||
    filters.itPriority ||
    filters.currentStatus;

  const isEmptyAccount = state === "success" && totalItems === 0 && !hasActiveFilters;
  const isNoResults = state === "success" && totalItems === 0 && !!hasActiveFilters;

  return (
    <div className="container py-5" style={{ maxWidth: 1100 }}>
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-2">
        <div>
          <h1 className="h3 mb-1">My Tickets</h1>
          <p className="text-muted mb-0">View and track all of your support requests.</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
          <button className="btn btn-success" onClick={onCreateTicket}>
            + Create Ticket
          </button>
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <input
            className="form-control"
            placeholder="Search by ticket number or summary…"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
        </div>
        <div className="col-md-2">
          <select
            className="form-select"
            value={filters.categoryId}
            onChange={(e) => updateFilter("categoryId", e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <select
            className="form-select"
            value={filters.requestedPriority}
            onChange={(e) => updateFilter("requestedPriority", e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-md-2">
          <select
            className="form-select"
            value={filters.itPriority}
            onChange={(e) => updateFilter("itPriority", e.target.value)}
          >
            <option value="">IT Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-md-2">
          <select
            className="form-select"
            value={filters.currentStatus}
            onChange={(e) => updateFilter("currentStatus", e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
          </select>
        </div>
      </div>

      {state === "loading" && <p className="text-muted">Loading tickets…</p>}

      {state === "error" && (
        <div className="alert alert-danger">
          <p className="mb-2">Unable to load your tickets.</p>
          <button className="btn btn-sm btn-outline-danger" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {isEmptyAccount && (
        <div className="text-center py-5">
          <p className="text-muted mb-3">You haven't created any tickets yet.</p>
          <button className="btn btn-success" onClick={onCreateTicket}>
            Create Ticket
          </button>
        </div>
      )}

      {isNoResults && (
        <div className="text-center py-5">
          <p className="text-muted mb-3">No tickets match your filters.</p>
          <button className="btn btn-outline-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      )}

      {state === "success" && tickets.length > 0 && (
        <>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th role="button" onClick={() => toggleSort("ticketNumber")}>
                    Ticket No. {sortBy === "ticketNumber" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th role="button" onClick={() => toggleSort("createdAt")}>
                    Created Date {sortBy === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Summary</th>
                  <th>Category</th>
                  <th>Requested Priority</th>
                  <th>IT Priority</th>
                  <th>Current Status</th>
                  <th role="button" onClick={() => toggleSort("updatedAt")}>
                    Last Updated {sortBy === "updatedAt" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="fw-semibold">{t.ticketNumber}</td>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td>{t.summary}</td>
                    <td>{t.categoryName}</td>
                    <td>
                      <span className={`badge ${PRIORITY_BADGE[t.requestedPriority]}`}>
                        {t.requestedPriority}
                      </span>
                    </td>
                    <td>
                      {t.itPriority ? (
                        <span className={`badge ${PRIORITY_BADGE[t.itPriority]}`}>
                          {t.itPriority}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-secondary-subtle text-secondary-emphasis">
                        {t.currentStatus}
                      </span>
                    </td>
                    <td>{new Date(t.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted small">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalItems)} of{" "}
              {totalItems} tickets
            </span>
            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select form-select-sm w-auto"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                ← Previous
              </button>
              <span className="small">
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}