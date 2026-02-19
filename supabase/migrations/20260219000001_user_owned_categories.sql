-- 20260219000001_user_owned_categories.sql
-- Migrate from system+user categories to fully user-owned categories.
-- Every user gets their own copy of default categories on signup.
-- Users can freely rename, delete, and create categories.

-- =============================================================================
-- 1. Create a template table for default categories (used by signup trigger)
-- =============================================================================

CREATE TABLE public.default_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.default_categories (name, icon, sort_order)
VALUES
    ('Transport Tickets', NULL, 1),
    ('Bolt', NULL, 2),
    ('Apartment', NULL, 3),
    ('Gifts', NULL, 4),
    ('Deposit', NULL, 5),
    ('Investing', NULL, 6),
    ('Travel', NULL, 7),
    ('Books', NULL, 8),
    ('Computer Games', NULL, 9),
    ('Leasing', NULL, 10),
    ('Food', NULL, 11),
    ('Ordered Food', NULL, 12),
    ('Car', NULL, 13),
    ('Taxes', NULL, 14),
    ('Unexpected Expenses', NULL, 15),
    ('Services', NULL, 16),
    ('Periodic Payments', NULL, 17),
    ('Entertainment', NULL, 18),
    ('Industrial Goods', NULL, 19),
    ('Clothes', NULL, 20),
    ('Sweets', NULL, 21),
    ('Home', NULL, 22),
    ('Debt', NULL, 23),
    ('Health', NULL, 24),
    ('Waste', NULL, 25);

-- =============================================================================
-- 2. Copy default categories for existing users who don't have their own
-- =============================================================================

INSERT INTO public.categories (user_id, name, icon, is_system, sort_order)
SELECT u.id, dc.name, dc.icon, false, dc.sort_order
FROM auth.users u
CROSS JOIN public.default_categories dc
WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.user_id = u.id AND c.is_system = false
);

-- =============================================================================
-- 3. Remove system categories (no expenses reference them — Phase 2 is new)
-- =============================================================================

DELETE FROM public.categories WHERE is_system = true;

-- =============================================================================
-- 4. Update constraints
-- =============================================================================

-- Drop old constraints that reference is_system/name_en/name_lt
ALTER TABLE public.categories DROP CONSTRAINT category_name_check;
ALTER TABLE public.categories DROP CONSTRAINT system_category_no_user;

-- Make user_id NOT NULL (all categories are user-owned now)
ALTER TABLE public.categories ALTER COLUMN user_id SET NOT NULL;

-- Ensure name is always present
ALTER TABLE public.categories ADD CONSTRAINT category_name_required CHECK (name IS NOT NULL);

-- =============================================================================
-- 5. Update RLS policies (must drop before removing is_system column)
-- =============================================================================

DROP POLICY "Users can view system and own categories" ON public.categories;
CREATE POLICY "Users can view own categories"
    ON public.categories FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY "Users can insert own categories" ON public.categories;
CREATE POLICY "Users can insert own categories"
    ON public.categories FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories"
    ON public.categories FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own categories"
    ON public.categories FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- =============================================================================
-- 6. Drop columns no longer needed
-- =============================================================================

ALTER TABLE public.categories DROP COLUMN is_system;
ALTER TABLE public.categories DROP COLUMN name_en;
ALTER TABLE public.categories DROP COLUMN name_lt;

-- =============================================================================
-- 7. Update signup trigger to copy default categories for new users
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);

    INSERT INTO public.categories (user_id, name, icon, sort_order)
    SELECT NEW.id, dc.name, dc.icon, dc.sort_order
    FROM public.default_categories dc;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
