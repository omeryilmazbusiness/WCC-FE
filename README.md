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
```

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
| F4 Customer 360 MVP | Done (memory; leads from pipeline store) |
| F5 CRM Pipeline (Kanban + table) | Done (memory demo) |
| F6 Bookings | Deferred — Customer 360 tab stub only |
| F7 Packages / Departures | Done (memory demo) |
| F8 Task queue | Placeholder on workspace |

## New screen rule

Use `@/shared/ui` (`ListScreen`, `SearchFilterBar`, `Button`, …). Do not reinvent search, filters, or chrome.
