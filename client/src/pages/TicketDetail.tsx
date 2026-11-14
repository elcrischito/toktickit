import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ActionsTakenSection, ActionTakenItem } from "../components/ActionsTakenSection";

interface TicketDetailProps {
  ticketId: string;
  onBack: () => void;
}

const ALLOWED_STAFF_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["OPEN", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CLOSED: ["REOPENED"],
  CANCELLED: [],
};

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticketId, onBack }) => {
  const { user, token } = useAuth();
  const isStaff = user?.role === "IT_STAFF" || user?.role === "ADMIN";

  const [ticket, setTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [actions, setActions] = useState<ActionTakenItem[]>([]);

  const [ownerId, setOwnerId] = useState("");
  const [itPriority, setItPriority] = useState("MEDIUM");
  const [status, setStatus] = useState("NEW");
  const [resolutionSummary, setResolutionSummary] = useState("");

  const [newComment, setNewComment] = useState("");
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingStaff, setSavingStaff] = useState(false);
  const [error, setError] = useState("");
  const [workflowError, setWorkflowError] = useState("");
  const [feedback, setFeedback] = useState("");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const ticketRes = await fetch(`/api/tickets/${ticketId}`, { headers });
      if (!ticketRes.ok) {
        setError("Ticket not found or access denied.");
        setLoading(false);
        return;
      }
      const ticketData = await ticketRes.json();
      setTicket(ticketData);
      setOwnerId(ticketData.ownerId || "");
      setItPriority(ticketData.itPriority || "MEDIUM");
      setStatus(ticketData.status || "NEW");
      setResolutionSummary(ticketData.resolutionSummary || "");

      const [commentsRes, actionsRes] = await Promise.all([
        fetch(`/api/tickets/${ticketId}/comments`, { headers }),
        fetch(`/api/tickets/${ticketId}/actions`, { headers }),
      ]);
      if (commentsRes.ok) {
        const cData = await commentsRes.json();
        if (Array.isArray(cData)) setComments(cData);
      }
      if (actionsRes.ok) {
        const aData = await actionsRes.json();
        if (Array.isArray(aData?.actions)) setActions(aData.actions);
      }

      if (isStaff) {
        const [notesRes, agentsRes] = await Promise.all([
          fetch(`/api/tickets/${ticketId}/notes`, { headers }),
          fetch(`/api/staff/tickets/agents`, { headers }),
        ]);
        if (notesRes.ok) {
          const nData = await notesRes.json();
          if (Array.isArray(nData)) setNotes(nData);
        }
        if (agentsRes.ok) {
          const agData = await agentsRes.json();
          if (Array.isArray(agData)) setAgents(agData);
        }
      }
    } catch {
      setError("Network error while loading ticket.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [ticketId]);

  const handleSaveStaffUpdates = async (overrideOwnerId?: string) => {
    setFeedback("");
    setWorkflowError("");
    const targetOwner = overrideOwnerId !== undefined ? overrideOwnerId : ownerId;

    if (status === "RESOLVED" && !resolutionSummary.trim()) {
      setWorkflowError("Resolution Summary is required before marking a Ticket as Resolved.");
      return;
    }

    setSavingStaff(true);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          ownerId: targetOwner || null,
          itPriority,
          status,
          resolutionSummary: resolutionSummary.trim(),
          version: ticket.version,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setWorkflowError(data.error || "Conflict: Ticket was modified concurrently. Reloading latest state...");
        loadAll();
      } else if (!res.ok) {
        setWorkflowError(data.error || "Failed to update ticket.");
      } else {
        setTicket(data);
        setOwnerId(data.ownerId || "");
        setStatus(data.status);
        setResolutionSummary(data.resolutionSummary || "");
        setFeedback("Ticket updated successfully.");
      }
    } catch {
      setWorkflowError("Network error while saving changes.");
    } finally {
      setSavingStaff(false);
    }
  };

  const handleClaim = () => {
    if (!user) return;
    setOwnerId(user.id);
    handleSaveStaffUpdates(user.id);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const res = await fetch(`/api/tickets/${ticketId}/comments`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: newComment }),
    });
    if (res.ok) {
      const created = await res.json();
      setComments((prev) => [...prev, created]);
      setNewComment("");
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const res = await fetch(`/api/tickets/${ticketId}/notes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: newNote }),
    });
    if (res.ok) {
      const created = await res.json();
      setNotes((prev) => [...prev, created]);
      setNewNote("");
    }
  };

  const handleAppearsResolved = async () => {
    setFeedback("");
    const res = await fetch(`/api/tickets/${ticketId}/problem-resolved`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.comment) setComments((prev) => [...prev, data.comment]);
      setFeedback("IT Staff has been notified that the problem appears resolved.");
    }
  };

  const handleReopen = async () => {
    setFeedback("");
    setWorkflowError("");
    const res = await fetch(`/api/tickets/${ticketId}/reopen`, {
      method: "POST",
      headers,
    });
    const data = await res.json();
    if (!res.ok) {
      setWorkflowError(data.error || "Unable to reopen ticket.");
    } else {
      setFeedback("Ticket has been reopened.");
      loadAll();
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading ticket details...</div>;
  if (error || !ticket) {
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <button onClick={onBack} style={{ marginBottom: 16, padding: "8px 14px", borderRadius: 4, border: "1px solid #ccc", cursor: "pointer" }}>
          ← Back
        </button>
        <div style={{ padding: 16, backgroundColor: "#f8d7da", color: "#721c24", borderRadius: 4 }}>
          {error || "Ticket not found."}
        </div>
      </div>
    );
  }

  const permittedNextStatuses = ALLOWED_STAFF_TRANSITIONS[ticket.status] || [];
  const availableStatusOptions = Array.from(new Set([ticket.status, ...permittedNextStatuses]));

  return (
    <div style={{ padding: "24px 16px", maxWidth: 1100, margin: "0 auto" }}>
      <button onClick={onBack} style={{ marginBottom: 16, padding: "8px 14px", borderRadius: 4, border: "1px solid #1b4332", backgroundColor: "#fff", color: "#1b4332", cursor: "pointer", fontWeight: "bold" }}>
        ← {isStaff ? "Back to Queue" : "Back to My Tickets"}
      </button>

      {feedback && (
        <div style={{ padding: 12, marginBottom: 16, backgroundColor: "#d1e7dd", color: "#0f5132", borderRadius: 4 }}>
          {feedback}
        </div>
      )}

      {/* Ticket Header & Metadata Card */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #dee2e6", borderRadius: 8, padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: "bold", color: "#1b4332" }}>{ticket.ticketNumber}</span>
            <h2 style={{ margin: "4px 0 0 0", color: "#1F2A24" }}>{ticket.summary}</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ padding: "4px 10px", borderRadius: 4, backgroundColor: "#e2e3e5", fontSize: 12, fontWeight: "bold" }}>
              IT Priority: {ticket.itPriority}
            </span>
            <span style={{ padding: "4px 10px", borderRadius: 4, backgroundColor: "#d1e7dd", color: "#0f5132", fontSize: 12, fontWeight: "bold" }}>
              {ticket.status}
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, padding: "16px 0", borderTop: "1px solid #eee", borderBottom: "1px solid #eee", marginBottom: 16 }}>
          <div><small style={{ color: "#6c757d" }}>Category</small><div style={{ fontWeight: 600 }}>{ticket.category?.name}</div></div>
          <div><small style={{ color: "#6c757d" }}>Related System</small><div style={{ fontWeight: 600 }}>{ticket.relatedSystem?.name || "—"}</div></div>
          <div><small style={{ color: "#6c757d" }}>Requester</small><div style={{ fontWeight: 600 }}>{ticket.requester?.fullName}</div></div>
          <div><small style={{ color: "#6c757d" }}>Assigned Owner</small><div style={{ fontWeight: 600 }}>{ticket.owner?.fullName || "Unassigned"}</div></div>
          <div><small style={{ color: "#6c757d" }}>Requested Priority</small><div style={{ fontWeight: 600 }}>{ticket.requestedPriority}</div></div>
          <div><small style={{ color: "#6c757d" }}>Created</small><div style={{ fontWeight: 600 }}>{new Date(ticket.createdAt).toLocaleString()}</div></div>
        </div>

        <div>
          <small style={{ color: "#6c757d", display: "block", marginBottom: 4 }}>Description</small>
          <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "#1F2A24" }}>{ticket.description}</p>
        </div>

        {ticket.resolutionSummary && (
          <div style={{ marginTop: 16, padding: 14, backgroundColor: "#d8f3dc", borderRadius: 6, borderLeft: "4px solid #1b4332" }}>
            <strong style={{ color: "#1b4332", display: "block", marginBottom: 4 }}>Resolution Summary</strong>
            <span style={{ color: "#1F2A24", fontSize: 14 }}>{ticket.resolutionSummary}</span>
          </div>
        )}

        {/* Requester Advisory Resolution & Reopen Controls (BR-06, BR-07) */}
        {!isStaff && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #eee", display: "flex", gap: 12, flexWrap: "wrap" }}>
            {!["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.status) && (
              <button
                type="button"
                onClick={handleAppearsResolved}
                style={{ backgroundColor: "#1b4332", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}
              >
                Problem Appears Resolved
              </button>
            )}
            {ticket.status === "RESOLVED" && (
              <button
                type="button"
                onClick={handleReopen}
                style={{ backgroundColor: "#b45309", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}
              >
                Reopen Ticket
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions Taken Section (Visible to Requester owner read-only & IT Staff/Admin read/write) */}
      <ActionsTakenSection
        ticketId={ticketId}
        token={token}
        isStaff={isStaff}
        actions={actions}
        agents={agents}
        onActionCreated={(created) => setActions((prev) => [...prev, created])}
        onActionUpdated={(updated) => setActions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))}
        onRefreshAll={loadAll}
      />

      {/* IT Staff Workflow Controls */}
      {isStaff && (
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #dee2e6", borderRadius: 8, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: "#1b4332" }}>IT Staff Triage & Workflow</h3>
            {ticket.ownerId !== user?.id && (
              <button
                type="button"
                onClick={handleClaim}
                style={{ backgroundColor: "#0B7A46", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}
              >
                Claim Ticket
              </button>
            )}
          </div>

          {workflowError && (
            <div role="alert" style={{ padding: 10, marginBottom: 14, backgroundColor: "#f8d7da", color: "#721c24", borderRadius: 4, fontSize: 13 }}>
              {workflowError}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
            <div>
              <label htmlFor="ticket-owner-select" style={{ display: "block", fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>Assigned Owner</label>
              <select id="ticket-owner-select" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}>
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.fullName} ({a.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ticket-priority-select" style={{ display: "block", fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>IT Priority</label>
              <select id="ticket-priority-select" value={itPriority} onChange={(e) => setItPriority(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>

            <div>
              <label htmlFor="ticket-status-select" style={{ display: "block", fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>Status (Permitted Transitions)</label>
              <select id="ticket-status-select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}>
                {availableStatusOptions.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          {(status === "RESOLVED" || resolutionSummary) && (
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="ticket-resolution-summary" style={{ display: "block", fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>
                Resolution Summary {status === "RESOLVED" ? "*" : ""}
              </label>
              <textarea
                id="ticket-resolution-summary"
                rows={2}
                placeholder="Summarize the final fix applied for the Requester..."
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
              />
            </div>
          )}

          <button
            type="button"
            disabled={savingStaff}
            onClick={() => handleSaveStaffUpdates()}
            style={{ backgroundColor: "#1b4332", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}
          >
            {savingStaff ? "Saving..." : "Save Ticket Updates"}
          </button>
        </div>
      )}

      {/* Communication Grid: Public Comments + Staff-Only Internal Notes */}
      <div style={{ display: "grid", gridTemplateColumns: isStaff ? "repeat(auto-fit, minmax(320px, 1fr))" : "1fr", gap: 20 }}>
        {/* Public Comments */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #dee2e6", borderRadius: 8, padding: 20 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 17, color: "#1b4332" }}>Public Comments ({comments.length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, maxHeight: 300, overflowY: "auto" }}>
            {comments.length === 0 ? (
              <p style={{ color: "#6c757d", fontSize: 14 }}>No public comments yet.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} style={{ padding: 12, backgroundColor: "#f8f9fa", borderRadius: 6, border: "1px solid #e9ecef" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <strong>{c.author?.fullName} ({c.author?.role})</strong>
                    <span style={{ color: "#6c757d" }}>{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 14 }}>{c.content}</div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleAddComment}>
            <textarea
              rows={3}
              placeholder="Write a public comment visible to the requester..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc", marginBottom: 8 }}
            />
            <button type="submit" style={{ backgroundColor: "#1b4332", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
              Post Public Comment
            </button>
          </form>
        </div>

        {/* Internal Notes (IT Staff & Admin ONLY) */}
        {isStaff && (
          <div style={{ backgroundColor: "#fffdf5", border: "1px solid #f0e1a0", borderRadius: 8, padding: 20 }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: 17, color: "#7c5800" }}>Internal Notes ({notes.length})</h3>
            <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "#8a6d3b" }}>Private to IT Staff & Administrators (hidden from Requesters).</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, maxHeight: 300, overflowY: "auto" }}>
              {notes.length === 0 ? (
                <p style={{ color: "#8a6d3b", fontSize: 14 }}>No internal notes yet.</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} style={{ padding: 12, backgroundColor: "#ffffff", borderRadius: 6, border: "1px solid #f0e1a0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <strong>{n.author?.fullName} ({n.author?.role})</strong>
                      <span style={{ color: "#6c757d" }}>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 14 }}>{n.content}</div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleAddNote}>
              <textarea
                rows={3}
                placeholder="Add an append-only internal troubleshooting note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #d6c37e", marginBottom: 8 }}
              />
              <button type="submit" style={{ backgroundColor: "#7c5800", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
                Add Internal Note
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
