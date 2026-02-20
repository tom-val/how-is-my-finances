-- Add is_archived flag to categories for soft-archive support
ALTER TABLE public.categories
    ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;
