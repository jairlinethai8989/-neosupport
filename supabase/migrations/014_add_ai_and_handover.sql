-- ============================================================
-- Add AI Summary and Handover tracking to tickets
-- ============================================================

-- Track who assigned the ticket
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS resolution_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- For handovers, we can store a list of previous assignees or just the last one
-- For simplicity, let's add a notes field specifically for handover context
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS handover_notes TEXT;

COMMENT ON COLUMN public.tickets.resolution_summary IS 'Manual summary of how the issue was fixed.';
COMMENT ON COLUMN public.tickets.ai_summary IS 'AI-generated summary of the conversation and fix.';
COMMENT ON COLUMN public.tickets.handover_notes IS 'Notes provided when transferring a job to another staff.';
