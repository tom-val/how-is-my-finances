# Phase 10 — Bank Integration (Enable Banking)

Import Swedbank (and other EEA bank) transactions via Enable Banking's PSD2 aggregator API and turn them into suggested expenses/incomes that the user reviews before they are saved. Categories are suggested by OpenAI (`gpt-6-luna`) from the user's existing categories, using the same async SQS + Node.js AI processor pattern as `how-is-my-food-planning` (shopping list categorisation).

## Status: Implemented (awaiting end-to-end verification with a real bank login)

### Changes from the original plan (decided 2026-10-31)
- **Pending (PDNG) transactions are imported too**, with `booking_status = 'pending'`, so card payments show up while still reserved. Un-reviewed pending rows that disappear from the bank's PDNG list are deleted. A booked row matching an *accepted* pending row (amount, ±3 days, counterparty key) is auto-linked to the same expense.
- **Android "Bank notifications" source**: Settings → Transaction source lets an Android device use the Swedbank app's notifications instead of Enable Banking. A local Expo module (`app/modules/bank-notifications`, a `NotificationListenerService`) captures notifications from `lt.swedbank.mobile` only. The app uploads them to `POST /v1/bank/notifications`, and the AI processor's `parse_bank_notifications` job extracts direction, amount, merchant, date, category and vendor. Rows carry `source = 'notification'` and a `parse_status`, and feed the same inbox. Raw text is stored so regex rules can be added once real samples exist.
- **Navigation**: the Inbox replaces Categories in the tab bar (with a pending-count badge). Categories moved to Settings → Categories.
- **Any bank**: the connect dialog has a country picker and lists every bank Enable Banking supports. Restricted mode only returns accounts linked in the Control Panel; unrestricted production needs no code change.
- The migration is `supabase/migrations/20261101000001_bank_integration.sql`, which extends the SQL below with `source`, `parse_status`, `booking_status`, the notification columns and `bank_connections.client`.

## Why Enable Banking

- GoCardless Bank Account Data (ex-Nordigen) stopped accepting new sign-ups in mid-2025.
- Going directly to Swedbank's PSD2 API requires an AISP licence + eIDAS certificates — not viable.
- Enable Banking offers a **restricted production mode**: no contract, but only accounts the app owner has linked in the Enable Banking Control Panel are returned. That is enough for personal use at no cost.
- Moving to other users later = signed contract + KYB with Enable Banking (volume-based pricing). No code changes.

## Scope

- Connect a bank (OAuth-style redirect via Enable Banking)
- **Manual sync only**: the user presses "Sync" and booked transactions are fetched. No background or automatic sync.
- AI category suggestion (`gpt-6-luna`) from the user's existing categories, plus a per-counterparty memory so the same merchant is not sent to the AI twice
- Suggestions inbox: accept (creates expense/income), dismiss, or link to an existing expense
- Duplicate detection against manually entered and recurring expenses
- Consent expiry warning + reconnect

Out of scope: scheduled/background sync, auto-accept, payment initiation, multi-currency conversion.

## Enable Banking — Setup (one-off, manual)

1. Sign up at the Enable Banking Control Panel, create an application with environment **Production**.
2. Generate the key pair in the browser; download the private key (`<application-id>.pem`). The application ID is the JWT `kid`.
3. Allowed redirect URLs: `https://finances.valiunas.dev/bank/callback` (only `https` is accepted; `http://localhost` and custom schemes like `finansai://` are rejected). The native app reuses this URL through a bounce page (see **Redirect round-trip** below), so it needs no URL of its own.
   Local web dev (Expo web on `http://localhost:6173`) can't receive the redirect directly. Either register `https://localhost:6173/bank/callback` and serve the dev server over HTTPS (e.g. a local TLS proxy with `mkcert` certs; backend CORS `AllowedOrigins` then needs `https://localhost:6173`), or use the fallback: after the bank redirects to `https://finances.valiunas.dev/bank/callback?code=…&state=…`, change the host in the address bar to `http://localhost:6173` and keep the query string. Codes are short-lived, so do it promptly. Native dev builds need neither: the production bounce page hands the code to whichever build owns the `finansai://` scheme on the device.
