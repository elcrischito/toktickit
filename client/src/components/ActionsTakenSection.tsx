import React, { useState } from "react";

export interface ActionTakenItem {
  id: string;
  ticketId: string;
  actionDateTime: string;
  description: string;
  result: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  performedById: string;
  performedBy?: { id: string; fullName: string; role: string };
  assignedToId?: string | null;
  assignedTo?: { id: string; fullName: string; role: string; isActive: boolean } | null;
  followUpRequired: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
  version: number;
}

interface ActionsTakenSectionProps {
  ticketId: string;
  token: string | null;
  isStaff: boolean;
  actions: ActionTakenItem[];
  agents: Array<{ id: string; fullName: string; role: string }>;
  onActionCreated: (action: ActionTakenItem) => void;
  onActionUpdated: (action: ActionTakenItem) => void;
  onRefreshAll: () => void;
}

const toLocalDatetimeInput = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const statusBadgeStyle = (status: string): React.CSSProperties => {
  switch (status) {
    case "COMPLETED":
      return { backgroundColor: "#d8f3dc", color: "#1b4332" };
    case "IN_PROGRESS":
      return { backgroundColor: "#dbeafe", color: "#1e40af" };
    case "PLANNED":
      return { backgroundColor: "#fef3c7", color: "#92400e" };
    case "CANCELLED":
    default:
      return { backgroundColor: "#f3f4f6", color: "#4b5563" };
  }
};

