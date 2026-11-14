import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { MAX_ACTIVE_ATTACHMENTS, validateAttachment } from "../components/AttachmentsSection";

interface RequesterCreateTicketProps {
  onSuccess: () => void;
  onCancel: () => void;
  onViewTicket?: (id: string) => void;
}

type FieldErrors = Partial<Record<"categoryId" | "summary" | "description" | "files", string>>;

const labelStyle: React.CSSProperties = { display: "block", fontWeight: "bold", marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc", boxSizing: "border-box" };
const fieldError: React.CSSProperties = { color: "#b02a37", fontSize: 13, marginTop: 4 };

// AC-04: field-level validation, mirrors the backend limits in server/src/routes/tickets.ts
export const validateTicketForm = (values: { categoryId: string; summary: string; description: string }): FieldErrors => {
  const errors: FieldErrors = {};
  if (!values.categoryId) errors.categoryId = "Please select a category.";
  const summary = values.summary.trim();
  if (!summary) errors.summary = "Summary is required.";
  else if (summary.length < 5 || summary.length > 120) errors.summary = "Summary must be between 5 and 120 characters.";
  const description = values.description.trim();
  if (!description) errors.description = "Description is required.";
  else if (description.length < 10 || description.length > 2000) errors.description = "Description must be between 10 and 2000 characters.";
  return errors;
};

export const RequesterCreateTicket: React.FC<RequesterCreateTicketProps> = ({ onSuccess, onCancel, onViewTicket }) => {
  const { user, token } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [systems, setSystems] = useState<any[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [relatedSystemId, setRelatedSystemId] = useState("");
  const [requestedPriority, setRequestedPriority] = useState("MEDIUM");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; ticketNumber: string; failedFiles: string[] } | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/categories"), fetch("/api/related-systems")])
      .then(async ([cRes, sRes]) => {
        if (cRes.ok) setCategories(await cRes.json());
        if (sRes.ok) setSystems(await sRes.json());
      })
      .catch(() => setError("Unable to load categories. Please refresh the page."));
  }, []);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const next = [...files];
    for (const file of picked) {
      const problem = validateAttachment(file, next.length);
      if (problem) {
        setErrors((prev) => ({ ...prev, files: `${file.name}: ${problem}` }));
        return;
      }
      next.push(file);
    }
    setErrors((prev) => ({ ...prev, files: undefined }));
    setFiles(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // BR-11: no double submit
    setError("");
    const fieldErrors = validateTicketForm({ categoryId, summary, description });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          categoryId,
          relatedSystemId: relatedSystemId || undefined,
          requestedPriority,
          summary: summary.trim(),
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // BR-12: keep everything the user typed
        setError(data.error || "Failed to create ticket.");
        return;
      }

      // BR-19: the ticket is saved even if some uploads fail
      const failedFiles: string[] = [];
      for (const file of files) {
        try {
          const form = new FormData();
          form.append("file", file);
          const up = await fetch(`/api/tickets/${data.id}/attachments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
          });
          if (!up.ok) failedFiles.push(file.name);
        } catch {
          failedFiles.push(file.name);
        }
      }
      setCreated({ id: data.id, ticketNumber: data.ticketNumber, failedFiles });
    } catch {
      setError("Network error while creating ticket. Your entries have been kept, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
        <div role="status" style={{ backgroundColor: "#d1e7dd", color: "#0f5132", border: "1px solid #badbcc", borderRadius: 8, padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Ticket {created.ticketNumber} created</h2>
          <p>The IT team has received your request.</p>
          {created.failedFiles.length > 0 && (
            <p role="alert" style={{ color: "#842029" }}>
              These files could not be uploaded: {created.failedFiles.join(", ")}. You can add them again from the ticket page.
            </p>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {onViewTicket && (
              <button
                type="button"
                onClick={() => onViewTicket(created.id)}
                style={{ backgroundColor: "#1b4332", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}
              >
                View Ticket
              </button>
            )}
            <button
              type="button"
              onClick={onSuccess}
              style={{ backgroundColor: "#fff", color: "#1b4332", border: "1px solid #1b4332", padding: "10px 18px", borderRadius: 4, cursor: "pointer" }}
            >
              View My Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h2 style={{ color: "#1b4332", marginBottom: 20 }}>Create Support Ticket</h2>
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #dee2e6", borderRadius: 8, padding: 24 }}>
        {error && (
          <div role="alert" style={{ padding: 12, marginBottom: 16, backgroundColor: "#f8d7da", color: "#721c24", borderRadius: 4 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="ticket-requester" style={labelStyle}>Requester</label>
            <input id="ticket-requester" type="text" value={`${user?.fullName} (${user?.email})`} disabled style={{ ...inputStyle, backgroundColor: "#F1EEE4" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
            <div>
              <label htmlFor="ticket-category" style={labelStyle}>Category *</label>
              <select
                id="ticket-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                aria-invalid={Boolean(errors.categoryId)}
                style={inputStyle}
              >
                <option value="">Select category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.categoryId && <div role="alert" style={fieldError}>{errors.categoryId}</div>}
            </div>
            <div>
              <label htmlFor="ticket-system" style={labelStyle}>Related System</label>
              <select id="ticket-system" value={relatedSystemId} onChange={(e) => setRelatedSystemId(e.target.value)} style={inputStyle}>
                <option value="">Select system...</option>
                {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="ticket-priority" style={labelStyle}>Requested Priority *</label>
            <select id="ticket-priority" value={requestedPriority} onChange={(e) => setRequestedPriority(e.target.value)} style={inputStyle}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="ticket-summary" style={labelStyle}>Ticket Summary *</label>
            <input
              id="ticket-summary"
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary (5-120 characters)"
              aria-invalid={Boolean(errors.summary)}
              style={inputStyle}
            />
            {errors.summary && <div role="alert" style={fieldError}>{errors.summary}</div>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="ticket-description" style={labelStyle}>Description *</label>
            <textarea
              id="ticket-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description (10-2000 characters)"
              aria-invalid={Boolean(errors.description)}
              style={inputStyle}
            />
            {errors.description && <div role="alert" style={fieldError}>{errors.description}</div>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="ticket-files" style={labelStyle}>Attachments (optional)</label>
            <input id="ticket-files" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFiles} disabled={files.length >= MAX_ACTIVE_ATTACHMENTS} />
            <div style={{ fontSize: 13, color: "#6c757d", marginTop: 4 }}>
              JPG, PNG, WEBP, or PDF · max 5 MB · up to {MAX_ACTIVE_ATTACHMENTS} files
            </div>
            {errors.files && <div role="alert" style={fieldError}>{errors.files}</div>}
            {files.length > 0 && (
              <ul style={{ margin: "8px 0 0 0", paddingLeft: 18 }}>
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    {f.name}{" "}
                    <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" disabled={submitting} aria-busy={submitting} style={{ backgroundColor: submitting ? "#6c757d" : "#1b4332", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 4, cursor: submitting ? "wait" : "pointer", fontWeight: "bold" }}>
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
            <button type="button" onClick={onCancel} disabled={submitting} style={{ backgroundColor: "#fff", color: "#1b4332", border: "1px solid #1b4332", padding: "10px 20px", borderRadius: 4, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