4. **Activate by linking accounts**: in the Control Panel, link your own Swedbank LT account(s). Only these accounts are visible in restricted mode.
5. Swedbank LT is supported (confirmed on Enable Banking's Open Banking APIs list: "Swedbank", BIC `HABALT22`, AISP + PISP, Production + Sandbox). Use connector `aspsp = { name: "Swedbank", country: "LT" }` with `psu_type: "personal"`; `SwedbankBusiness` is the business-account connector. Read `maximum_consent_validity` from `GET /aspsps?country=LT` once the app is registered.
6. Base64-encode the private key (`base64 -i <application-id>.pem | tr -d '\n'`) and store it as GitHub secret `ENABLE_BANKING_PRIVATE_KEY_B64`, with the application ID as `ENABLE_BANKING_APPLICATION_ID` (see Infrastructure).

## Enable Banking — API Flow

Base URL: `https://api.enablebanking.com`. Every request carries `Authorization: Bearer <app JWT>`.

App JWT (RS256, signed with the private key, cache and reuse until ~5 min before expiry):
- Header: `{ "typ": "JWT", "alg": "RS256", "kid": "<application-id>" }`
- Claims: `iss = "enablebanking.com"`, `aud = "api.enablebanking.com"`, `iat = now`, `exp = now + 3600`

| Step | Call | Notes |
|------|------|-------|
| List banks | `GET /aspsps?country=LT` | Used by the connect wizard |
| Start auth | `POST /auth` | Body: `access.valid_until`, `aspsp { name, country }`, `state`, `redirect_url`, `psu_type: "personal"`. Response `url` → redirect user |
| Callback | Browser lands on `redirect_url?code=…&state=…` | |
| Create session | `POST /sessions` `{ code }` | Response: `session_id`, `accounts[]` (`uid`, `account_id.iban`, `name`, `currency`), `access.valid_until` |
| Session status | `GET /sessions/{session_id}` | `status` (e.g. `AUTHORIZED`), `access.valid_until` |
| Transactions | `GET /accounts/{uid}/transactions` | Query: `date_from`, `date_to`, `continuation_key`, `transaction_status`. Loop while response has `continuation_key` |
| Revoke | `DELETE /sessions/{session_id}` | On disconnect |

Rate limits: banks typically allow ~4 *background* (user-not-present) fetches per day per account. A `429` with `ASPSP_RATE_LIMIT_EXCEEDED` → back off for 6 hours. Since sync is always user-initiated, forward the user's IP and user agent as PSU headers (e.g. `Psu-Ip-Address`, `Psu-User-Agent`; verify the exact names in the API reference) so requests count as user-present. Also apply a short server-side cooldown (5 min per connection) against button mashing.

Transaction fields we use:
- `entry_reference` / `transaction_id` — external id (dedup key)
- `transaction_amount { amount, currency }`, `credit_debit_indicator` (`DBIT` / `CRDT`)
- `status` (`BOOK` / `PDNG`), `booking_date`, `value_date`, `transaction_date`
- `creditor.name` (debits) / `debtor.name` (credits) — counterparty
- `remittance_information[]` — description (card payments often carry the merchant here)
- `merchant_category_code`, `bank_transaction_code`
- Full payload stored in `raw_data` for re-parsing later

## Sync + Categorisation Flow

```
[Sync button] → POST /v1/bank/sync  (.NET API, synchronous, < 30 s)
   1. Fetch booked transactions from Enable Banking for each enabled account
   2. Insert new rows into bank_transactions (review_status = 'pending')
   3. Duplicate detection against existing expenses
   4. Apply counterparty memory (bank_counterparty_rules): manual rule > ai rule
   5. Remaining pending rows without a suggestion → create ai_jobs row + SQS message
   ← { imported, skipped, jobId | null }

[AI processor Lambda, Node.js] ← SQS { jobId, type: "categorise_bank_transactions" }
   6. Read job request_body (categories + transactions, by index)
   7. OpenAI Responses API, model gpt-6-luna, JSON mode
   8. Strictly validate indices; write suggested_category_id / suggested_vendor
      (suggestion_source = 'ai') and upsert ai rules into bank_counterparty_rules
      (never overwriting manual rules)
   9. Mark job completed / failed

[Frontend] polls GET /v1/bank/ai-jobs/{jobId} every 2 s (2 min timeout),
           then refetches the inbox
```

Steps 1–5 are synchronous, so the inbox shows imported transactions straight away. Categories fill in when the job completes.

## Database

The existing `bank_connections` / `bank_transactions` tables were drafted for GoCardless (requisition IDs, access/refresh tokens) and are not referenced by any code. Drop and recreate them.

### Migration (`supabase/migrations/2026MMDD000001_enable_banking.sql`)

```sql
DROP TABLE IF EXISTS public.bank_transactions;
DROP TABLE IF EXISTS public.bank_connections;

-- One Enable Banking session (one bank consent)
CREATE TABLE public.bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'enable_banking',
    aspsp_name TEXT NOT NULL,
    aspsp_country TEXT NOT NULL,
    auth_state TEXT UNIQUE,                 -- random, set while status = 'pending'
    session_id TEXT UNIQUE,                 -- set once authorised
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'expired', 'revoked', 'failed')),
    consent_expires_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    last_sync_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts returned by POST /sessions
CREATE TABLE public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
    external_uid TEXT NOT NULL,             -- Enable Banking account uid
    iban_masked TEXT,                       -- e.g. LT** **** **** **** 1234
    name TEXT,
    currency TEXT NOT NULL DEFAULT 'EUR',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    synced_until DATE,                      -- latest booking_date fully imported
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (bank_connection_id, external_uid)
);

-- Imported transactions = suggestions inbox
CREATE TABLE public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    booking_date DATE NOT NULL,
    counterparty_name TEXT,
    counterparty_key TEXT,                  -- normalised, see "Counterparty key"
    description TEXT,
    merchant_category_code TEXT,
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'accepted', 'dismissed', 'linked')),
    suggested_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    suggested_vendor TEXT,
    suggestion_source TEXT CHECK (suggestion_source IN ('rule', 'ai')),
    possible_duplicate_expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    income_id UUID REFERENCES public.incomes(id) ON DELETE SET NULL,
    raw_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    UNIQUE (bank_account_id, external_id)
);

-- Per-user memory: counterparty → category/vendor (mirrors shopping_item_categories)
CREATE TABLE public.bank_counterparty_rules (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    counterparty_key TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,  -- null for credits
    vendor TEXT,
    source TEXT NOT NULL CHECK (source IN ('ai', 'manual')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, counterparty_key, direction)
);

-- Async AI jobs (mirrors ai_recipe_jobs in how-is-my-food-planning)
CREATE TABLE public.ai_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('categorise_bank_transactions')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    request_body JSONB NOT NULL,
    response_body JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_bank_connections_user_id ON public.bank_connections(user_id);
CREATE INDEX idx_bank_accounts_user_id ON public.bank_accounts(user_id);
CREATE INDEX idx_bank_transactions_user_pending
    ON public.bank_transactions(user_id, booking_date DESC) WHERE review_status = 'pending';
CREATE INDEX idx_bank_counterparty_rules_category ON public.bank_counterparty_rules(category_id);
CREATE INDEX idx_ai_jobs_user_id ON public.ai_jobs(user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bank_connections
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_counterparty_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

-- Read-only for clients; all writes go through the backend / AI processor (service role).
-- ai_jobs has no policies: only the service role can access it.
CREATE POLICY "Users can view own bank connections"
    ON public.bank_connections FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can view own bank accounts"
    ON public.bank_accounts FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can view own bank transactions"
    ON public.bank_transactions FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can view own counterparty rules"
    ON public.bank_counterparty_rules FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
```

Notes:
- `session_id` alone is useless without the app's private key, so it is stored as plain text. No token encryption is needed (unlike the GoCardless draft).
- The external id is `entry_reference ?? transaction_id ?? sha256(booking_date|amount|direction|counterparty|description)`.
- `booking_date` holds the date the money was spent: `transaction_date` when the bank sends one, else the purchase date in a card payment's text (`PIRKINYS 516793******4160 2026.10.28 …`, 0–14 days before the bank's date; Swedbank books cards 2–3 days later), else the bank's booking date. The hash id keeps using the bank's own date so ids stay stable. Re-syncs update the date of suggestions not yet reviewed.
- Also copy the migration into `database/migrations/` (reference copy).

