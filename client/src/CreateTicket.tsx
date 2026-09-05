import { useEffect, useState } from "react";
import {
  Category,
  RelatedSystem,
  Ticket,
  createTicket,
  fetchCategories,
  fetchRelatedSystems,
} from "./api.js";
import { useRequester } from "./RequesterContext.js";

type FormState = "loading-refs" | "idle" | "submitting" | "success" | "refs-error";

interface FormValues {
  categoryId: string;
  relatedSystemId: string;
  summary: string;
  description: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "";
}

const emptyForm: FormValues = {
  categoryId: "",
  relatedSystemId: "",
  summary: "",
  description: "",
  requestedPriority: "",
};

interface Props {
  onViewMyTickets: () => void;
}

export default function CreateTicket({ onViewMyTickets }: Props) {
  const { requester } = useRequester();
  const [state, setState] = useState<FormState>("loading-refs");
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    loadReferenceData();
  }, []);

  function loadReferenceData() {
    setState("loading-refs");
    Promise.all([fetchCategories(), fetchRelatedSystems()])
      .then(([cats, systems]) => {
        setCategories(cats);
        setRelatedSystems(systems);
        setState("idle");
      })
      .catch(() => setState("refs-error"));
  }

  function updateField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requester || state === "submitting") return;

    // Frontend validation before calling the API (AC-04).
    const errors: Record<string, string> = {};
    const trimmedSummary = values.summary.trim();
    const trimmedDescription = values.description.trim();

    if (trimmedSummary.length < 5 || trimmedSummary.length > 120) {
      errors.summary = "Summary must be between 5 and 120 characters.";
    }
    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      errors.description = "Description must be between 10 and 2000 characters.";
    }
    if (!values.categoryId) {
      errors.categoryId = "Category is required.";
    }
    if (!values.relatedSystemId) {
      errors.relatedSystemId = "Related System is required.";
    }
    if (!values.requestedPriority) {
      errors.requestedPriority = "Requested priority is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setApiError("");
    setState("submitting");

    try {
      const ticket = await createTicket(requester.id, {
        categoryId: Number(values.categoryId),
        relatedSystemId: Number(values.relatedSystemId),
        summary: values.summary,
        description: values.description,
        requestedPriority: values.requestedPriority as "LOW" | "MEDIUM" | "HIGH",
      });
      setCreatedTicket(ticket);
      setState("success");
    } catch (err: any) {
      if (err?.error?.fields) {
        setFieldErrors(err.error.fields);
        setState("idle");
      } else {
        setApiError(err?.message ?? "Something went wrong saving your ticket. Please try again.");
        setState("idle");
      }
    }
  }

  function handleCreateAnother() {
    setValues(emptyForm);
    setCreatedTicket(null);
    setFieldErrors({});
    setApiError("");
    setState("idle");
  }

  if (state === "loading-refs") {
    return (
      <div className="container py-5" style={{ maxWidth: 720 }}>
        <p className="text-muted">Loading form…</p>
      </div>
    );
  }

  if (state === "refs-error") {
    return (
      <div className="container py-5" style={{ maxWidth: 720 }}>
        <div className="alert alert-danger">
          <p className="mb-2">Unable to load Category and Related System options.</p>
          <button className="btn btn-sm btn-outline-danger" onClick={loadReferenceData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (state === "success" && createdTicket) {
    return (
      <div className="container py-5" style={{ maxWidth: 720 }}>
        <div className="card border-success">
          <div className="card-body text-center p-5">
            <div className="text-success mb-3" style={{ fontSize: 40 }}>
              ✓
            </div>
            <h1 className="h4 mb-2">Ticket {createdTicket.ticketNumber} created</h1>
            <p className="text-muted mb-4">Your ticket has been submitted successfully.</p>
            <div className="d-flex gap-2 justify-content-center">
              <button className="btn btn-outline-success" onClick={handleCreateAnother}>
                Create Another
              </button>
              <button className="btn btn-success" onClick={onViewMyTickets}>
                View My Tickets
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ maxWidth: 720 }}>
      <h1 className="h3 mb-4">Create Ticket</h1>

      {apiError && (
        <div className="alert alert-danger" role="alert">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row mb-3">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Ticket Number</label>
            <input
              className="form-control"
              value="Will be assigned on save"
              disabled
              style={{ backgroundColor: "#F1EEE4" }}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Ticket Date</label>
            <input
              className="form-control"
              value={new Date().toLocaleDateString()}
              disabled
              style={{ backgroundColor: "#F1EEE4" }}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Requester</label>
            <input
              className="form-control"
              value={requester?.name ?? ""}
              disabled
              style={{ backgroundColor: "#F1EEE4" }}
            />
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="category" className="form-label fw-semibold">
              Category <span className="text-danger">*</span>
            </label>
            <select
              id="category"
              className={`form-select ${fieldErrors.categoryId ? "is-invalid" : ""}`}
              value={values.categoryId}
              onChange={(e) => updateField("categoryId", e.target.value)}
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && (
              <div className="invalid-feedback">{fieldErrors.categoryId}</div>
            )}
          </div>
          <div className="col-md-6">
            <label htmlFor="relatedSystem" className="form-label fw-semibold">
              Related System <span className="text-danger">*</span>
            </label>
            <select
              id="relatedSystem"
              className={`form-select ${fieldErrors.relatedSystemId ? "is-invalid" : ""}`}
              value={values.relatedSystemId}
              onChange={(e) => updateField("relatedSystemId", e.target.value)}
            >
              <option value="">Select a related system…</option>
              {relatedSystems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {fieldErrors.relatedSystemId && (
              <div className="invalid-feedback">{fieldErrors.relatedSystemId}</div>
            )}
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="priority" className="form-label fw-semibold">
            Requested Priority <span className="text-danger">*</span>
          </label>
          <select
            id="priority"
            className={`form-select ${fieldErrors.requestedPriority ? "is-invalid" : ""}`}
            value={values.requestedPriority}
            onChange={(e) =>
              updateField("requestedPriority", e.target.value as FormValues["requestedPriority"])
            }
          >
            <option value="">Select priority…</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          {fieldErrors.requestedPriority && (
            <div className="invalid-feedback">{fieldErrors.requestedPriority}</div>
          )}
        </div>

        <div className="mb-3">
          <label htmlFor="summary" className="form-label fw-semibold">
            Ticket Summary <span className="text-danger">*</span>
          </label>
          <input
            id="summary"
            className={`form-control ${fieldErrors.summary ? "is-invalid" : ""}`}
            value={values.summary}
            maxLength={120}
            onChange={(e) => updateField("summary", e.target.value)}
          />
          <div className="form-text">{values.summary.length}/120</div>
          {fieldErrors.summary && <div className="invalid-feedback d-block">{fieldErrors.summary}</div>}
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="form-label fw-semibold">
            Description <span className="text-danger">*</span>
          </label>
          <textarea
            id="description"
            className={`form-control ${fieldErrors.description ? "is-invalid" : ""}`}
            rows={5}
            maxLength={2000}
            value={values.description}
            onChange={(e) => updateField("description", e.target.value)}
          />
          <div className="form-text">{values.description.length}/2000</div>
          {fieldErrors.description && (
            <div className="invalid-feedback d-block">{fieldErrors.description}</div>
          )}
        </div>

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-success" disabled={state === "submitting"}>
            {state === "submitting" ? "Submitting…" : "Submit Ticket"}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={state === "submitting"}
            onClick={onViewMyTickets}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}