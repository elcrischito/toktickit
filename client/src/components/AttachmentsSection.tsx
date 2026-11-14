import React, { useEffect, useState } from "react";

// Lab 2 attachment lifecycle (BR-13..BR-18) restored on the Lab 3+ Ticket Detail page.
// Owner Requester: upload, download, remove with reason. IT Staff / Admin: view + download.

export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]; // BR-13
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // BR-14
export const MAX_ACTIVE_ATTACHMENTS = 5; // BR-15

export interface AttachmentItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  isRemoved: boolean;
  removedAt?: string | null;
  removalReason?: string | null;
}

interface AttachmentsSectionProps {
  ticketId: string;
  token: string | null;
  canModify: boolean;
}

export const validateAttachment = (file: File, activeCount: number): string | null => {
  if (!ALLOWED_TYPES.includes(file.type)) return "Only JPG, PNG, WEBP, and PDF files are allowed.";
  if (file.size > MAX_FILE_SIZE) return "File is too large. Maximum size is 5 MB.";
  if (activeCount >= MAX_ACTIVE_ATTACHMENTS) return `A ticket can have at most ${MAX_ACTIVE_ATTACHMENTS} active attachments.`;
  return null;
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({ ticketId, token, canModify }) => {
  const [items, setItems] = useState<AttachmentItem[]>([]);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}` };
  const active = items.filter((a) => !a.isRemoved);
  const removed = items.filter((a) => a.isRemoved);
  const atLimit = active.length >= MAX_ACTIVE_ATTACHMENTS;

  const load = async () => {
    setLoadError("");
    try {
      const res = await fetch(`/api/tickets/${ticketId}/attachments`, { headers });
      const body = await res.json();
      if (!res.ok) throw new Error();
      setItems(body.data || []);
    } catch {
      setLoadError("Unable to load attachments.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = validateAttachment(file, active.length);
    if (problem) {
      setMessage({ type: "error", text: problem });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/tickets/${ticketId}/attachments`, { method: "POST", headers, body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: body?.error?.message || "Upload failed. Please try again." });
      } else {
        setMessage({ type: "success", text: `${file.name} uploaded.` });
        await load();
      }
    } catch {
      setMessage({ type: "error", text: "Network error while uploading. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (item: AttachmentItem) => {
    setBusyId(item.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/attachments/${item.id}/download`, { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: body?.error?.message || "Download failed." });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = item.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ type: "error", text: "Network error while downloading." });
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemove = async (item: AttachmentItem) => {
    const reason = removalReason.trim();
    if (reason.length < 3 || reason.length > 200) {
      setMessage({ type: "error", text: "Removal reason must be between 3 and 200 characters." });
      return;
    }
    setBusyId(item.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/attachments/${item.id}`, {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ removalReason: reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: body?.error?.message || "Unable to remove attachment." });
      } else {
        setMessage({ type: "success", text: `${item.fileName} removed.` });
        setRemovingId(null);
        setRemovalReason("");
        await load();
      }
    } catch {
      setMessage({ type: "error", text: "Network error while removing attachment." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section style={{ backgroundColor: "#ffffff", border: "1px solid #dee2e6", borderRadius: 8, padding: 24, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 17, color: "#1b4332" }}>
          Attachments ({active.length}/{MAX_ACTIVE_ATTACHMENTS})
        </h3>
        {canModify && (
          <label
            htmlFor="attachment-upload"
            style={{
              backgroundColor: atLimit || uploading ? "#adb5bd" : "#1b4332",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: 4,
              cursor: atLimit || uploading ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: 14,
            }}
          >
            {uploading ? "Uploading..." : "+ Add Attachment"}
            <input
              id="attachment-upload"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={handleFile}
              disabled={atLimit || uploading}
              style={{ display: "none" }}
            />
          </label>
        )}
      </div>

      {canModify && (
        <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#6c757d" }}>
          JPG, PNG, WEBP, or PDF · max 5 MB · up to {MAX_ACTIVE_ATTACHMENTS} attachments per ticket
        </p>
      )}

      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          style={{
            padding: 10,
            marginBottom: 12,
            borderRadius: 4,
            backgroundColor: message.type === "error" ? "#f8d7da" : "#d1e7dd",
            color: message.type === "error" ? "#721c24" : "#0f5132",
          }}
        >
          {message.text}
        </div>
      )}

      {loadError ? (
        <div role="alert" style={{ color: "#721c24" }}>
          {loadError}{" "}
          <button type="button" onClick={load} style={{ marginLeft: 8 }}>Retry</button>
        </div>
      ) : active.length === 0 ? (
        <p style={{ color: "#6c757d", margin: 0 }}>No attachments on this ticket.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {active.map((a) => (
            <li key={a.id} style={{ borderTop: "1px solid #e9ecef", padding: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <span style={{ wordBreak: "break-all" }}>
                  <strong>{a.fileName}</strong>{" "}
                  <span style={{ color: "#6c757d", fontSize: 13 }}>
                    · {formatSize(a.sizeBytes)} · {new Date(a.uploadedAt).toLocaleString()}
                  </span>
                </span>
                <span style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => handleDownload(a)} disabled={busyId === a.id}>
                    Download
                  </button>
                  {canModify && removingId !== a.id && (
                    <button type="button" onClick={() => { setRemovingId(a.id); setRemovalReason(""); setMessage(null); }}>
                      Remove
                    </button>
                  )}
                </span>
              </div>
              {canModify && removingId === a.id && (
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <label htmlFor={`removal-reason-${a.id}`} style={{ fontSize: 13, fontWeight: 600 }}>
                    Removal reason
                  </label>
                  <input
                    id={`removal-reason-${a.id}`}
                    type="text"
                    value={removalReason}
                    maxLength={200}
                    onChange={(e) => setRemovalReason(e.target.value)}
                    placeholder="3-200 characters"
                    style={{ flex: 1, minWidth: 180, padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
                  />
                  <button type="button" onClick={() => confirmRemove(a)} disabled={busyId === a.id}>
                    Confirm Remove
                  </button>
                  <button type="button" onClick={() => { setRemovingId(null); setRemovalReason(""); }}>
                    Cancel
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {removed.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", color: "#6c757d", fontSize: 13 }}>
            Removed attachments ({removed.length})
          </summary>
          <ul style={{ paddingLeft: 18, color: "#6c757d", fontSize: 13 }}>
            {removed.map((a) => (
              <li key={a.id}>
                <s>{a.fileName}</s> — removed{a.removedAt ? ` ${new Date(a.removedAt).toLocaleString()}` : ""}
                {a.removalReason ? `: "${a.removalReason}"` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
};
