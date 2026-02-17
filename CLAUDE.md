# How Is My Finances — AI Context

Personal finance tracking app. Monorepo with separate frontend, backend, infra, and database directories.

## Project Structure

- `frontend/` — Vite + React 19 + TypeScript + shadcn/ui + Tailwind CSS PWA
- `backend/src/HowIsMyFinances.Api/` — C# .NET 10 AWS Lambda, Minimal API
- `backend/tests/HowIsMyFinances.Api.Tests/` — xUnit tests
- `supabase/` — Supabase CLI config + migrations (local dev via `supabase start`)
- `supabase/migrations/` — PostgreSQL migrations (applied in order)
- `database/migrations/` — Original migration files (reference copy)
- `infra/modules/` — Terraform modules (api-gateway, lambda, s3-frontend, cloudfront, supabase)
- `infra/environments/dev/` — Dev environment Terraform composition
- `shared/types/` — Shared TypeScript types (imported by frontend via `@shared` alias)

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
cd backend/src/HowIsMyFinances.Api && dotnet run  # Run locally
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
- **Backend auth**: Supabase JWT validated in `AuthMiddleware.cs` via JWKS endpoint (ES256). User ID extracted from `sub` claim.
- **Backend DB access**: Npgsql with service role key, always filter by validated `user_id`.
- **Money**: `NUMERIC(12, 2)` in DB, `decimal` in C#, `number` in TypeScript.
- **Dependencies**: Pin exact versions (no `^` or `~`).

## Architecture

- Frontend authenticates directly with Supabase Auth
- Frontend sends Supabase JWT to backend API via `Authorization: Bearer` header
- Backend (Lambda) validates JWT, queries Supabase PostgreSQL via Npgsql
- API Gateway v2 (HTTP API) routes all requests to a single Lambda
- Frontend served from S3 + CloudFront
