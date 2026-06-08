
# ProjectCore — Phased Build Plan

Massive scope. I'll build it in phases, ship working slices each turn, and ask before moving to the next phase.

## Phase 1 (this build) — Foundation + shell

**Backend (Lovable Cloud / Supabase)**
- Enable Cloud.
- Schema (migrations):
  - `companies`, `profiles` (linked to `auth.users`), `app_role` enum (15 roles), `user_roles` table + `has_role()` security-definer fn
  - `projects`, `project_members`
  - `tasks`, `milestones`, `daily_reports`, `boq_items`, `rfis`, `submittals`, `documents`, `drawings`, `approvals`, `notifications`, `comments`, `audit_logs` — created as empty tables now so later phases just add columns/UI
- RLS: company-scoped on every table via `profiles.company_id`; role checks via `has_role()`. Grants per public-schema rules.
- Invite-only signup: Company Admin creates invite rows; signup page consumes invite token. Email+password auth.

**Frontend (TanStack Start)**
- Apply design tokens from chosen prototype to `src/styles.css` (Inter + Space Grotesk via `<link>` in `__root.tsx`, dark navy `#0a0c10` sidebar, orange `#f97316` accent, sharp `rounded-sm` corners).
- Layout: `_authenticated/route.tsx` with `AppSidebar` (13 nav items, active state, mini-collapse) + top header (page title + system badge + user).
- Routes scaffolded under `_authenticated/`:
  - `/dashboard` — full implementation matching prototype: 6 KPI cards, planned-vs-actual bar chart (Recharts), Critical Alerts panel, Recent Daily Reports table. Wired to real queries via `createServerFn`.
  - `/projects`, `/tasks`, `/daily-reports`, `/boq`, `/rfis`, `/submittals`, `/documents`, `/drawings`, `/approvals`, `/reports`, `/settings` — list-page stubs with consistent header + empty state. Real implementations in later phases.
- Public routes: `/auth` (login + invite-token signup), `/` redirects to `/dashboard` or `/auth`.

## Phase 2 — Projects + Tasks + Daily Reports (functional)
Project CRUD, project detail with tabs (Overview/Tasks/Daily Reports working, others stubbed), task board, daily report form (date, weather, manpower, equipment, work completed, materials, issues, photos via Storage, next day plan).

## Phase 3 — Workflows
RFIs, Submittals, Approvals, Documents/Drawing Register with full status state machine (Draft → Submitted → Under Review → Approved/Rejected/Revise/Closed), comments, notifications bell.

## Phase 4 — BOQ + Reports + Automation
BOQ items with progress %, planned-vs-actual computation, PDF generation (server fn using pdf-lib) for daily/weekly/monthly/RFI log/submittal log/document register/BOQ/approvals reports, pg_cron jobs for overdue reminders + missing daily report + document expiry + weekly summary, in-app + email notifications.

## Phase 5 — Polish
Gantt view, audit log viewer, settings (company, members, roles), mobile responsive pass, hardening.

## Technical notes
- Stack stays: TanStack Start + Supabase + Tailwind v4 + shadcn.
- Roles stored in `user_roles` (never on profiles) — privilege-escalation safe.
- All Supabase reads via `createServerFn` with `requireSupabaseAuth`; admin client only for invite acceptance and cron.
- Charts: Recharts (already in shadcn ecosystem).
- PDF: `pdf-lib` (Worker-compatible).
- Cron: pg_cron hitting `/api/public/cron/*` routes with HMAC signature.

## What ships at end of Phase 1
A signed-in user lands on a working dashboard that matches the chosen design, with KPIs/charts/tables driven by real DB queries (empty-state ready), and can navigate to every module (stub pages). All schema in place so subsequent phases are pure feature work.
