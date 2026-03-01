-- Add manual flag to recurring expense templates
ALTER TABLE public.recurring_expenses
  ADD COLUMN is_manual BOOLEAN NOT NULL DEFAULT false;

-- Add completion flag to expense instances
-- Default true so all existing expenses are considered "completed"
ALTER TABLE public.expenses
  ADD COLUMN is_completed BOOLEAN NOT NULL DEFAULT true;
