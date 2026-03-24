-- Backfill is_recurring_instance for historical expenses that match
-- current recurring expense templates by user_id, category_id, and item_name.
-- This is approximate: templates may have changed since the expense was created.
UPDATE public.expenses e
SET is_recurring_instance = true
FROM public.recurring_expenses r
WHERE e.user_id = r.user_id
  AND e.category_id = r.category_id
  AND lower(e.item_name) = lower(r.item_name)
  AND e.is_recurring_instance = false;
