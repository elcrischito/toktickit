import { useEffect, useState } from "react";
import {
  AttachmentItem,
  TicketDetail as TicketDetailType,
  fetchTicketDetail,
  uploadAttachment,
  getAttachmentDownloadUrl,
  removeAttachment,
} from "./api.js";
import { useRequester } from "./RequesterContext.js";

type LoadState = "loading" | "success" | "error" | "not-found";

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-success-subtle text-success",
  MEDIUM: "bg-warning-subtle text-warning-emphasis",
  HIGH: "bg-danger-subtle text-danger",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface Props {
  ticketId: number;
  onBack: () => void;
}

export default function TicketDetail({ ticketId, onBack }: Props) {
  const { requester } = useRequester();
  const [state, setState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    if (!requester) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requester, ticketId]);

  function load() {
    if (!requester) return;
    setState("loading");
    fetchTicketDetail(requester.id, ticketId)
      .then((data) => {
        setTicket(data);
        setState("success");
      })
      .catch(() => setState("error"));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !requester) return;

    setUploadError(null);

    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File is too large. Maximum size is 10 MB.");
      return;
    }

    setIsUploading(true);
    uploadAttachment(requester.id, ticketId, file)
      .then((newAttachment: AttachmentItem) => {
        setTicket((prev) =>
          prev ? { ...prev, attachments: [newAttachment, ...prev.attachments] } : prev
        );
      })
      .catch(() => setUploadError("Upload failed. Please try again."))
      .finally(() => setIsUploading(false));
  }

  function handleRemove(attachmentId: number) {
    if (!requester) return;
    setRemovingId(attachmentId);
    removeAttachment(requester.id, ticketId, attachmentId)
      .then(() => {
        setTicket((prev) =>
          prev
            ? { ...prev, attachments: prev.attachments.filter((a) => a.id !== attachmentId) }
            : prev
        );
      })
      .catch(() => setUploadError("Unable to remove attachment. Please try again."))
      .finally(() => setRemovingId(null));
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (state === "loading") {
    return (
      <div className="container py-5" style={{ maxWidth: 900 }}>
        <button className="btn btn-outline-secondary btn-sm mb-4" onClick={onBack}>
          ← Back to My Tickets
        </button>
        <p className="text-muted">Loading ticket…</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="container py-5" style={{ maxWidth: 900 }}>
        <button className="btn btn-outline-secondary btn-sm mb-4" onClick={onBack}>
          ← Back to My Tickets
        </button>
        <div className="alert alert-danger">
          <p className="mb-2">Unable to load this ticket.</p>
          <button className="btn btn-sm btn-outline-danger" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="container py-5" style={{ maxWidth: 900 }}>
      <button className="btn btn-outline-secondary btn-sm mb-4" onClick={onBack}>
        ← Back to My Tickets
      </button>

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h1 className="h4 mb-1">{ticket.ticketNumber}</h1>
          <p className="text-muted mb-0">{ticket.summary}</p>
        </div>
        <span className="badge bg-secondary-subtle text-secondary-emphasis fs-6">
          {ticket.currentStatus}
        </span>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="text-muted small">Category</div>
          <div>{ticket.categoryName}</div>
        </div>
        <div className="col-md-3">
          <div className="text-muted small">Related System</div>
          <div>{ticket.relatedSystemName}</div>
        </div>
        <div className="col-md-3">
          <div className="text-muted small">Requested Priority</div>
          <span className={`badge ${PRIORITY_BADGE[ticket.requestedPriority]}`}>
            {ticket.requestedPriority}
          </span>
        </div>
        <div className="col-md-3">
          <div className="text-muted small">IT Priority</div>
          {ticket.itPriority ? (
            <span className={`badge ${PRIORITY_BADGE[ticket.itPriority]}`}>
              {ticket.itPriority}
            </span>
          ) : (
            <span className="text-muted">—</span>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-muted small mb-1">Description</div>
        <p style={{ whiteSpace: "pre-wrap" }}>{ticket.description}</p>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="text-muted small">Created</div>
          <div>{new Date(ticket.createdAt).toLocaleString()}</div>
        </div>
        <div className="col-md-6">
          <div className="text-muted small">Last Updated</div>
          <div>{new Date(ticket.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      <hr />

      <h2 className="h5 mb-3">Attachments</h2>

      <div className="mb-3">
        <label className="btn btn-success btn-sm">
          {isUploading ? "Uploading…" : "+ Upload File"}
          <input type="file" hidden onChange={handleFileChange} disabled={isUploading} />
        </label>
        {uploadError && <div className="text-danger small mt-2">{uploadError}</div>}
      </div>

      {ticket.attachments.length === 0 && <p className="text-muted">No attachments yet.</p>}

      {ticket.attachments.length > 0 && (
        <ul className="list-group">
          {ticket.attachments.map((a) => {
            const downloadUrl = getAttachmentDownloadUrl(ticketId, a.id);
            return (
              <li
                key={a.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <div className="fw-semibold">{a.originalName}</div>
                  <div className="text-muted small">
                    {formatSize(a.size)} · {new Date(a.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <a className="btn btn-sm btn-outline-secondary" href={downloadUrl}>
                    Download
                  </a>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    disabled={removingId === a.id}
                    onClick={() => handleRemove(a.id)}
                  >
                    {removingId === a.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}