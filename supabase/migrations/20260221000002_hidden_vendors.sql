-- Stores vendor names that a user has hidden from the vendor dropdown.
-- Vendors are free-text on expenses; this table tracks which ones to exclude from suggestions.

CREATE TABLE public.hidden_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vendor_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, vendor_name)
);

ALTER TABLE public.hidden_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY hidden_vendors_user_policy ON public.hidden_vendors
    FOR ALL USING (user_id = (SELECT auth.uid()));
