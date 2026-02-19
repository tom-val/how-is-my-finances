-- Add incomes table for tracking supplementary income (bonuses, refunds, freelance, etc.)

-- =============================================================================
-- Table
-- =============================================================================

CREATE TABLE public.incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_id UUID NOT NULL REFERENCES public.months(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    income_date DATE NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_incomes_user_id ON public.incomes(user_id);
CREATE INDEX idx_incomes_month_id ON public.incomes(month_id);
CREATE INDEX idx_incomes_date ON public.incomes(income_date);

-- =============================================================================
-- Trigger
-- =============================================================================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.incomes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own incomes"
    ON public.incomes FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own incomes"
    ON public.incomes FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own incomes"
    ON public.incomes FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own incomes"
    ON public.incomes FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));