export const ActionsTakenSection: React.FC<ActionsTakenSectionProps> = ({
  ticketId,
  token,
  isStaff,
  actions,
  agents,
  onActionCreated,
  onActionUpdated,
  onRefreshAll,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionDateTime, setActionDateTime] = useState(() => toLocalDatetimeInput());
  const [description, setDescription] = useState("");
  const [result, setResult] = useState("");
  const [status, setStatus] = useState<"PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED">("COMPLETED");
  const [assignedToId, setAssignedToId] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNote, setFollowUpNote] = useState("");
  const [attachmentNotes, setAttachmentNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDateTime, setEditDateTime] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editResult, setEditResult] = useState("");
  const [editStatus, setEditStatus] = useState<"PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED">("COMPLETED");
  const [editAssignedToId, setEditAssignedToId] = useState("");
  const [editFollowUpRequired, setEditFollowUpRequired] = useState(false);
  const [editFollowUpNote, setEditFollowUpNote] = useState("");
  const [editAttachmentNotes, setEditAttachmentNotes] = useState("");
  const [editVersion, setEditVersion] = useState(1);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!description.trim()) {
      setFormError("Action Description is required.");
      return;
    }
    if (!result.trim()) {
      setFormError("Action Result is required.");
      return;
    }
    if (followUpRequired && !followUpNote.trim()) {
      setFormError("Follow-up Note is required when Follow-Up Required is checked.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/actions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          actionDateTime: actionDateTime ? new Date(actionDateTime).toISOString() : new Date().toISOString(),
          description: description.trim(),
          result: result.trim(),
          status,
          assignedToId: assignedToId || null,
          followUpRequired,
          followUpNote: followUpNote.trim(),
          attachmentNotes: attachmentNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to record Action Taken.");
      } else {
        onActionCreated(data);
        setDescription("");
        setResult("");
        setStatus("COMPLETED");
        setAssignedToId("");
        setFollowUpRequired(false);
        setFollowUpNote("");
        setAttachmentNotes("");
        setActionDateTime(toLocalDatetimeInput());
        setShowCreateForm(false);
      }
    } catch {
      setFormError("Network error while saving Action Taken.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (a: ActionTakenItem) => {
    setEditingId(a.id);
    setEditDateTime(toLocalDatetimeInput(a.actionDateTime));
    setEditDescription(a.description);
    setEditResult(a.result);
    setEditStatus(a.status);
    setEditAssignedToId(a.assignedToId || "");
    setEditFollowUpRequired(a.followUpRequired);
    setEditFollowUpNote(a.followUpNote || "");
    setEditAttachmentNotes(a.attachmentNotes || "");
    setEditVersion(a.version);
    setEditError("");
  };

  const handleUpdate = async (e: React.FormEvent, actionId: string) => {
    e.preventDefault();
    setEditError("");

    if (!editDescription.trim() || !editResult.trim()) {
      setEditError("Action Description and Outcome/Result are required.");
      return;
    }
    if (editFollowUpRequired && !editFollowUpNote.trim()) {
      setEditError("Follow-up Note is required when Follow-Up Required is checked.");
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/actions/${actionId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          actionDateTime: editDateTime ? new Date(editDateTime).toISOString() : undefined,
          description: editDescription.trim(),
          result: editResult.trim(),
          status: editStatus,
          assignedToId: editAssignedToId || null,
          followUpRequired: editFollowUpRequired,
          followUpNote: editFollowUpNote.trim(),
          attachmentNotes: editAttachmentNotes.trim(),
          version: editVersion,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setEditError(data.error || "Conflict detected. Refreshing latest data...");
        onRefreshAll();
      } else if (!res.ok) {
        setEditError(data.error || "Failed to update Action Taken.");
      } else {
        onActionUpdated(data);
        setEditingId(null);
      }
    } catch {
      setEditError("Network error while updating Action Taken.");
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <section
      aria-label="Actions Taken"
      style={{ backgroundColor: "#ffffff", border: "1px solid #dee2e6", borderRadius: 8, padding: 24, marginBottom: 20 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: "#1b4332" }}>Actions Taken ({actions.length})</h3>
          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#6c757d" }}>
            Chronological log of diagnostic and resolution actions performed on this ticket.
          </p>
        </div>
        {isStaff && (
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((v) => !v);
              setFormError("");
            }}
            style={{ backgroundColor: "#1b4332", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
          >
            {showCreateForm ? "Cancel" : "+ Record Action Taken"}
          </button>
        )}
      </div>

      {/* Create Action Taken Form (IT_STAFF & ADMIN only) */}
      {isStaff && showCreateForm && (
        <form
          onSubmit={handleCreate}
          style={{ backgroundColor: "#f8f9fa", border: "1px solid #95d5b2", borderRadius: 8, padding: 18, marginBottom: 20 }}
        >
          <h4 style={{ margin: "0 0 12px 0", color: "#1b4332" }}>Record New Action Taken</h4>
          {formError && (
            <div role="alert" style={{ padding: 10, marginBottom: 12, backgroundColor: "#f8d7da", color: "#721c24", borderRadius: 4, fontSize: 13 }}>
              {formError}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div>
              <label htmlFor="action-datetime" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Action Date & Time
              </label>
              <input
                id="action-datetime"
                type="datetime-local"
                value={actionDateTime}
                onChange={(e) => setActionDateTime(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ced4da" }}
              />
            </div>

            <div>
              <label htmlFor="action-status" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Action Status
              </label>
              <select
                id="action-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ced4da" }}
              >
                <option value="PLANNED">PLANNED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div>
              <label htmlFor="action-assignee" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Assigned To (Optional Staff)
              </label>
              <select
                id="action-assignee"
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ced4da" }}
              >
                <option value="">Unassigned</option>
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.fullName} ({ag.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="action-description" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Action Description *
            </label>
            <textarea
              id="action-description"
              rows={2}
              placeholder="Describe the technical action performed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ced4da" }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="action-result" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Outcome / Result *
            </label>
            <textarea
              id="action-result"
              rows={2}
              placeholder="Describe the observed outcome or test result..."
              value={result}
              onChange={(e) => setResult(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ced4da" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={followUpRequired}
                  onChange={(e) => setFollowUpRequired(e.target.checked)}
                />
                Follow-Up Required
              </label>
              <input
                type="text"
                aria-label="Follow-Up Note"
                placeholder={followUpRequired ? "Required: specify follow-up steps..." : "Optional follow-up note..."}
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ced4da", marginTop: 6 }}
              />
            </div>

            <div>
              <label htmlFor="action-attachment-notes" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Attachment / Evidence Notes
              </label>
              <input
                id="action-attachment-notes"
                type="text"
                placeholder="e.g., diagnostic-report.log, screenshot.png"
                value={attachmentNotes}
                onChange={(e) => setAttachmentNotes(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ced4da", marginTop: 2 }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ backgroundColor: "#1b4332", color: "#ffffff", border: "none", padding: "10px 18px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
          >
            {submitting ? "Saving Action..." : "Save Action Taken"}
          </button>
        </form>
      )}

      {/* Chronological List of Actions Taken */}
      {actions.length === 0 ? (
        <p style={{ color: "#6c757d", fontSize: 14, margin: 0 }}>No actions have been recorded on this ticket yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {actions.map((a) => (
            <div key={a.id} style={{ border: "1px solid #e9ecef", borderRadius: 8, padding: 16, backgroundColor: "#fcfdfc" }}>
              {editingId === a.id && isStaff ? (
                <form onSubmit={(e) => handleUpdate(e, a.id)}>
                  <h4 style={{ margin: "0 0 10px 0", color: "#1b4332" }}>Edit Action Taken</h4>
                  {editError && (
                    <div role="alert" style={{ padding: 10, marginBottom: 10, backgroundColor: "#f8d7da", color: "#721c24", borderRadius: 4, fontSize: 13 }}>
                      {editError}
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600 }}>Action Date & Time</label>
                      <input type="datetime-local" value={editDateTime} onChange={(e) => setEditDateTime(e.target.value)} style={{ width: "100%", padding: 6 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600 }}>Status</label>
                      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)} style={{ width: "100%", padding: 6 }}>
                        <option value="PLANNED">PLANNED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600 }}>Assigned To</label>
                      <select value={editAssignedToId} onChange={(e) => setEditAssignedToId(e.target.value)} style={{ width: "100%", padding: 6 }}>
                        <option value="">Unassigned</option>
                        {agents.map((ag) => (
                          <option key={ag.id} value={ag.id}>{ag.fullName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600 }}>Action Description</label>
                    <textarea rows={2} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} style={{ width: "100%", padding: 6 }} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600 }}>Outcome / Result</label>
                    <textarea rows={2} value={editResult} onChange={(e) => setEditResult(e.target.value)} style={{ width: "100%", padding: 6 }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                      <input type="checkbox" checked={editFollowUpRequired} onChange={(e) => setEditFollowUpRequired(e.target.checked)} />
                      Follow-Up Required
                    </label>
                    <input
                      type="text"
                      placeholder="Follow-up note..."
                      value={editFollowUpNote}
                      onChange={(e) => setEditFollowUpNote(e.target.value)}
                      style={{ flex: 1, minWidth: 200, padding: 6 }}
                    />
                    <input
                      type="text"
                      placeholder="Attachment notes..."
                      value={editAttachmentNotes}
                      onChange={(e) => setEditAttachmentNotes(e.target.value)}
                      style={{ flex: 1, minWidth: 180, padding: 6 }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" disabled={editSubmitting} style={{ backgroundColor: "#1b4332", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>
                      {editSubmitting ? "Updating..." : "Update Action"}
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} style={{ backgroundColor: "#fff", border: "1px solid #ccc", padding: "6px 14px", borderRadius: 4, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ ...statusBadgeStyle(a.status), padding: "3px 10px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
                        {a.status}
                      </span>
                      <span style={{ fontSize: 13, color: "#495057", fontWeight: 600 }}>
                        {new Date(a.actionDateTime).toLocaleString()}
                      </span>
                      <span style={{ fontSize: 12, color: "#6c757d" }}>
                        Performed by: <strong>{a.performedBy?.fullName || "IT Staff"}</strong>
                      </span>
                      {a.assignedTo && (
                        <span style={{ fontSize: 12, color: "#1b4332" }}>
                          • Assigned to: <strong>{a.assignedTo.fullName}</strong>
                        </span>
                      )}
                    </div>
                    {isStaff && (
                      <button
                        type="button"
                        onClick={() => startEditing(a)}
                        style={{ backgroundColor: "#ffffff", border: "1px solid #1b4332", color: "#1b4332", padding: "4px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        Edit Action
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: 14, color: "#212529", marginBottom: 6 }}>
                    <strong>Action:</strong> {a.description}
                  </div>
                  <div style={{ fontSize: 14, color: "#1b4332", marginBottom: 6 }}>
                    <strong>Result:</strong> {a.result}
                  </div>

                  {a.followUpRequired && (
                    <div style={{ padding: "8px 12px", backgroundColor: "#fef3c7", borderLeft: "4px solid #d97706", borderRadius: 4, fontSize: 13, color: "#92400e", marginTop: 6 }}>
                      <strong>Follow-Up Required:</strong> {a.followUpNote}
                    </div>
                  )}

                  {a.attachmentNotes && (
                    <div style={{ fontSize: 12, color: "#6c757d", marginTop: 6 }}>
                      Attachment reference: <code>{a.attachmentNotes}</code>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
