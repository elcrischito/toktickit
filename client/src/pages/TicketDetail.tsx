import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface TicketDetailProps {
  ticketId: string;
  onBack: () => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticketId, onBack }) => {
  const { user, token } = useAuth();
  const isStaff = user?.role === "IT_STAFF" || user?.role === "ADMIN";

  const [ticket, setTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  const [ownerId, setOwnerId] = useState("");
  const [itPriority, setItPriority] = useState("MEDIUM");
  const [status, setStatus] = useState("NEW");

  const [newComment, setNewComment] = useState("");
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

      const commentsRes = await fetch(`/api/tickets/${ticketId}/comments`, { headers });
      if (commentsRes.ok) setComments(await commentsRes.json());

      if (isStaff) {
        const [notesRes, agentsRes] = await Promise.all([
          fetch(`/api/tickets/${ticketId}/notes`, { headers }),
          fetch(`/api/staff/tickets/agents`, { headers }),
        ]);
        if (notesRes.ok) setNotes(await notesRes.json());
        if (agentsRes.ok) setAgents(await agentsRes.json());
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
    const targetOwner = overrideOwnerId !== undefined ? overrideOwnerId : ownerId;
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          ownerId: targetOwner || null,
          itPriority,
          status,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTicket(updated);
        setOwnerId(updated.ownerId || "");
        setFeedback("Ticket updated successfully.");
      } else {
        setError("Failed to update ticket.");
      }
    } catch {
      setError("Network error while saving changes.");
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

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
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

        {/* Requester Action (BR-05) */}
        {!isStaff && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #eee" }}>
            <button
              onClick={handleAppearsResolved}
              style={{ backgroundColor: "#1b4332", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}
            >
              Problem Appears Resolved
            </button>
          </div>
        )}
      </div>

      {/* IT Staff Workflow Controls */}
      {isStaff && (
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #dee2e6", borderRadius: 8, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: "#1b4332" }}>IT Staff Triage & Workflow</h3>
            {ticket.ownerId !== user?.id && (
              <button
                onClick={handleClaim}
                style={{ backgroundColor: "#0B7A46", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}
              >
                Claim Ticket
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>Assigned Owner</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}>
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.fullName} ({a.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>IT Priority</label>
              <select value={itPriority} onChange={(e) => setItPriority(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}>
                <option value="NEW">NEW</option>
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="WAITING_FOR_REQUESTER">WAITING_FOR_REQUESTER</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
                <option value="REOPENED">REOPENED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => handleSaveStaffUpdates()}
            style={{ backgroundColor: "#1b4332", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}
          >
            Save Ticket Updates
          </button>
        </div>
      )}

      {/* Communication Grid: Public Comments + Staff-Only Internal Notes */}
      <div style={{ display: "grid", gridTemplateColumns: isStaff ? "1fr 1fr" : "1fr", gap: 20 }}>
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
