-- =============================================================================
-- Bank integration (Phase 10): Enable Banking connections + Android notification capture
-- feeding one suggestions inbox, with AI categorisation jobs.
-- See docs/phases/phase-9-bank-integration.md.
-- =============================================================================

-- The initial schema's bank tables were GoCardless placeholders and are unused.
DROP TABLE IF EXISTS public.bank_transactions;
DROP TABLE IF EXISTS public.bank_connections;

-- One Enable Banking session (one bank consent)
CREATE TABLE public.bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'enable_banking',
    aspsp_name TEXT NOT NULL,
    aspsp_country TEXT NOT NULL,
    client TEXT NOT NULL DEFAULT 'web' CHECK (client IN ('web', 'native')),
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
    iban_hash TEXT,                         -- sha256 of the full IBAN, to skip own-account transfers
    name TEXT,
    currency TEXT NOT NULL DEFAULT 'EUR',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    synced_until DATE,                      -- latest booking_date fully imported
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (bank_connection_id, external_uid)
);

-- Imported transactions and parsed notifications = the suggestions inbox
CREATE TABLE public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('enable_banking', 'notification')),
    bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    -- 'pending' until the AI has read a notification; bank rows are inserted 'parsed'.
    parse_status TEXT NOT NULL DEFAULT 'parsed'
        CHECK (parse_status IN ('pending', 'parsed', 'not_transaction', 'failed')),
    booking_status TEXT NOT NULL DEFAULT 'booked' CHECK (booking_status IN ('booked', 'pending')),
    direction TEXT CHECK (direction IN ('debit', 'credit')),
    amount NUMERIC(12, 2) CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    booking_date DATE,
    counterparty_name TEXT,
    counterparty_key TEXT,                  -- normalised, see "Counterparty key" in the phase doc
    description TEXT,
    merchant_category_code TEXT,
    notification_title TEXT,
    notification_text TEXT,
    notification_posted_at TIMESTAMPTZ,
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'accepted', 'dismissed', 'linked')),
    suggested_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    suggested_vendor TEXT,
    suggestion_source TEXT CHECK (suggestion_source IN ('rule', 'ai')),
    possible_duplicate_expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    income_id UUID REFERENCES public.incomes(id) ON DELETE SET NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    -- Bank rows belong to an account; parsed rows always carry the money fields.
    CHECK (source <> 'enable_banking' OR bank_account_id IS NOT NULL),
    CHECK (parse_status <> 'parsed' OR (direction IS NOT NULL AND amount IS NOT NULL AND booking_date IS NOT NULL))
);

CREATE UNIQUE INDEX uq_bank_transactions_account_external
    ON public.bank_transactions(bank_account_id, external_id) WHERE source = 'enable_banking';
CREATE UNIQUE INDEX uq_bank_transactions_notification_external
    ON public.bank_transactions(user_id, external_id) WHERE source = 'notification';

-- Per-user memory: counterparty -> category/vendor
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

-- Async AI jobs (SQS -> ai-processor Lambda)
CREATE TABLE public.ai_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL
        CHECK (job_type IN ('categorise_bank_transactions', 'parse_bank_notifications')),
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
    ON public.bank_transactions(user_id, booking_date DESC)
    WHERE review_status = 'pending' AND parse_status = 'parsed';
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
