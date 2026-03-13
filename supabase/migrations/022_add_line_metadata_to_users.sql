-- ============================================================
-- Add line_metadata column to users table
-- ============================================================

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS line_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.users.line_metadata IS 'Stores LINE interaction state, such as awaiting ticket description or temporary attachments.';
