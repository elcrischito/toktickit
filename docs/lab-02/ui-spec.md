# Lab 2 UI Specification — Zen Green Theme

This document defines the visual and interaction conventions for all Lab 2 Requester-facing screens.
Later labs must reuse these tokens and component rules rather than introducing a new visual system.

## 1. Color Tokens

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#006B3C` | App header background, primary buttons, strong emphasis |
| `--color-secondary` | `#0B7A46` | Active tab indicator, focus ring accent, links, hover states |
| `--color-pale` | `#EAF6EF` | Selected row/card background, success surfaces, subtle section emphasis |
| `--color-bg` | `#F5F7F6` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, panels, form containers |
| `--color-border` | `#D9E2DD` | Default card/input border |
| `--color-text` | `#1F2A24` | Body text (dark charcoal-green, not pure black) |
| `--color-text-muted` | `#5B6B62` | Secondary/help text |
| `--color-readonly-bg` | `#F1EEE4` | Read-only field background (warm ivory) |
| `--color-error` | `#B3261E` | Error text/border |
| `--color-warning` | `#B7791F` | Warning callouts/badges |
| `--color-success` | `#1E7A46` | Success confirmation text |

Color is never the only signal: every state (error, success, warning, disabled) pairs a color with an
icon and/or text label.

## 2. Typography & Spacing

- System font stack: `-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- Base body size: 16px, line-height 1.5
- Headings: H1 24px/bold (page titles e.g. "My Tickets"), H2 18px/semibold (section headers)
- Labels: 14px/semibold, uppercase not used (keep natural case for readability)
- Spacing scale: 4px base unit — 8px (tight), 16px (default field/section gap), 24px (section
  separation), 32px (page padding on desktop)

## 3. Field States

| State | Style |
|---|---|
| Editable | White background, `--color-border` 1px solid border, 4px radius |
| Focused | Border becomes `--color-secondary`, 2px focus ring, outline never removed (keyboard visible) |
| Read-only | `--color-readonly-bg` background, same border color but no focus ring, cursor `default` |
| Invalid | `--color-error` border, error icon inside field, message below in `--color-error` text |
| Disabled | 50% opacity, `not-allowed` cursor, no hover/focus effects |

- Labels sit above their control, 14px semibold, 4px gap to the control.
- Required fields show a red asterisk (`*`) immediately after the label text — this is a visual cue
  only; the actual validation message is what communicates the requirement to screen readers and
  sighted users alike.
- Validation messages appear directly below their field (never only as one summary banner at the
  top), 13px, `--color-error`, with a small icon.
- All inputs share one consistent height (40px) except Description, which is a resizable `<textarea>`
  (min-height 120px) that does not break the surrounding layout when resized.

## 4. Button Hierarchy

| Type | Style |
|---|---|
| Primary | Solid `--color-primary` background, white text — one per screen/section (e.g. Submit, Create Ticket) |
| Secondary | White background, `--color-primary` border and text (e.g. Cancel, Clear Filters) |
| Tertiary/Link | No border/background, `--color-secondary` text, underline on hover (e.g. Change Requester) |
| Destructive | White background, `--color-error` border and text; solid `--color-error` on hover (e.g. Remove Attachment) |
| Disabled | 50% opacity, `not-allowed` cursor, no hover state |
| Busy | Primary style retained, spinner replaces or precedes label text, button disabled during the request (BR-11) |

Every icon-only control (e.g. a table sort arrow, a remove "×") has an `aria-label` and a native
`title` tooltip.

## 5. Badges

Used for Requested Priority, IT Priority, and Current Status. Each badge is a pill with background +
text color + short text label (never color alone):

| Value | Background | Text |
|---|---|---|
| LOW | `--color-pale` | `--color-success` |
| MEDIUM | `#FCEFD9` | `--color-warning` |
| HIGH | `#FBE4E1` | `--color-error` |
| NEW | `--color-pale` | `--color-secondary` |
| (future statuses) | reserved, not implemented in Lab 2 | — |

## 6. Screen Specifications

### 6.1 Application Shell
- Header bar: `--color-primary` background, white "TokTickIT" wordmark + icon (left), nav links "My
  Tickets" / "Create Ticket" (center-left), current Requester name + chevron "Profile ▾" menu (right)
  containing a "Change Requester" action.
- Active nav item: white text with a `--color-secondary`-colored 2px underline.
- Below 768px: nav links collapse into a hamburger menu; Requester name/menu remains visible.

### 6.2 Development Requester Selection
- Centered card (max-width 480px) on `--color-bg` page background.
- Icon + "Select Development Requester" H1, one-sentence explanation that this is Lab 2 testing only,
  not a login screen.
- Single `<select>` labeled "Development Requester *", populated from `GET /api/dev-requesters`.
- Info callout (pale green) below: "Only active development requesters are shown."
- Secondary callout: "Authentication coming in Lab 3" note.
- Primary button "Continue" (disabled until a Requester is selected), secondary "Cancel" if entered
  mid-flow via Change Requester.
- **Loading state**: skeleton dropdown + disabled Continue button while fetching.
- **Empty state**: if the API returns zero active Requesters, dropdown is replaced with a message
  ("No active development requesters are available. Contact an administrator.") and Continue stays
  disabled (BR-21).
- **Error state**: if the fetch fails, show an inline error banner with a "Retry" button in place of
  the dropdown (BR-22).

### 6.3 Create Ticket
Layout order (top to bottom), matching Figure 1's grouping:
1. System-generated row (read-only shading): Ticket Number ("will be assigned on save"), Ticket Date
   (today, read-only), Requester (from context, read-only)
2. Classification row: Category *, Related System * (two selects side by side on desktop, stacked on
   mobile)
