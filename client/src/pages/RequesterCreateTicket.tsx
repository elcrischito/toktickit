import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface RequesterCreateTicketProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const RequesterCreateTicket: React.FC<RequesterCreateTicketProps> = ({ onSuccess, onCancel }) => {
  const { user, token } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [systems, setSystems] = useState<any[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [relatedSystemId, setRelatedSystemId] = useState("");
  const [requestedPriority, setRequestedPriority] = useState("MEDIUM");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/categories"), fetch("/api/related-systems")]).then(async ([cRes, sRes]) => {
      if (cRes.ok) setCategories(await cRes.json());
      if (sRes.ok) setSystems(await sRes.json());
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryId,
          relatedSystemId: relatedSystemId || undefined,
          requestedPriority,
          summary,
          description,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create ticket.");
      } else {
        onSuccess();
      }
    } catch {
      setError("Network error while creating ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h2 style={{ color: "#1b4332", marginBottom: 20 }}>Create Support Ticket</h2>
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #dee2e6", borderRadius: 8, padding: 24 }}>
        {error && (
          <div style={{ padding: 12, marginBottom: 16, backgroundColor: "#f8d7da", color: "#721c24", borderRadius: 4 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: 6 }}>Requester</label>
            <input type="text" value={`${user?.fullName} (${user?.email})`} disabled style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc", backgroundColor: "#F1EEE4" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: 6 }}>Category *</label>
              <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}>
                <option value="">Select category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: 6 }}>Related System</label>
              <select value={relatedSystemId} onChange={(e) => setRelatedSystemId(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}>
                <option value="">Select system...</option>
                {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: 6 }}>Requested Priority *</label>
            <select value={requestedPriority} onChange={(e) => setRequestedPriority(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: 6 }}>Ticket Summary *</label>
            <input required type="text" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief summary (5-120 characters)" style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: 6 }}>Description *</label>
            <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description (10-2000 characters)" style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }} />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" disabled={submitting} style={{ backgroundColor: "#1b4332", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
            <button type="button" onClick={onCancel} style={{ backgroundColor: "#fff", color: "#1b4332", border: "1px solid #1b4332", padding: "10px 20px", borderRadius: 4, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
