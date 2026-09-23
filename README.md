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

## New screen rule

Use `@/shared/ui` (`ListScreen`, `SearchFilterBar`, `Button`, …). Do not reinvent search, filters, or chrome.
