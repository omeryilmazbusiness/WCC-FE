# WCC-FE — WODI Command Center Frontend

Next.js 15 App Router frontend for the internal Hajj/Umrah Command Center (F1–F4 skeleton).

## Architecture

Feature-Sliced Design (SOLID-friendly):

```
src/
  app/                 # Next.js routes (thin)
  views/               # Page compositions
  widgets/             # AppShell, Customer360
  features/            # auth-by-credentials, switch-locale, create-customer
  entities/            # user, customer, lead, booking
  shared/              # api, ui kit, i18n, config
```

Dependency rule: `app → views → widgets → features → entities → shared`

## Stack

- Next.js 15 + React 19
- Tailwind CSS v4 + design tokens
- next-intl (EN LTR / AR RTL)
- shadcn-style UI (Form, Dialog, DataTable, Tabs)
- Zod + React Hook Form

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
```

## Demo login

Works offline via demo auth fallback (or against `wodi-crm-be`):

| Email | Password | Lands on |
|-------|----------|----------|
| `manager@wodi.local` | `ChangeMe123!` | `/manager` |
| `gm@wodi.local` | `ChangeMe123!` | `/manager` |
| `sales@wodi.local` | `ChangeMe123!` | `/workspace` |

## F1–F4 coverage

| Task | Status |
|------|--------|
| F1 App shell + auth gate + AR/EN | Done |
| F2 Tokens + Form/Table/Dialog kit | Done |
| F3 Login + role routing | Done |
| F4 Customer 360 MVP skeleton | Done (memory repo + tabs) |
