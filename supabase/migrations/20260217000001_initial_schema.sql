-- 00001_initial_schema.sql
-- Core schema for How Are My Finances

-- =============================================================================
-- Tables
-- =============================================================================

-- User profile (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'lt')),
    preferred_currency TEXT NOT NULL DEFAULT 'EUR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories (predefined system + user-created)
-- System categories: name_en and name_lt are populated, name is NULL, is_system = true
-- User categories: name is populated, name_en and name_lt are NULL, is_system = false
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    name_en TEXT,
    name_lt TEXT,
    icon TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT category_name_check CHECK (
        (is_system = true AND name_en IS NOT NULL AND name_lt IS NOT NULL)
        OR (is_system = false AND name IS NOT NULL)
    ),
    CONSTRAINT system_category_no_user CHECK (
        (is_system = true AND user_id IS NULL)
        OR (is_system = false AND user_id IS NOT NULL)
    )
);

-- Months (one per user per calendar month)
CREATE TABLE public.months (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, year, month)
);

-- Expenses
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_id UUID NOT NULL REFERENCES public.months(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    item_name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    vendor TEXT,
    expense_date DATE NOT NULL,
    comment TEXT,
    is_recurring_instance BOOLEAN NOT NULL DEFAULT false,
    recurring_expense_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recurring expense templates
CREATE TABLE public.recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    item_name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    vendor TEXT,
    comment TEXT,
    day_of_month INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 28),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification preferences
CREATE TABLE public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    threshold_type TEXT NOT NULL CHECK (threshold_type IN ('total', 'category')),
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    threshold_percentage INTEGER NOT NULL CHECK (threshold_percentage > 0 AND threshold_percentage <= 100),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT category_required_for_category_type CHECK (
        (threshold_type = 'category' AND category_id IS NOT NULL)
        OR (threshold_type = 'total' AND category_id IS NULL)
    )
);

-- Future: Receipt OCR data
CREATE TABLE public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    storage_path TEXT NOT NULL,
    ocr_raw_response JSONB,
    ocr_extracted_data JSONB,
    ocr_status TEXT NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Future: Bank connections (OpenBanking)
CREATE TABLE public.bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    institution_id TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    requisition_id TEXT,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    consent_expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Future: Auto-imported bank transactions
CREATE TABLE public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
    expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    external_transaction_id TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    description TEXT,
    merchant_name TEXT,
    booking_date DATE NOT NULL,
    is_matched BOOLEAN NOT NULL DEFAULT false,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (bank_connection_id, external_transaction_id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_months_user_id ON public.months(user_id);
CREATE INDEX idx_months_user_year_month ON public.months(user_id, year, month);
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_month_id ON public.expenses(month_id);
CREATE INDEX idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_recurring_expenses_user_id ON public.recurring_expenses(user_id);
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX idx_receipts_user_id ON public.receipts(user_id);
CREATE INDEX idx_bank_connections_user_id ON public.bank_connections(user_id);
CREATE INDEX idx_bank_transactions_user_id ON public.bank_transactions(user_id);

-- =============================================================================
-- Triggers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.months
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.recurring_expenses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bank_connections
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()));

-- Categories
CREATE POLICY "Users can view system and own categories"
    ON public.categories FOR SELECT TO authenticated
    USING (is_system = true OR user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own categories"
    ON public.categories FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()) AND is_system = false);

CREATE POLICY "Users can update own categories"
    ON public.categories FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()) AND is_system = false);

CREATE POLICY "Users can delete own categories"
    ON public.categories FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()) AND is_system = false);

-- Months
CREATE POLICY "Users can view own months"
    ON public.months FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own months"
    ON public.months FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own months"
    ON public.months FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own months"
    ON public.months FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Expenses
CREATE POLICY "Users can view own expenses"
    ON public.expenses FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own expenses"
    ON public.expenses FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own expenses"
    ON public.expenses FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own expenses"
    ON public.expenses FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Recurring expenses
CREATE POLICY "Users can view own recurring expenses"
    ON public.recurring_expenses FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own recurring expenses"
    ON public.recurring_expenses FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own recurring expenses"
    ON public.recurring_expenses FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own recurring expenses"
    ON public.recurring_expenses FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Notification preferences
CREATE POLICY "Users can view own notification preferences"
    ON public.notification_preferences FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own notification preferences"
    ON public.notification_preferences FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own notification preferences"
    ON public.notification_preferences FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own notification preferences"
    ON public.notification_preferences FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Receipts (future)
CREATE POLICY "Users can view own receipts"
    ON public.receipts FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own receipts"
    ON public.receipts FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Bank connections (future)
CREATE POLICY "Users can view own bank connections"
    ON public.bank_connections FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can manage own bank connections"
    ON public.bank_connections FOR ALL TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Bank transactions (future)
CREATE POLICY "Users can view own bank transactions"
    ON public.bank_transactions FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
