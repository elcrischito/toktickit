# Sprint 3 Engineering Specification — TokTickIT

## 1. Sprint Goal
Deliver real email/password authentication, mandatory first-login password change, role-based navigation, server-side authorization, an IT Staff ticket queue and detail workflow, and a minimalist Administrator user management screen while preserving all Lab 2 Requester functions.

## 2. Stakeholder Request
Replace the temporary Development Requester selector with secure authentication and first-login password updates. Requesters manage their own tickets using their authenticated identity. IT Staff receive a ticket queue to view, claim, reassign, prioritize, update status, and communicate via Public Comments and private Internal Notes. Administrators get a simple user management interface to create and edit accounts, assign roles, activate/deactivate users, and issue initial passwords.

## 3. Scope
- **Included:**
  - Email/password login, logout, current user session retrieval, and initial password change enforcement.
  - Role-based authorization for Requester, IT Staff, and Administrator.
  - IT Staff Ticket Queue (search, filter, sort, pagination) and Ticket Detail workflow.
  - Public Comments (visible to all roles) and Internal Notes (IT Staff and Administrator only).
  - Minimalist Administrator User Management (list, search, role filter, create user, edit basic info, toggle active state, reset initial password).
  - Migration of Lab 2 Development Requesters to the User model.
- **Excluded:**
  - Email delivery, password-reset links, MFA, SSO, and self-registration.
  - Actions Taken tracking (deferred to Lab 4) and formal SLA calculations.
  - Multiple roles per user, user deletion, bulk operations, and extended user profiles.

## 4. Functional Requirements
- **FR-01 (Auth):** The system shall authenticate users using email and password, returning session token/cookie and user details.
- **FR-02 (Password Change):** The system shall force users with an initial password flag (`mustChangePassword: true`) to set a new password before accessing application features.
- **FR-03 (Requester Integration):** Requester ticket operations shall automatically use the authenticated user ID rather than client-provided requester IDs.
- **FR-04 (IT Staff Queue):** The system shall allow IT Staff to view tickets with search, filtering (by status, priority, category), sorting, and pagination.
- **FR-05 (IT Staff Workflow):** IT Staff shall be able to claim ownership, reassign tickets, update IT Priority, and transition ticket statuses according to permitted rules.
- **FR-06 (Comments & Notes):** IT Staff and Requesters can post Public Comments on tickets. IT Staff and Administrators can add and view private Internal Notes.
- **FR-07 (Admin User Management):** Administrators shall be able to list, search, filter, create, edit basic details, activate/deactivate, and reset initial passwords for users.

## 5. Business Rules
- **BR-01:** Only active users with valid credentials may authenticate.
- **BR-02:** A user marked as requiring a password change cannot access normal application endpoints until a valid new password is saved.
- **BR-03:** The authenticated user identity, not a client-supplied parameter, determines ownership of Requester operations.
- **BR-04:** Public Comments are visible to Requester, IT Staff, and Administrator. Internal Notes are visible only to IT Staff and Administrator.
- **BR-05:** A Requester may indicate that a problem appears resolved, but cannot directly set the ticket status to Resolved or Closed.
- **BR-06:** An Administrator cannot deactivate their own account or deactivate the last remaining active Administrator.
- **BR-07:** User deletion is prohibited; account removal is handled exclusively via deactivation.
- **BR-08:** Passwords must be at least 8 characters long and contain uppercase, lowercase, numeric, and special characters.

## 6. UI Specification Summary
- **App Shell:** Displays current user name, role badge, navigation permitted for the role, and a Logout action.
- **Login Screen:** Email/password form with client validation, busy states, and safe authentication error messaging.
- **Password Change Screen:** Displayed when `mustChangePassword` is active; blocks navigation until completed.
- **IT Staff Queue:** Data table listing tickets with status badges, priority badges, assigned owner, search bar, filters, and pagination.
- **IT Staff Detail:** Expanded view with editable IT fields (Owner, IT Priority, Status), distinct tabs/sections for Public Comments and Internal Notes.
- **Admin User Management:** Table of users with search/filter, "Create User" slide-over/modal, and "Edit User" drawer.

## 7. Data Changes
- **User Model:** Fields for `id`, `fullName`, `email` (unique), `passwordHash`, `role` (ENUM: REQUESTER, IT_STAFF, ADMIN), `isActive`, `mustChangePassword`, `createdAt`, `updatedAt`.
- **Ticket Model Extensions:** Added foreign key `ownerId` (references User), `itPriority` (ENUM), updated status fields.
- **Comment & Note Models:** `PublicComment` and `InternalNote` models linked to `ticketId` and `authorId`.
- **Migration:** Existing Lab 2 Development Requesters migrated into the `User` table as active `REQUESTER` accounts with hashed default passwords.

## 8. API Contract Summary
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`
- `GET /api/staff/tickets` (Queue query with `search`, `status`, `priority`, `page`, `limit`, `sortBy`)
- `PATCH /api/staff/tickets/:id` (Assign owner, set IT Priority, change status)
- `GET/POST /api/tickets/:id/comments` (Public Comments)
- `GET/POST /api/tickets/:id/notes` (Internal Notes — restricted)
- `GET/POST/PATCH /api/admin/users` (User management endpoints — Admin restricted)

## 9. Acceptance Criteria
- **AC-01:** Given valid credentials for an active user, when login is submitted, then authentication succeeds and returns user info with role.
- **AC-02:** Given a user with `mustChangePassword=true`, when logging in, application navigation is blocked until a valid new password is set.
- **AC-03:** Given an authenticated Requester, ticket operations restrict results strictly to tickets owned by that authenticated user.
- **AC-04:** Given a Requester requesting Internal Notes endpoints, the backend returns a 403 Forbidden response without revealing note contents.
- **AC-05:** Given an Administrator, attempting to deactivate their own account or the last active Administrator returns a validation error.

## 10. Definition of Done
- Specification, API spec, UI spec, and Test plan completed and committed to `docs/lab-03/`.
- All database migrations and seed scripts executed successfully.
- All backend routes enforced with JWT/session role-based authorization.
- UI screens created adhering to Zen Green design guidelines and responsive rules.
- Automated tests (unit, integration, API, UI, E2E) pass with 100% success rate on `main`.

## 11. Assumptions and Decisions
- Passwords stored securely using `bcrypt` (10 salt rounds).
- Stateful JWT stored in HTTP-only secure cookie or Authorization header.