3. Requested Priority * (segmented control or select — LOW/MEDIUM/HIGH)
4. Ticket Summary * — single-line input, full width, character counter (max 120)
5. Description * — full-width textarea, character counter (max 2000)
6. Attachments — drag-and-drop/file-picker zone, accepted types and size limit stated inline
   ("JPG, PNG, WEBP, or PDF, up to 5 MB, max 5 files"), list of selected files with remove-before-submit
   controls
7. Actions row: primary "Submit Ticket", secondary "Cancel" (returns to My Tickets)

**States**:
- Initial: all editable fields empty, read-only fields pre-filled from context
- Validation failure: offending field(s) get the invalid style + message; page does not scroll away
  from the first invalid field
- Submitting: Submit button shows busy state, all fields disabled, no navigation possible
- Success: form is replaced with a success panel — pale green background, check icon, "Ticket
  TKT-2026-000101 created", "View Ticket" and "Create Another" actions
- API failure: error banner above the form ("Something went wrong saving your ticket. Please try
  again."), all entered values remain in the fields (BR-12), Submit re-enabled
- Invalid attachment: file-picker area shows an inline message per rejected file (wrong type or too
  large) without blocking the rest of the form

### 6.4 My Tickets
- Page header: "My Tickets" H1 + subtitle, "Clear Filters" (secondary) and "Create Ticket" (primary)
  buttons top-right.
- Filter row: search input (placeholder "Search by ticket number or summary…"), Category select,
  Requested Priority select, IT Priority select, Current Status select — all "All ___" by default.
- **Desktop (≥992px)**: table with sortable column headers (Ticket No., Created Date, Summary,
  Category, Requested Priority, IT Priority, Current Status, Last Updated); sort arrows toggle
  asc/desc; row click opens Ticket Detail.
- **Tablet (768–991px)**: table condenses to fewer visible columns (Ticket No., Summary, Status,
  Last Updated); remaining fields available by expanding a row or via Ticket Detail.
- **Mobile (<768px)**: rows become stacked cards — Ticket Number + Current Status badge on top row,
  Summary below, Category/Priority/Last Updated as small label-value pairs; whole card is tappable.
- Pagination control at the bottom: Previous/Next + page numbers, page-size selector (10/25/50).
- **Loading**: skeleton rows/cards while fetching.
- **Empty state** (Requester has zero Tickets ever): illustration/icon, "You haven't created any
  tickets yet," primary "Create Ticket" button.
- **No-results state** (search/filter active, zero matches): distinct message, "No tickets match your
  filters," "Clear Filters" button.
- **Error state**: banner with "Retry" button; table/card area replaced, filters remain visible so the
  Requester isn't blocked from retrying with different parameters.

### 6.5 Requester Ticket Detail
- Breadcrumb: "My Tickets > Ticket Details", "← Back to My Tickets" link top-right (per Figure 1).
- Read-only info grid (2–4 columns depending on width): Ticket No., Ticket Date, Category, Related
  System, Requester, Requested Priority (badge), IT Priority (badge), Current Status (badge), Ticket
  Owner (if assigned — else "Unassigned"), Summary, Description (full width).
- Attachments panel, clearly separated (card with its own header "Attachments (n)"):
  - Active attachments: file icon, name, size, uploaded date, Download and Remove actions
  - Removed attachments: same row style but muted/greyed, "Removed" badge, removal reason shown,
    Download replaced with a disabled control labeled "Unavailable"
  - "Add Attachment" control at the top of the panel, same validation rules as Create Ticket
- Removal flow: clicking Remove opens a small confirm dialog requiring a removal reason (3–200 chars)
  before the soft-remove request is sent.
- **Loading**: skeleton for the info grid and attachment list.
- **Not found / not owned**: full-page message "Ticket not found," link back to My Tickets — used
  identically whether the Ticket doesn't exist or belongs to another Requester (never reveals which).
- **Error state**: banner with Retry, rest of the page kept in its last-known state where possible.

## 7. Responsive Rules

| Viewport | Behavior |
|---|---|
| Desktop ≥ 992px | Full multi-column layouts as described per screen; content max-width 1200px, centered |
| Tablet 768–991px | Two-column layout where practical; Summary/Description keep full available width |
| Mobile < 768px | All fields stack vertically; buttons full-width and touch-sized (min 44px height); no horizontal scrolling anywhere |
| All sizes | No clipped labels, no overlapping validation messages, no hidden buttons, attachment file names truncate with ellipsis + full name in a tooltip rather than overflowing |

## 8. Accessibility

- All form controls have an associated `<label>` (not placeholder-only labeling)
- Focus indicators are never removed (`outline: none` without a replacement is not used)
- Icon-only buttons have `aria-label` and `title`
- Badges and states never rely on color alone — text label always present
- Color contrast for text on colored backgrounds meets at least WCAG AA (4.5:1 for normal text)
- Keyboard users can complete Create Ticket, My Tickets filtering, and Attachment removal entirely
  without a mouse

## 9. Visual Inspection / Screenshot Plan

Screenshots required under `artifacts/lab-02/screenshots/` (desktop / tablet / mobile for each):
- `create-ticket/` — initial, validation-failure, submitting, success, API-failure, invalid-attachment
- `my-tickets/` — populated list, empty state, no-results state, filters applied
- `ticket-detail/` — owned ticket view, attachments panel (active + removed), not-found state

Checklist to confirm before marking a screen done:
- [ ] No clipped labels or truncated buttons at any of the three widths
- [ ] No overlapping validation messages
- [ ] No unintended horizontal scroll
- [ ] Badge colors/text match Section 5 exactly
- [ ] Read-only vs. editable fields are visually distinguishable at a glance
- [ ] Screenshot matches this document and Figure 1's general layout intent, not personal memory