# ProjectCore — Completion Plan

## Audit of what's already built
**Working:** Auth (email + invitation), multi-tenant companies/profiles/user_roles with RLS, Projects (list + detail with 7 tabs), Tasks (board + Gantt planning), Daily Reports (with photos, equipment, materials), BOQ, RFIs, Submittals, Drawings, Documents, Approvals workflow, Reports (PDF), Dashboard (real KPIs + alerts + plan-vs-actual), Notifications bell + cron, Audit log viewer, Settings (company + users + invitations).

**Missing / incomplete (per the full spec):**
1. Procurement suite (material requests, RFQs, POs, deliveries, suppliers)
2. Variations + Payment Claims (IPC)
3. Quality inspections, Safety inspections, NCRs, Snags
4. Risk register, Issue register
5. Meeting minutes + action items
6. Resources (manpower) + Equipment + Timesheets
7. Milestones UI (table exists)
8. Comments UI (table exists)
9. Client Portal (restricted view)
10. AI Assistant placeholder page
11. Role/permission matrix UI + permission helper (`can(action, module)`)
12. Notification preferences, integrations placeholders
13. Cost codes + Budget vs Actual page
14. Cash flow page
15. Custom report builder placeholder
16. Sample/demo data seeder

## Implementation phases (will execute in this order)

### Phase A — Schema foundation (one migration)
Create remaining tables with RLS + GRANTs scoped by `company_id` / `project_in_company()`:
`suppliers, procurement_requests, rfqs, purchase_orders, deliveries, variations, payment_claims, quality_inspections, safety_inspections, ncrs, snags, risks, issues, meetings, meeting_action_items, resources, equipment, timesheets, cost_codes, notification_preferences`.
Add `permissions` enum + helper RPC `can_user(action, module)`.

### Phase B — Procurement module
Server fns + pages: Material Requests, RFQs, POs, Deliveries, Suppliers. Project-scoped tabs + global lists. Approval-workflow hooks.

### Phase C — Cost control
Variations, Payment Claims (auto-calc gross/retention/advance/net from BOQ progress + approved variations), Cost Codes, Budget vs Actual, Cash Flow chart.

### Phase D — Quality, Safety, Snags, Risks, Issues
Five register pages with create/edit dialogs, status badges, photos, project filter.

### Phase E — Meetings, Milestones, Comments, Resources, Equipment, Timesheets
List + detail pages. Action items roll up to Tasks dashboard. Comments component reusable across modules.

### Phase F — Client Portal, AI Assistant, Permissions UI
- `/client` route gated by `client` role with restricted views.
- `/ai` placeholder with prompt UI (no API call).
- Settings → Roles & Permissions matrix editor + `can()` helper used to hide actions across the app.

### Phase G — Polish
- Demo data seeder (server fn callable from Settings).
- Notification preferences UI.
- Integrations placeholder cards.
- Sidebar reorganized to match spec's full section list.
- Empty/loading/error states audited across all list pages.

## Technical notes
- All new tables follow the public-schema grant pattern (`GRANT … TO authenticated`, `service_role`; RLS via `project_in_company()` / `current_company_id()`).
- All server logic via `createServerFn` (no edge functions).
- New pages use the existing `ProjectPicker`, status badge tokens in `src/lib/status.ts`, and shadcn `Tabs`/`Dialog`/`Table` primitives — no new UI libs.
- PDFs reuse `generatePdfReport` infrastructure.
- Each phase is shippable independently; preview stays green between phases.

## Scope this turn
Phase A (schema) only. After you approve the migration, I'll proceed Phase B → G in sequence, pausing only if a phase needs a decision from you.
