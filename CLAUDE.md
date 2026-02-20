# How Are My Finances — AI Context

Personal finance tracking app. Monorepo with separate frontend, backend, infra, and database directories.

## Project Structure

- `frontend/` — Vite + React 19 + TypeScript + shadcn/ui + Tailwind CSS PWA
- `backend/src/HowAreMyFinances.Api/` — C# .NET 10 AWS Lambda, Minimal API
- `backend/tests/HowAreMyFinances.Api.Tests/` — xUnit tests
- `supabase/` — Supabase CLI config + migrations (local dev via `supabase start`)
- `supabase/migrations/` — PostgreSQL migrations (applied in order)
- `database/migrations/` — Original migration files (reference copy)
- `backend/src/authorizer/` — Node.js Lambda authorizer (JWT validation, ES256/jose)
- `infra/modules/` — Terraform modules (api-gateway, lambda, lambda-authorizer, s3-frontend, cloudfront, supabase)
- `infra/environments/dev/` — Dev environment Terraform composition
- `shared/types/` — Shared TypeScript types (imported by frontend via `@shared` alias)
- `docs/phases/` — Implementation phase plans

## Key Commands

### Frontend
```bash
cd frontend && npm run dev          # Dev server at localhost:5173
cd frontend && npm run build        # Production build
cd frontend && npm run lint         # ESLint
cd frontend && npm run typecheck    # TypeScript check
cd frontend && npm run test         # Vitest
```

### Backend
```bash
cd backend && dotnet build          # Build all projects
cd backend && dotnet test           # Run all tests
cd backend/src/HowAreMyFinances.Api && dotnet run  # Run locally
```

### Local Supabase
```bash
supabase start                      # Start local stack (Docker)
supabase db reset                   # Apply migrations + seed data
supabase status                     # Show connection details
supabase stop                       # Stop local stack
```

## Conventions

- **Language**: British English in code, comments, and UI (en translations). Lithuanian for lt translations.
- **Frontend state**: TanStack Query for server state. React Context for auth only. No Redux/Zustand.
- **API client**: `frontend/src/api/client.ts` — fetch wrapper with Supabase JWT injection.
- **Feature structure**: `frontend/src/features/{name}/pages/`, `components/`, `hooks/`
- **i18n**: `frontend/src/i18n/{en,lt}/translation.json` — use `useTranslation()` hook. Category names come from DB (`name_en`/`name_lt` for system, `name` for user-created).
- **Database**: All tables have RLS enabled. Use `(SELECT auth.uid())` in policies for performance.
- **Backend auth (production)**: Node.js Lambda authorizer validates Supabase JWT (ES256 via `jose`). User ID passed to .NET Lambda via API Gateway authorizer context. Read by `AuthorizerContextMiddleware`.
- **Backend auth (local dev)**: `AuthMiddleware.cs` validates JWT directly via OIDC discovery. Switched by `ASPNETCORE_ENVIRONMENT` (Production vs Development).
- **Backend DB access**: Npgsql with service role key, always filter by validated `user_id`.
- **Money**: `NUMERIC(12, 2)` in DB, `decimal` in C#, `number` in TypeScript.
- **Dependencies**: Pin exact versions (no `^` or `~`).

## Architecture

- Frontend authenticates directly with Supabase Auth
- Frontend sends Supabase JWT to backend API via `Authorization: Bearer` header
- API Gateway v2 (HTTP API) with Lambda authorizer (Node.js) validates JWT, passes `userId` in context
- .NET Lambda reads `userId` from authorizer context, queries Supabase PostgreSQL via Npgsql
- .NET Lambda runs on ARM64 (Graviton) with 512 MB memory
- DB connection via Supabase Supavisor transaction-mode pooler (IPv4, port 6543) with `Pooling=false` (server-side pooling only)
- Frontend served from S3 + CloudFront

## Implementation Phases

Progress tracker for feature development. Each phase has a detailed plan in `docs/phases/`.

| # | Phase | Status | Description |
|---|-------|--------|-------------|
| 1 | [PWA & Mobile](docs/phases/phase-1-pwa-mobile.md) | Done | Mobile-first design, PWA install, bottom nav, touch UX |
| 2 | [Expenses CRUD](docs/phases/phase-2-expenses-crud.md) | Done | Core expense management within months |
| 3 | [Categories Management](docs/phases/phase-3-categories-management.md) | Done | Custom category create/edit/delete |
| 4 | [Recurring Expenses](docs/phases/phase-4-recurring-expenses.md) | Done | Templates that auto-generate monthly |
| 5 | [Month Dashboard](docs/phases/phase-5-month-dashboard.md) | Not Started | Category breakdown, per-day budget, progress bars |
| 6 | [Settings & Profile](docs/phases/phase-6-settings-profile.md) | Not Started | Language, currency, display name preferences |
| 7 | [Notifications](docs/phases/phase-7-notifications.md) | Not Started | Spending threshold alerts |
| 8 | [Receipt OCR](docs/phases/phase-8-receipt-ocr.md) | Not Started | Premium: scan receipts, auto-extract expenses |
| 9 | [Bank Integration](docs/phases/phase-9-bank-integration.md) | Not Started | Premium: OpenBanking auto-import transactions |

### What's Already Done
- Infrastructure: Terraform (API Gateway, Lambda, S3, CloudFront, Supabase)
- CI/CD: GitHub Actions pipeline (infra → DB migrations → backend → authorizer → frontend)
- Auth: Supabase Auth + Lambda authorizer + JWT middleware
- Database: Full schema with RLS (all tables created, including future ones)
- Backend: Months CRUD + Expenses CRUD + Categories CRUD + Recurring Expenses CRUD + Profile GET/PUT + health endpoint
- Frontend: Login/Register, Month list/detail pages, Expenses, Categories, Recurring Expenses, i18n (en/lt), PWA
- Shared types: Month, Expense, Category, RecurringExpense TypeScript interfaces
