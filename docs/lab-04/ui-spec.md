# Sprint 4 UI Specification & Visual Accessibility Checklist — TokTickIT

## 1. Zen Green Design System
- **Primary:** Forest Green (`#1b4332`) | **Accent:** Mint Green (`#52b788`) | **Soft Mint:** (`#d8f3dc`) | **Canvas:** (`#f8f9fa`) | **Card:** (`#ffffff`) | **Text:** (`#212529`).
- **Status & Priority Badges:** Always combine text labels with high-contrast colors (`>= 4.5:1`) for both Ticket statuses and Action Taken statuses (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).

## 2. Screen Specifications
- **IT Staff / Admin Dashboard (`/dashboard`):** Greeting + `Refresh` button, operational metric cards (`New`, `Open`, `In Progress`, `Waiting for Requester`, `Unassigned`, `My Assigned`, `High Priority`, `My Actions Taken`, plus `Active Users` for Admin) with drill-down to `/queue`, `My Recent Tickets`, `My Actions Taken`, and `Quick Actions`.
- **Requester Dashboard (`/dashboard`):** Greeting + `Refresh` button, personal metric cards (`My Open Tickets`, `In Progress`, `Waiting for Me`, `Resolved`, `Closed`) drilling down to `/my-tickets`, `Needs Your Attention` list, `My Recent Tickets`, and `Quick Actions`.
- **Ticket Detail — Actions Taken & Workflow (`/tickets/:id`):** Chronological table/cards showing `actionDateTime`, `description`, `result`, `status`, `performedBy.fullName` (auto), `assignedTo.fullName`, `followUpRequired` + highlighted `followUpNote`, and `attachmentNotes`. Inline Create & Edit forms for `IT_STAFF`/`ADMIN` (preserving entered values on error and disabling submit during save); read-only list for `REQUESTER`. Ticket status dropdown shows only permitted transitions.

## 3. Visual & Accessibility Checklist
- [x] Verified at Desktop (`1280x800`), Tablet (`768x1024`), and Mobile (`390x844`) with zero clipping, overlap, or horizontal overflow.
- [x] Full keyboard navigation (`Tab`) with visible focus outline (`2px solid #52b788`) and semantic `<label htmlFor>` associations.
- [x] Inline validation placement (`role="alert"`) and preserved form input on recoverable `400`/`409` failures.
