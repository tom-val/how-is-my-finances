-- Replaces hidden_vendors table + SELECT DISTINCT vendor FROM expenses approach
-- with a dedicated user_vendors table that has an is_hidden flag.

CREATE TABLE public.user_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_user_vendors_user_id ON public.user_vendors(user_id);

ALTER TABLE public.user_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_vendors_user_policy ON public.user_vendors
    FOR ALL USING (user_id = (SELECT auth.uid()));

-- Seed from existing expenses + recurring_expenses (distinct non-null vendors)
INSERT INTO public.user_vendors (user_id, name)
SELECT DISTINCT user_id, vendor
FROM public.expenses
WHERE vendor IS NOT NULL
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO public.user_vendors (user_id, name)
SELECT DISTINCT user_id, vendor
FROM public.recurring_expenses
WHERE vendor IS NOT NULL
ON CONFLICT (user_id, name) DO NOTHING;

-- Carry over hidden state from hidden_vendors
UPDATE public.user_vendors uv
SET is_hidden = true
FROM public.hidden_vendors hv
WHERE uv.user_id = hv.user_id AND uv.name = hv.vendor_name;

-- Drop the old table
DROP TABLE public.hidden_vendors;