### Counterparty key
`lower(btrim(...))` of the counterparty name (or, for card payments without `creditor.name`, the merchant parsed from `remittance_information`), with card masks (`*1234`), long digit runs and repeated whitespace removed. Example: `MAXIMA LT X123 VILNIUS` → `maxima lt x vilnius`. Keep it deterministic and simple: the AI does the "understanding", the key only needs to be stable for the same merchant. The same normalisation must exist in C# (sync) and, if ever needed, SQL. The AI processor receives keys and never computes them.

## Backend (.NET API)

Follows the existing pattern: `Domain/` interfaces → `Infrastructure/` implementations → static `Functions/` → routes in `Program.cs`.

### Configuration
- `Configuration/EnableBankingSettings.cs` — `SectionName = "EnableBanking"`. `ApplicationId` (required), `PrivateKeyBase64` (required; base64 of the PEM, decoded once at startup), `BaseUrl` (default `https://api.enablebanking.com`), `RedirectUrl` (required), `ConsentDays` (default 180, capped by ASPSP `maximum_consent_validity`)
- `Configuration/SqsSettings.cs` — `SectionName = "Sqs"`, `AiJobsQueueUrl` (optional; when empty, as in local dev, the job is created but not sent, like the food app)
- Local dev: `appsettings.Development.json` + `dotnet user-secrets` for the key

