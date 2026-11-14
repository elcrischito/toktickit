# Lab 2 API Contract Specification

All endpoints are prefixed with `/api`. This is a testing-only Development Requester context (no
authentication) — every request that reads or writes Requester-owned data must include a
`requesterId` identifying the current Development Requester. Ownership is enforced on the backend on
every request, regardless of what the frontend sends or hides.

## Conventions

- **Requester identification**: passed as header `x-requester-id: <id>` on every Ticket/Attachment
  request. This is a stand-in for session-derived identity and will be replaced in Lab 3.
- **Content type**: `application/json` except file upload, which uses `multipart/form-data`.
- **Dates**: ISO 8601 strings (`2026-08-23T10:15:00.000Z`) in all responses.
- **Errors**: consistent shape for every non-2xx response:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Summary is required.", "fields": { "summary": "Summary is required." } } }
  ```
  `fields` is included only for validation errors and omitted otherwise.
- **Pagination metadata** (list endpoints):
  ```json
  { "page": 1, "pageSize": 10, "totalItems": 42, "totalPages": 5 }
  ```

---

## 1. GET /api/dev-requesters

Retrieve active Development Requesters for the Selection screen.

- **Auth/ownership**: none (this is the pre-selection step)
- **Query params**: none
- **Success (200)**:
  ```json
  {
    "data": [
      { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@example.com" },
      { "id": 2, "name": "Michael Brown", "email": "michael.brown@example.com" }
    ]
  }
  ```
- **Failure cases**:
  - `500` server/database error → generic safe error, no stack trace leaked
- Only `isActive: true` records are returned; inactive Requesters are excluded server-side (BR-04).

---

## 2. GET /api/categories

Retrieve active Ticket Categories for form dropdowns/filters.

- **Auth/ownership**: none
- **Success (200)**:
  ```json
  { "data": [ { "id": 1, "name": "Hardware" }, { "id": 2, "name": "Software" } ] }
  ```
- **Failure**: `500` on server error

---

## 3. GET /api/related-systems

Retrieve active Related Systems for form dropdowns/filters.

- **Auth/ownership**: none
- **Success (200)**:
  ```json
  { "data": [ { "id": 1, "name": "Corporate Laptop" }, { "id": 2, "name": "Campus Wi-Fi" } ] }
  ```
- **Failure**: `500` on server error

---

## 4. POST /api/tickets

Create a Ticket for the current Requester.

- **Headers**: `x-requester-id: <id>` (required)
- **Request body**:
  ```json
  {
    "categoryId": 1,
    "relatedSystemId": 4,
    "summary": "Laptop battery drains quickly",
    "description": "The battery drains much faster than usual, even when idle. Started after last week's Windows update.",
    "requestedPriority": "MEDIUM"
  }
  ```
- **Success (201)**:
  ```json
  {
    "data": {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "requesterId": 1,
      "categoryId": 1,
      "relatedSystemId": 4,
      "summary": "Laptop battery drains quickly",
      "description": "The battery drains much faster than usual...",
      "requestedPriority": "MEDIUM",
      "itPriority": null,
      "currentStatus": "NEW",
      "createdAt": "2026-08-23T10:15:00.000Z",
      "updatedAt": "2026-08-23T10:15:00.000Z"
    }
  }
  ```
- **Validation failures (400)**: missing/empty `summary` (BR-07), `summary` outside 5–120 chars,
  missing/empty `description` (BR-08), `description` outside 10–2000 chars, missing or invalid
  `categoryId`/`relatedSystemId` (BR-09), missing or invalid `requestedPriority` (BR-10). Response
  includes per-field messages in `error.fields`.
- **Ownership/context failure (400)**: missing or unknown `x-requester-id` header, or Requester is
  inactive → `error.code: "INVALID_REQUESTER"`.
- **Reference-data failure (400)**: `categoryId` or `relatedSystemId` does not exist or is inactive →
  `error.code: "INVALID_REFERENCE"`.
- **Server failure (500)**: safe generic error; Ticket is not created.
- Duplicate-submission prevention (BR-11) is primarily a frontend concern (disable/busy button); the
  backend does not need idempotency keys for Lab 2.

---

## 5. GET /api/tickets

Paginated, searchable, filterable, sortable list of the current Requester's own Tickets.

- **Headers**: `x-requester-id: <id>` (required)
- **Query params**:
  | Param | Type | Notes |
  |---|---|---|
  | `search` | string | matches Ticket Number or Summary (case-insensitive, partial match) |
  | `categoryId` | number | filter by Category |
  | `requestedPriority` | `LOW`\|`MEDIUM`\|`HIGH` | filter |
  | `itPriority` | `LOW`\|`MEDIUM`\|`HIGH` | filter |
  | `currentStatus` | string | filter |
  | `sortBy` | `createdAt`\|`ticketNumber`\|`updatedAt` | default `createdAt` |
  | `sortOrder` | `asc`\|`desc` | default `desc` |
  | `page` | number | default `1` |
  | `pageSize` | `10`\|`25`\|`50` | default `10` |

  Invalid `sortBy`, `sortOrder`, `page`, or `pageSize` values silently fall back to defaults rather
  than returning an error (BR-20).

- **Success (200)**:
  ```json
  {
    "data": [
      {
        "id": 101,
        "ticketNumber": "TKT-2026-000101",
        "summary": "Laptop battery drains quickly",
        "categoryId": 1,
        "categoryName": "Hardware",
        "requestedPriority": "MEDIUM",
        "itPriority": null,
        "currentStatus": "NEW",
        "createdAt": "2026-08-23T10:15:00.000Z",
        "updatedAt": "2026-08-23T10:15:00.000Z"
      }
    ],
    "meta": { "page": 1, "pageSize": 10, "totalItems": 1, "totalPages": 1 }
  }
  ```
- Query only ever returns Tickets where `requesterId` matches `x-requester-id` (AC-03, AC-12); there
  is no way to request another Requester's Tickets through this endpoint.
- **Failure**: `400 INVALID_REQUESTER` if the header is missing/unknown; `500` on server error.
- Zero Tickets ever created vs. zero results from a search/filter are distinguished by the frontend
  using `totalItems` (0 with no active filters = empty state; 0 with filters/search active =
  no-results state per AC-11).

---

## 6. GET /api/tickets/:id

Retrieve one Ticket owned by the current Requester, including basic reference names for display.

- **Headers**: `x-requester-id: <id>` (required)
- **Success (200)**:
  ```json
  {
    "data": {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "requesterId": 1,
      "requesterName": "Jennifer Anderson",
      "categoryId": 1,
      "categoryName": "Hardware",
      "relatedSystemId": 4,
      "relatedSystemName": "Corporate Laptop",
      "summary": "Laptop battery drains quickly",
      "description": "The battery drains much faster than usual...",
      "requestedPriority": "MEDIUM",
      "itPriority": null,
      "currentStatus": "NEW",
      "createdAt": "2026-08-23T10:15:00.000Z",
      "updatedAt": "2026-08-23T10:15:00.000Z"
    }
  }
  ```
- **Not found / not owned (404)**: if the Ticket does not exist, **or** exists but belongs to a
  different Requester, the same generic `404 NOT_FOUND` is returned (AC-03, AC-09, FR-10). The API
  deliberately does not distinguish "doesn't exist" from "exists but isn't yours," to avoid leaking
  which Ticket IDs are valid.
- **Failure**: `400 INVALID_REQUESTER` if header missing/unknown; `500` on server error.

---

## 7. POST /api/tickets/:id/attachments

Upload an Attachment to a Ticket owned by the current Requester.

- **Headers**: `x-requester-id: <id>` (required)
- **Request**: `multipart/form-data`, field name `file`
- **Success (201)**:
  ```json
  {
    "data": {
      "id": 55,
      "ticketId": 101,
      "fileName": "battery-report.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 245678,
      "uploadedAt": "2026-08-23T10:20:00.000Z",
      "isRemoved": false
    }
  }
  ```
- **Validation failures (400)**:
  - Unsupported file type (not JPG/JPEG/PNG/WEBP/PDF) → `error.code: "UNSUPPORTED_FILE_TYPE"` (BR-13)
  - File exceeds 5 MB → `error.code: "FILE_TOO_LARGE"` (BR-14)
  - Ticket already has 5 active Attachments → `error.code: "ATTACHMENT_LIMIT_REACHED"` (BR-15)
- **Not found / not owned (404)**: Ticket doesn't exist or isn't owned by this Requester (BR-18)
- **Failure**: `500` on storage/server error; the Ticket itself is unaffected (BR-19 applies when this
  happens as part of the Create Ticket flow's follow-up upload calls).

---

## 8. GET /api/tickets/:id/attachments

List Attachment metadata (active and removed) for a Ticket owned by the current Requester.

- **Headers**: `x-requester-id: <id>` (required)
- **Success (200)**:
  ```json
  {
    "data": [
      {
        "id": 55,
        "fileName": "battery-report.pdf",
        "mimeType": "application/pdf",
        "sizeBytes": 245678,
        "uploadedAt": "2026-08-23T10:20:00.000Z",
        "isRemoved": false,
        "removedAt": null,
        "removalReason": null
      },
      {
        "id": 40,
        "fileName": "old-screenshot.png",
        "mimeType": "image/png",
        "sizeBytes": 102400,
        "uploadedAt": "2026-08-22T09:00:00.000Z",
        "isRemoved": true,
        "removedAt": "2026-08-22T09:30:00.000Z",
        "removalReason": "Wrong screenshot attached"
      }
    ]
  }
  ```
- **Not found / not owned (404)**: same rule as Ticket Detail
- **Failure**: `500` on server error

---

## 9. GET /api/attachments/:id/download

Download the binary content of an active (non-removed) Attachment owned by the current Requester.

- **Headers**: `x-requester-id: <id>` (required)
- **Success (200)**: binary file stream with correct `Content-Type` and
  `Content-Disposition: attachment; filename="<fileName>"`
- **Blocked (403)**: Attachment exists and is owned by this Requester, but `isRemoved: true` →
  `error.code: "ATTACHMENT_REMOVED"` (BR-16, AC-09)
- **Not found / not owned (404)**: Attachment doesn't exist, or belongs to a Ticket not owned by this
  Requester
- **Failure**: `500` on storage/server error

---

## 10. DELETE /api/attachments/:id

Soft-remove an Attachment owned by the current Requester.

- **Headers**: `x-requester-id: <id>` (required)
- **Request body**:
  ```json
  { "removalReason": "Wrong file attached by mistake" }
  ```
- **Success (200)**:
  ```json
  {
    "data": {
      "id": 55,
      "isRemoved": true,
      "removedAt": "2026-08-23T11:00:00.000Z",
      "removalReason": "Wrong file attached by mistake"
    }
  }
  ```
- **Validation failure (400)**: missing/empty `removalReason`, or outside 3–200 characters (BR-17)
- **Already removed (409)**: Attachment is already `isRemoved: true` → `error.code: "ALREADY_REMOVED"`
- **Not found / not owned (404)**: Attachment doesn't exist, or belongs to a Ticket not owned by this
  Requester (BR-18)
- **Failure**: `500` on server error
- Removal never deletes the underlying database row or file reference — only flips `isRemoved`,
  `removedAt`, `removalReason`, and records `removedById` (BR-16).

---

## HTTP Status Summary

| Status | Meaning | Used by |
|---|---|---|
| 200 | Successful retrieval / update | GET, DELETE (soft-remove) |
| 201 | Resource created | POST /tickets, POST /attachments |
| 400 | Invalid input / invalid requester context / invalid reference data | most POST/GET with bad params |
| 403 | Action blocked by business rule (not an ownership issue) | download of removed Attachment |
| 404 | Resource not found or not owned by current Requester | Ticket Detail, Attachment actions |
| 409 | Conflicting state | remove an already-removed Attachment |
| 500 | Unexpected server/database/storage error | any endpoint |

## Traceability

Every endpoint above maps to Functional Requirements FR-03–FR-12 and enforces Business Rules
BR-04–BR-19 as noted inline. Ownership enforcement (FR-10, BR-18) is applied identically across GET
`/tickets/:id`, attachment upload, attachment listing, download, and soft removal — never assumed
from the frontend.