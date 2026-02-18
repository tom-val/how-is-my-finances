# How Are My Finances

Personal finance tracking app — track monthly salary, expenses by category, recurring payments, and spending summaries.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React + TypeScript + shadcn/ui + Tailwind CSS |
| Backend | C# .NET 10 AWS Lambda (Minimal API) |
| API | AWS API Gateway v2 (HTTP API) |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth (email/password) |
| Infra | Terraform (including Supabase project provisioning) |
| CI/CD | GitHub Actions |
| PWA | vite-plugin-pwa (installable on mobile/desktop) |
| i18n | react-i18next (English + Lithuanian) |

## Project Structure

```
├── frontend/           Vite + React + TypeScript PWA
├── backend/            C# .NET 10 Lambda API
├── supabase/           Supabase CLI config + migrations
├── database/           Original migration files (reference)
├── infra/              Terraform modules and environments
└── shared/             Shared TypeScript types (used by frontend)
```

## Documentation

### Specs

- `supabase/migrations/` — Database schema and seed data

## Development

### Prerequisites

- Node.js 20+
- .NET 10 SDK
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) (`brew install supabase/tap/supabase`)
- Terraform 1.5+ (for infrastructure changes)
- AWS CLI (for deployment)

### Quick Start

```bash
# 1. Start local Supabase (PostgreSQL, Auth, Studio — requires Docker)
supabase start

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Create frontend .env (use values printed by `supabase start`)
cat > frontend/.env << 'EOF'
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase start>
VITE_API_URL=http://localhost:5000
EOF

# 4. Start frontend dev server
cd frontend && npm run dev

# 5. In a separate terminal — start backend API (uses appsettings.Development.json)
cd backend/src/HowAreMyFinances.Api && dotnet run
```

The frontend runs at http://localhost:5173, the API at http://localhost:5000, and Supabase Studio at http://127.0.0.1:54323.

### Local Supabase

The project uses Supabase CLI to run a full local stack via Docker. Configuration is in `supabase/config.toml`.

```bash
supabase start              # Start all services (first run downloads Docker images)
supabase status             # Show connection details (URLs, keys)
supabase db reset           # Re-apply all migrations + seed data from scratch
supabase stop               # Stop all services
```

`supabase start` prints all the values you need for `.env` files — API URL, anon key, service role key, and database URL.

#### Creating new migrations

```bash
supabase migration new <name>    # Creates a new timestamped .sql file in supabase/migrations/
```

Edit the generated file, then run `supabase db reset` to apply it locally.

### Frontend

```bash
cd frontend
npm install
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
npm run test         # Run tests
```

### Backend

```bash
cd backend
dotnet restore
dotnet build
dotnet test          # Run all unit tests
```

Local Supabase connection settings are in `appsettings.Development.json` — no env vars needed:

```bash
cd backend/src/HowAreMyFinances.Api
dotnet run           # Starts at http://localhost:5000
```

Health check: `curl http://localhost:5000/health`.

In production (Lambda), settings are injected via environment variables using .NET's section separator: `Supabase__Url`, `Supabase__ServiceKey`, etc.

### Infrastructure

```bash
cd infra/environments/dev
terraform init
terraform plan
terraform apply
```

## Database Migrations

### Local

Migrations live in `supabase/migrations/`. They are applied automatically when running `supabase start` or `supabase db reset`.

### Production

Migrations are deployed automatically via GitHub Actions when changes to `supabase/migrations/` are pushed to `main`. The workflow (`.github/workflows/deploy-migrations.yml`) reads the Supabase project reference from Terraform state and runs `supabase db push`.

You can also push migrations manually:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

## Bootstrap (One-Time Setup)

Four steps are required before the first deployment. Everything else is managed by Terraform in the CD pipeline.

**1. Create Terraform state backend**

```bash
aws s3api create-bucket --bucket how-is-my-finances-terraform-state --region eu-central-1 \
  --create-bucket-configuration LocationConstraint=eu-central-1
aws s3api put-bucket-versioning --bucket how-is-my-finances-terraform-state \
  --versioning-configuration Status=Enabled
aws dynamodb create-table --table-name how-is-my-finances-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST --region eu-central-1
```

**2. Create IAM role for GitHub Actions**

In the AWS Console: IAM > Roles > Create role > Web identity

| Field | Value |
|---|---|
| Identity provider | `token.actions.githubusercontent.com` (select "Create new" if not listed) |
| Audience | `sts.amazonaws.com` |
| GitHub organization | `tom-val` |
| GitHub repository | `how-is-my-finances` |
| GitHub branch | `*` (allows both PRs and main) |

On the next screen, attach the **`AdministratorAccess`** policy. Name the role **`how-is-my-finances-github-actions`** and create it.

Note the role ARN (e.g. `arn:aws:iam::123456789012:role/how-is-my-finances-github-actions`).

**3. Create a Supabase account**

1. Sign up at [supabase.com](https://supabase.com) (an organisation is created automatically)
2. Generate a management API token: [Dashboard > Account > Access Tokens](https://supabase.com/dashboard/account/tokens)
3. Note your organisation ID from the dashboard URL: `https://supabase.com/dashboard/org/<org-id>`
4. Choose a database password (any strong password — Terraform passes it to Supabase when creating the project)

You do **not** need to create a Supabase project manually — Terraform provisions it automatically on first `terraform apply`.

**4. Configure GitHub repository**

In the repo settings (Settings > Secrets and variables > Actions):

| Type | Name | Value |
|---|---|---|
| Secret | `AWS_ROLE_ARN` | Role ARN from step 2 |
| Secret | `SUPABASE_ACCESS_TOKEN` | Management API token from step 3 |
| Secret | `SUPABASE_ORGANIZATION_ID` | Organisation ID from step 3 (UUID from dashboard URL) |
| Secret | `SUPABASE_DATABASE_PASSWORD` | Password you chose in step 3 |

After this, push the code to `main` and the CD workflows will create all AWS resources, provision the Supabase project + database, and apply migrations automatically.

## Configuration

### Environment Variables

**Frontend** (`frontend/.env`) — required, no defaults:

| Variable | Description | Local value |
|----------|-------------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL | `http://127.0.0.1:54321` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | From `supabase start` |
| `VITE_API_URL` | Backend API URL | `http://localhost:5000` |

**Backend** — local defaults are in `appsettings.Development.json`. In production (Lambda), values are set via env vars with `Supabase__` prefix:

| Env var (Lambda) | appsettings key | Description |
|------------------|-----------------|-------------|
| `Supabase__Url` | `Supabase:Url` | Supabase project URL |
| `Supabase__ServiceKey` | `Supabase:ServiceKey` | Supabase service role key |
| `Supabase__DbConnectionString` | `Supabase:DbConnectionString` | PostgreSQL connection string |

### GitHub Secrets (for CI/CD)

Infrastructure values (API URL, S3 bucket, CloudFront ID, Lambda name, Supabase URL, anon key, project ref) are read from Terraform state — no need to set them as secrets.

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN` | IAM role ARN for GitHub Actions OIDC (from bootstrap step 2) |
| `SUPABASE_ACCESS_TOKEN` | Supabase management API token (from [dashboard](https://supabase.com/dashboard/account/tokens)) |
| `SUPABASE_ORGANIZATION_ID` | Supabase organisation ID |
| `SUPABASE_DATABASE_PASSWORD` | Password for the Supabase database |