### Enable Banking client (`Infrastructure/EnableBanking/`)
- `IEnableBankingClient` (in `Domain/`) — `GetAspspsAsync(country)`, `StartAuthAsync(aspsp, state, validUntil)`, `CreateSessionAsync(code)`, `GetSessionAsync(sessionId)`, `GetTransactionsAsync(accountUid, dateFrom, continuationKey?, psu)`, `DeleteSessionAsync(sessionId)`
- `EnableBankingClient` — typed `HttpClient` (`AddHttpClient<IEnableBankingClient, EnableBankingClient>`) + `DelegatingHandler` that attaches the app JWT
- `EnableBankingJwtFactory` — `RSA.ImportFromPem` + `JwtSecurityTokenHandler` (already referenced), cached until 5 min before `exp`
- DTOs in `Infrastructure/EnableBanking/Dtos.cs` (`JsonNamingPolicy.SnakeCaseLower`)
- `429 ASPSP_RATE_LIMIT_EXCEEDED` → `Result` error `RateLimited`. ASPSP session expired / `401` → mark connection `expired`.

### Models (`Models/Bank.cs`)
- `Aspsp` — name, country, logo, maximumConsentDays
- `BankConnection` — id, aspspName, aspspCountry, status, consentExpiresAt, lastSyncedAt, lastSyncError, accounts[]
- `BankAccount` — id, ibanMasked, name, currency, isEnabled
- `BankTransaction` — id, bankAccountId, direction, amount, currency, bookingDate, counterpartyName, description, reviewStatus, suggestedCategoryId, suggestedVendor, suggestionSource, possibleDuplicateExpenseId
- `StartBankConnectionRequest` — aspspName, aspspCountry → `StartBankConnectionResponse` — redirectUrl
- `CompleteBankConnectionRequest` — code, state
- `SyncRequest` — connectionId? → `SyncResult` — imported, skipped, categorisedByRule, jobId?
- `AiJobStatus` — status, error
- `AcceptBankTransactionRequest` — itemName, categoryId, vendor?, comment?, expenseDate? (debits) / source? (credits)
- `LinkBankTransactionRequest` — expenseId
- `CategoriseJobRequest(List<CategoriseJobCategory> Categories, List<CategoriseJobTransaction> Transactions)`
  - `CategoriseJobCategory(Guid Id, string Name)`
  - `CategoriseJobTransaction(Guid Id, string CounterpartyKey, string Direction, string? Counterparty, string? Description, string? Mcc, decimal Amount)`

### Repositories
- `IBankConnectionRepository` / `BankConnectionRepository` — create pending, complete (by `auth_state` + `user_id`), list with accounts, mark expired/revoked, update sync state
- `IBankTransactionRepository` / `BankTransactionRepository`
  - `InsertNewAsync(userId, accountId, txns)` — `INSERT … ON CONFLICT (bank_account_id, external_id) DO NOTHING RETURNING id`
  - `ApplyRulesAsync(userId, ids)` — one `UPDATE … FROM bank_counterparty_rules` setting `suggestion_source = 'rule'` (manual rules preferred over ai)
  - `GetUncategorisedPendingAsync(userId, limit)` — pending debits with no suggestion (input for the AI job; read from the DB, never from the client)
  - `GetPendingAsync(userId)` / `CountPendingAsync(userId)`
  - `AcceptAsync` — in one DB transaction: find/create the month for `booking_date` (reuse `MonthRepository` create logic so recurring templates still generate), insert expense (or income for credits), upsert `user_vendors`, set `review_status = 'accepted'` + `expense_id`, and upsert a **manual** `bank_counterparty_rules` row when the user's category/vendor differs from the suggestion (or there was none)
  - `DismissAsync`, `LinkAsync`
