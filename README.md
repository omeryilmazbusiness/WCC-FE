# WCC-FE — WODI Command Center Frontend

Next.js 15 App Router frontend for the internal Hajj/Umrah Command Center.

## Architecture

Feature-Sliced Design (SOLID-friendly):

```
src/
  app/                 # Next.js routes (thin)
  views/               # Page compositions
  widgets/             # AppShell, Customer360, CRM pipeline, packages board
  features/            # auth, leads, packages, notifications, locale
  entities/            # user, customer, lead, booking, tourpackage
  shared/              # api, ui kit, i18n, config
```

Dependency rule: `app → views → widgets → features → entities → shared`

## Stack

- Next.js 15 + React 19
- Tailwind CSS v4 + Soft Light design tokens
- next-intl (EN LTR / AR RTL)
- Shared UI kit (`ListScreen`, `SearchFilterBar`, Dialog, DataTable, …)
- Zod + React Hook Form

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test:e2e
```

## Epic 0 foundation

| Task | Status |
|------|--------|
| T-007 App shell + routing + desktop-first | Done |
| T-008 Design system (forms/tables/drawer/badges/empty/error) | Done |
| T-009 i18n RTL/LTR + date/number/currency formatters | Done |
| T-010 Auth session + protected routes + API client | Done |

## Epic 1 identity & admin

| Task | Status |
|------|--------|
| T-018 Login / session expiry UX | Done |
| T-019 Admin Users list/create/edit | Done |
| T-020 Role permission matrix UI | Done |
| T-021 Branch/team selector + scoped navigation | Done |
| T-022 Audit log viewer | Done |

## Epic 2 Customer 360

| Task | Status |
|------|--------|
| T-030 Customers list search + create (duplicate warn) | Done |
| T-031 Customer 360 tabs (identity/family/history/docs/payments/tasks/notes/activity) | Done |
| T-032 Edit customer PII | Done |
| T-033 Merge + companions UX | Done |

API-backed via `createCustomerRepository()` with memory demo fallback.

## Epic 3 CRM / Lead Pipeline

| Task | Status |
|------|--------|
| T-041 Pipeline Kanban view | Done |
| T-042 Pipeline table + filters | Done |
| T-043 Lead card + detail drawer | Done |
| T-044 Stage drag/change + history | Done |
| T-045 Assign / bulk assign | Done |
| T-046 Convert to booking + mark lost | Done |

API-backed via `createLeadRepository()` with memory demo fallback.

## Epic 4 Packages / Departures / Capacity

| Task | Status |
|------|--------|
| T-054 Package list/create/edit/clone | Done |
| T-055 Departure create/manage + capacity UI | Done |
| T-056 Pricing tiers editor | Done |
| T-057 Departure readiness summary | Done |
| T-058 Close sales / mark full | Done |

API-backed via `createTourPackageRepository()` with memory demo fallback.

## Epic 5 Booking Workspace

| Task | Status |
|------|--------|
| T-067 Bookings list + status filter | Done |
| T-068 Booking detail workspace | Done |
| T-069 Participants + line items editor | Done |
| T-070 Checklist + readiness panel | Done |
| T-071 Confirm with capacity/readiness gates | Done |
| T-072 Customer 360 / convert / departure links | Done |

API-backed via `createBookingRepository()` with memory demo fallback.

## Epic 6 Tasks & Workflow

| Task | Status |
|------|--------|
| T-079 My Tasks list + Kanban | Done |
| T-080 Manager team tasks view | Done |
| T-081 Task create/complete/reschedule/reassign | Done |
| T-082 Overdue/escalated badges + deep-link | Done |
| T-083 Bulk assignment UI | Done |

API-backed via `createTaskRepository()` with memory demo fallback.

## Epic 7 Manager + Employee Workspaces

| Task | Status |
|------|--------|
| T-084 Manager KPIs + period filter | Done |
| T-085 KPI drill-downs to pipeline/tasks/bookings | Done |
| T-086 Team performance table | Done |
| T-087 Attention / exception feed | Done |
| T-088 Period scope (7/30/90) | Done |
| T-089 Employee My Work Today | Done |
| T-090 Target progress (personal / branch) | Done |
| T-091–T-096 Quick actions + role homes | Done |

API-backed via `createDashboardRepository()` with memory demo fallback.

## Epic 8 Unified Inbox + Integrations + SLA

| Task | Status |
|------|--------|
| T-109 3-pane Unified Inbox | Done |
| T-110 Composer (reply / internal note) | Done |
| T-111 Assign + create/match actions | Done |
| T-112 Create lead/task/booking from thread | Done |
| T-113 Unanswered age + SLA filters | Done |
| T-114 Channel health strip | Done |
| T-115 Mark spam / duplicate / resolved | Done |
| Channel Connect (WA / IG / FB / Gmail BYO credentials) | Done |

API-backed via `createConversationRepository()` with memory demo fallback.

**Connect:** each channel opens a credential dialog (Meta access token + IDs, or Gmail OAuth client/refresh). Tokens POST to `/integrations/accounts/{provider}/connect` and are stored per branch. After save, copy the webhook URL + verify token into Meta Developer.

## Epic 9 Finance, Payments & Revenue Metrics

| Task | Status |
|------|--------|
| T-124 Booking financial panel | Done |
| T-125 Payment record/verify UI | Done |
| T-126 Schedule/promise UI | Done |
| T-127 Refund/adjustment approval flow | Done |
| T-128 Finance queues screens | Done |
| T-129 Finance export | Done |

API-backed via `createPaymentRepository()` with memory demo fallback. Booking detail → **Finance** tab; nav → `/finance` queues + CSV export.

## Epic 10 Revenue Target & Performance Engine

| Task | Status |
|------|--------|
| T-138 Target configuration panel | Done |
| T-139 Progress hero + forecast + required pace | Done |
| T-140 Seasonality editor | Done |
| T-141 Contribution table + ranking | Done |
| T-142 Cumulative actual vs expected chart | Done |
| T-143 Drill-down to source records | Done |

API-backed via `createRevenueTargetRepository()`; screen `/targets`.

## Epic 11 Excel Import/Export

| Task | Status |
|------|--------|
| T-152 Import wizard upload → map → validate → confirm | Done |
| T-153 Mapping templates + header auto-suggest (approve) | Done |
| T-154 Import history + error download | Done |
| T-155 Export builder UI | Done |

API-backed via `createImportExportRepository()`; screen `/import-export`.

## Epic 12 Documents, Visa & Suppliers

| Task | Status |
|------|--------|
| T-166 Documents checklist by participant | Done |
| T-167 Upload / classify / review / reject UX | Done |
| T-168 Visa timeline UI | Done |
| T-169 Departure missing-docs bulk view / export | Done |
| T-170 Supplier directory + detail | Done |
| T-171 Link supplier + confirmation tracking | Done |
| T-172 Booking readiness panel (missing docs + override) | Done |

API-backed via `createDocumentRepository()` / `createVisaRepository()` / `createSupplierRepository()` with memory fallback.

- Booking detail → **Documents** / **Visa** tabs; readiness shows missing docs + override dialog
- Nav (manager/ops) → `/suppliers`, `/missing-docs`

## Epic 16 P2 Advanced Extensions

| Task | Status |
|------|--------|
| T-205 Connected file sync status UI | Done |
| T-206 Advanced supplier invoice / cost screens | Done |
| T-207 Future integration placeholders | Done |

- Import/Export → **Sync** tab (`FileSyncPanel`) — OneDrive/SharePoint connections, conflict policy, runs
- Suppliers → **Invoices / Costs** tab — draft→paid invoice lifecycle (minor units)
- Nav → `/integrations` — accounting / GDS / payment gateway stubs (enable + probe)
- Entities: `filesync`, `extint`; supplier API extended for invoices; memory fallbacks included

## Epic 17 Cross-Cutting Hardening & Definition of Done

| Task | Status |
|------|--------|
| T-213 RTL/LTR visual QA (Manager, Employee, Inbox, Booking) | Done |
| T-214 Mobile usability (inbox / booking / tasks) | Done |
| T-215 UI acceptance scenarios (PDF gate surfaces) | Done |
| T-216 Empty / loading / error / permission-denied polish | Done |
| T-217 Acceptance gate sign-off pack | Done (shared checklist in BE docs) |

- Shared UI: `LoadingState`, `PermissionDenied`, `QueryState` (composes empty/error/loading/denied)
- Shell: left sidebar always visible; touch-target CSS for inbox/tasks
- RTL: `[dir=rtl]` font + chrome rules in `globals.css`
- E2E: `e2e/epic17-acceptance.spec.ts`

## Epic 18 %100 Gap Closure

| Task | Status |
|------|--------|
| T-219 Integration connection config UI | Done |
| T-220–T-227 Admin settings hub (SLA, escalation, lost reasons, templates, fields, thresholds) | Done |
| T-229 Rooming / group list screen + CSV | Done |
| T-230 Dashboard Booked / Collected / Margin labels | Done |
| T-232 Next-task suggestion UX (inbox outcome → confirm) | Done |
| T-233 Global search (header) | Done |
| T-235 Supplier issue history panel | Done |

- `/admin/settings` — GM/admin settings hub
- `/rooming` — manager/operations departure rooming
- Header global search; manager monetary KPI cards; inbox next-task confirm; suppliers Issues tab
- Entities: `adminconfig`, `rooming`, `search` (+ supplier issues / conversation suggest)

## Demo login

Works offline via demo auth fallback (or against `wodi-crm-be`):

| Email | Password | Lands on |
|-------|----------|----------|
| `manager@wodi.local` | `ChangeMe123!` | `/manager` |
| `gm@wodi.local` | `ChangeMe123!` | `/manager` |
| `sales@wodi.local` | `ChangeMe123!` | `/workspace` |

## F1–F8 coverage

| Task | Status |
|------|--------|
| F1 App shell + auth gate + AR/EN | Done |
| F2 Tokens + Form/Table/Dialog kit | Done |
| F3 Login + role routing | Done |
| F4 Customer 360 MVP | Done (API + memory fallback; merge/companions/timeline) |
| F5 CRM Pipeline (Kanban + table) | Done (API + memory fallback; assign/convert/history) |
| F6 Bookings | Done (API + memory fallback; workspace, readiness, 360/convert/packages links) |
| F7 Packages / Departures | Done (API + memory fallback; tiers/capacity/close sales) |
| F8 Task queue | Done (API + memory fallback; mine/team, overdue, bulk assign) |
| F9 Manager / Employee dashboards | Done (API + memory fallback; KPIs, attention, targets, my-work) |
| F10 Unified Inbox | Done (API + memory fallback; 3-pane, SLA filters, channel health) |

## New screen rule

Use `@/shared/ui` (`ListScreen`, `SearchFilterBar`, `Button`, …). Do not reinvent search, filters, or chrome.