- `IAiJobRepository` / `AiJobRepository` — `CreateCategoriseJobAsync(userId, request)`, `GetAsync(userId, jobId)`

### Sync (`Infrastructure/BankSyncService.cs`) — `SyncAsync(userId, connectionId?, psu)`
1. Load active connections. If `consent_expires_at < now` → mark `expired`, skip. If `last_synced_at > now - 5 min` → skip (cooldown).
2. For each enabled account: `date_from = max((synced_until ?? today - 7d) - 3 days, today - 7d)` (the overlap catches late-booked items; the unique key dedups). Never more than 7 days back: banks refuse anything over 90 days once the login is a few minutes old (`422 WRONG_TRANSACTIONS_PERIOD`), and Swedbank pages through the range in mostly empty pages (93 days ran past 10 pages without reaching recent dates). Use `transaction_status = BOOK` and page through `continuation_key`, max 15 pages so two accounts stay inside the 30 s API timeout. Pending (`PDNG`) uses the same 7 days.
3. Map → rows (direction, amount, counterparty, `counterparty_key`, description, MCC, raw). Skip transfers between the user's own linked IBANs.
4. Insert new rows → run duplicate detection → `ApplyRulesAsync`.
5. If uncategorised pending debits remain and the user has ≥ 3 categories: build `CategoriseJobRequest` (user's non-archived categories with display name in their profile language + up to 200 transactions), create `ai_jobs` row, send SQS `{ jobId, type: "categorise_bank_transactions" }`.
6. Update `synced_until`, `last_synced_at`, `last_sync_error`. Return `SyncResult`.

Credits (incoming money) are not sent to the AI. They become income suggestions with `source = counterparty`.

### Duplicate detection
Flag `possible_duplicate_expense_id` when an expense exists with:
- same amount, `expense_date` within ±3 days of `booking_date`, and
- vendor similar to the counterparty OR `is_recurring_instance = true` (rent, subscriptions created by Phase 4)

The inbox then offers **"Already added — link"** as the primary action.

### Functions (`Functions/BankFunctions.cs`)
- `GET    /v1/bank/aspsps?country=LT` — list banks
- `GET    /v1/bank/connections` — list connections + accounts
- `POST   /v1/bank/connections` — start: create pending row with random `state` (32 bytes, base64url), call `POST /auth`, return `{ redirectUrl }`
- `POST   /v1/bank/connections/complete` — `{ code, state }`: verify state belongs to the caller and is < 15 min old, `POST /sessions`, store session + accounts. No automatic sync; the UI prompts "Sync now"
- `DELETE /v1/bank/connections/{id:guid}` — `DELETE /sessions/{id}` upstream (ignore 404), mark `revoked`
- `PATCH  /v1/bank/accounts/{id:guid}` — `{ isEnabled }`
- `POST   /v1/bank/sync` — manual sync (all, or `{ connectionId }`), returns `SyncResult` (`202` if a `jobId` was created, else `200`)
- `GET    /v1/bank/ai-jobs/{jobId:guid}` — `{ status, error }` (scoped to the caller)
- `GET    /v1/bank/transactions?status=pending` — inbox
- `GET    /v1/bank/transactions/pending-count` — for the nav badge
- `POST   /v1/bank/transactions/{id:guid}/accept`
- `POST   /v1/bank/transactions/{id:guid}/dismiss`
- `POST   /v1/bank/transactions/{id:guid}/link` — `{ expenseId }`
- `POST   /v1/bank/transactions/accept-bulk` — `{ ids[] }`, accept with suggested values (only those with a suggested category)

All routes sit behind the existing authorizer (`$default` route). No public endpoints are needed because the bank redirects to the **frontend**, which forwards `code` + `state`. The PSU IP comes from API Gateway's request context (`X-Forwarded-For`), and the user agent from the request header.

### Validation
- `state` must match a `pending` connection of the caller and be < 15 min old
- Accept: `categoryId` must be visible to the user (system or own, not archived); `itemName` not empty
- Reject accept/dismiss on non-`pending` transactions (409)

### Tests (`backend/tests/HowAreMyFinances.Api.Tests/`)
- `CounterpartyKeyTests` — normalisation table (real Swedbank samples, anonymised)
- `DuplicateDetectionTests` — amount/date window, recurring instance match
- `EnableBankingJwtFactoryTests` — header/claims, caching, refresh before expiry
- `TransactionMappingTests` — `CRDT`/`DBIT`, missing `entry_reference` → hash id, remittance parsing
- `BankFunctionsTests` — NSubstitute repos/client/SQS: state mismatch → 400, expired consent → status update, 429 → `RateLimited`, accept on non-pending → 409, sync with no uncategorised rows → no job / no SQS message, fewer than 3 categories → no job

## AI Processor (`backend/src/ai-processor/`, Node.js 22)

Port of `how-is-my-food-planning/backend/src/ai-processor/index.mjs`, keeping only the categorise path.

- `package.json` — `"type": "module"`, single dependency `pg` (pinned, e.g. `8.13.3`)
- Env: `OPENAI_API_KEY`, `DB_CONNECTION_STRING` (Npgsql format, parsed by `parseNpgsqlConnectionString`, same as food app)
- Constants: `CATEGORISE_MODEL = "gpt-6-luna"`, `CATEGORISE_MAX_OUTPUT_TOKENS = 8000`, `CATEGORISE_MAX_ITEMS = 200`
- SQS handler → `processCategoriseJob(pool, jobId)`:
  1. `SELECT … FROM ai_jobs WHERE id = $1 AND status = 'pending' AND job_type = 'categorise_bank_transactions'`
  2. `readCategoriseRequest` — drop malformed entries, cap items
  3. `callOpenAiJson` — `POST https://api.openai.com/v1/responses`, `text.format = json_object`, same helper as food app
  4. `parseAssignments` — strict integer-index validation, first assignment per item wins, `null` = no fit
  5. `saveSuggestions` — single SQL statement:
     - update `bank_transactions` (only rows still `review_status = 'pending'` and `suggestion_source IS NULL`, owned by the job's `user_id`, category still exists and is visible to the user, using `FOR KEY SHARE`, as the food app does)
     - upsert `bank_counterparty_rules` with `source = 'ai'`, `ON CONFLICT … DO UPDATE … WHERE source <> 'manual'`
  6. `completeJob` / `failJob`

System prompt (sketch):

```
You are a personal finance assistant. You assign bank card payments and transfers
to the user's own spending categories.

You will receive JSON with a list of categories and a list of transactions, each identified by a numeric index.
Each transaction has: counterparty (merchant or payee name as the bank shows it), description
(bank remittance text), mcc (merchant category code, may be null) and amount in EUR.
Names may be in Lithuanian or English, abbreviated, or contain store numbers and city names.

For EVERY transaction:
- Choose the single category that fits best. Judge by what the merchant sells or what the payment is for,
  e.g. "MAXIMA", "IKI", "RIMI", "LIDL" are supermarkets; "CIRCLE K", "VIADA" are fuel stations; "BOLT" may be
  rides or food delivery. Use the description and mcc to disambiguate.
- If no category reasonably fits, use null. Do not force a poor match.
- Also return "vendor": a short, clean merchant name in its usual brand spelling (e.g. "Maxima", "Circle K"),
  or null if unclear.
- Refer to transactions and categories ONLY by their numeric index.

ALWAYS respond with valid JSON matching this exact schema:
{"assignments":[{"item":0,"category":2,"vendor":"Maxima"},{"item":1,"category":null,"vendor":null}]}

Rules:
- "item" must be a transaction index from the input; "category" a category index or null.
- "vendor" must be a string of at most 60 characters or null.
- Include each transaction exactly once.
- Always return valid JSON, nothing else
```

Input sent to OpenAI: category names, and per transaction counterparty, description (truncated to 140 chars), MCC and amount. **Never** IBANs, account names, balances or user identifiers.

Tests: `node --test` for `readCategoriseRequest`, `parseAssignments` (out-of-range, duplicates, null, non-integer, overlong vendor) and `extractJson`. Export these from the module for testing.

## Shared Types (`shared/types/bank.ts`)
- `Aspsp`, `BankConnection`, `BankAccount`, `BankTransaction`, `BankConnectionStatus`, `BankReviewStatus`, `SuggestionSource`
- `StartBankConnectionRequest/Response`, `CompleteBankConnectionRequest`, `SyncResult`, `AiJobStatus`, `AcceptBankTransactionRequest`, `LinkBankTransactionRequest`

## Frontend

### API (`app/src/api/bank.ts`)
Thin wrappers over `apiGet`/`apiPost`/`apiPatch`/`apiDelete`, one per endpoint.

### Feature (`app/src/features/bank/`)
- `hooks/`
  - `useBankConnections`, `useStartBankConnection`, `useCompleteBankConnection`, `useDeleteBankConnection`
  - `useBankTransactions`, `usePendingCount`, `useAcceptBankTransaction`, `useDismissBankTransaction`, `useLinkBankTransaction`
  - `useBankSync` — same shape as food app's `useAiSort`: a mutation with a fixed `mutationKey` that (1) calls `POST /v1/bank/sync`, (2) invalidates the inbox right away (transactions appear uncategorised), (3) if `jobId`, polls `GET /v1/bank/ai-jobs/{jobId}` every 2 s for up to 2 min (keep polling through 5xx/network errors, stop on 4xx), (4) invalidates the inbox + pending count again. `useIsMutating` keeps the busy state across page switches, and `queryClient.isMutating` guards double clicks. Phases exposed to the UI: `syncing` → `categorising` → done.
- `screens/` (route files in `app/src/app/` re-export these)
  - `BankConnectionsScreen` (`/settings/bank`) — list connections, status chip, consent expiry, last sync, per-account toggle, Connect / Reconnect / Disconnect
  - `BankCallbackScreen` (`/bank/callback`) — reads `code`, `state` (or `error`). If `state` starts with `n.` and this is the web build, it is the native bounce: `location.replace("finansai://bank/callback" + location.search)` and show "Return to the app" (no session needed). Otherwise calls complete, then navigates to `/bank/inbox` with a "Sync now" prompt (handles errors + already-completed state on refresh). The same route handles the `finansai://bank/callback` deep link in the native app.
  - `BankInboxScreen` (`/bank/inbox`) — **Sync button** in the header (shows "Syncing…" / "Categorising…" and "Last synced …"), pending suggestions grouped by date
- `components/`
  - `SyncButton` — wraps `useBankSync`; disabled while running; toast on result ("12 new transactions", "Nothing new", rate-limited, consent expired)
  - `ConnectBankDialog` — bank picker (from `/v1/bank/aspsps?country=LT`). Web: `window.location.assign(redirectUrl)`. Native: `WebBrowser.openAuthSessionAsync(redirectUrl, "finansai://bank/callback")`, then complete with the returned URL's `code`/`state`
  - `BankTransactionCard` — amount, counterparty, date; prefilled category select + item name + vendor; small "AI" badge when `suggestionSource = 'ai'`; skeleton shimmer on the category while the job is running; actions: Accept, Dismiss, and "Already added" (if duplicate flagged)
  - `BulkAcceptBar` — "Accept N with suggested category"
  - `ConsentExpiryBanner` — shown when < 14 days left

### Navigation
- Badge with pending count on the Months tab (or a new Inbox entry), linking to `/bank/inbox`
- Settings → "Bank connections" row

### Redirect round-trip (web + native)
Enable Banking only redirects to registered `https` URLs, so both clients come back through `https://finances.valiunas.dev/bank/callback`:

- **Web**: the page is the callback. The user's Supabase session is in this origin's localStorage, so it calls `POST /v1/bank/connections/complete` directly.
- **Native (iOS/Android app)**: `POST /v1/bank/connections` takes `client: "web" | "native"`; for native the backend prefixes the random `state` with `n.`. The app opens the bank URL with `expo-web-browser`'s `openAuthSessionAsync(url, "finansai://bank/callback")` (ASWebAuthenticationSession on iOS, Custom Tabs on Android). The bank redirects to the web callback page, which sees the `n.` state and immediately redirects to `finansai://bank/callback?code=…&state=…`. The auth session catches that URL and returns it to the app; on Android the deep link may instead open the app's `/bank/callback` route, which completes the same way. The app then calls `complete` with its own JWT. The page never needs a session in the browser.
- Why it's safe: `code` alone is useless. `complete` requires the user's JWT and a `state` that the backend bound to that user and connection, and that it accepts once.
- Later (optional): Universal Links / Android App Links for `https://finances.valiunas.dev/bank/callback` (AASA + `assetlinks.json` served from the S3 bucket, `associatedDomains` / `intentFilters` in `app.json`) open the app directly and remove the bounce. The bounce page stays as the fallback.

### i18n (`en` + `lt`)
`bank.title`, `bank.connect`, `bank.reconnect`, `bank.disconnect`, `bank.lastSynced`, `bank.sync`, `bank.syncing`, `bank.categorising`, `bank.syncDone`, `bank.syncNothingNew`, `bank.syncCooldown`, `bank.consentExpires`, `bank.inbox`, `bank.accept`, `bank.dismiss`, `bank.alreadyAdded`, `bank.acceptAll`, `bank.noPending`, `bank.aiSuggested`, `bank.aiFailed`, `bank.rateLimited`, `bank.connectionExpired`, `bank.callback.success`, `bank.callback.error`

## Infrastructure

### Enable Banking key
Passed as a Lambda environment variable, the same way as the Supabase service role key. Lambda encrypts env vars at rest. The trade-off is that the value is visible in the Lambda console and stored in Terraform state, which is acceptable for this personal project (the service role key is already handled the same way and is more powerful).
- GitHub secrets: `ENABLE_BANKING_APPLICATION_ID`, `ENABLE_BANKING_PRIVATE_KEY_B64` (base64 of the PEM, single line, so newlines don't get mangled by GitHub secrets / Terraform)
- Pass them as `TF_VAR_enable_banking_application_id` / `TF_VAR_enable_banking_private_key_b64` in the Terraform steps of `deploy.yml` and `deploy-infra.yml`
- `infra/environments/dev/variables.tf`: `enable_banking_application_id`, `enable_banking_private_key_b64` (`sensitive = true`)
- `infra/modules/lambda`: new variables `enable_banking_application_id`, `enable_banking_private_key_b64` (`sensitive = true`), `enable_banking_redirect_url`, `sqs_ai_jobs_queue_url`. Env vars `EnableBanking__ApplicationId`, `EnableBanking__PrivateKeyBase64`, `EnableBanking__RedirectUrl`, `Sqs__AiJobsQueueUrl`.
- Size: Lambda allows 4 KB of env vars in total; a base64 RSA-2048 PEM is ~2.3 KB, which fits next to the existing variables. Use a 2048-bit key (not 4096).
- Local dev: `dotnet user-secrets set "EnableBanking:PrivateKeyBase64" "<base64>"`
- New output `role_name` on the lambda module (needed by the AI processor module for the SQS publish policy).

### AI processor (`infra/modules/ai-processor/`)
Copy of the food app module, renamed for this project:
- SQS `…-ai-jobs` (visibility 120 s, retention 1 day) + DLQ (`maxReceiveCount = 2`)
- Node.js 22 Lambda `…-ai-processor` (256 MB, 120 s timeout), SQS event source with `batch_size = 1`
- Env `OPENAI_API_KEY` (sensitive TF var), `DB_CONNECTION_STRING` (`module.supabase.db_connection_string`)
- IAM policy attached to the API Lambda role: `sqs:SendMessage` on the queue
- Outputs `queue_url`, `function_name`
- Wired in `infra/environments/dev/main.tf`; `TF_VAR_openai_api_key` from GitHub secret `OPENAI_API_KEY`

### Backend packages (pinned)
- `AWSSDK.SQS` `4.0.2.25` (same as food app), registered as `AddSingleton<IAmazonSQS>(_ => new AmazonSQSClient())`

### CI/CD (`.github/workflows/deploy.yml`)
- Export `ai_processor_function_name` from Terraform outputs
- New job `ai-processor` (needs infra + migrations): `npm ci` in `backend/src/ai-processor`, zip, `aws lambda update-function-code`, as in the food app
- `pr-checks.yml`: run `node --test` for the AI processor

## Definition of Done
- Can connect a Swedbank LT account via Enable Banking (restricted mode) from the deployed app and from localhost
- Pressing **Sync** imports new booked transactions; repeated syncs never create duplicate rows; nothing syncs without the button
- New transactions are categorised by `gpt-6-luna` from the user's own categories within ~2 min; the same counterparty is categorised from memory next time without an AI call
- Accepting with a different category creates a manual rule that AI never overrides
- Accept creates an expense in the correct month (creating the month if needed); credits can be accepted as incomes
- Transactions matching existing manual/recurring expenses are flagged and can be linked instead of duplicated
- Expired consent shows a banner and can be renewed via Reconnect
- Disconnect revokes the Enable Banking session
- Backend tests + AI processor tests pass
- Manual verification of the redirect round-trip on web, the iOS app and the Android app
