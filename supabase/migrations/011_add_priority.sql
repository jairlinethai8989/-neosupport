-- Migration: 011_add_priority.sql
-- Add priority system to tickets table

-- Step 1: Create priority ENUM type
DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('Critical', 'High', 'Medium', 'Low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add priority column to tickets (nullable first for safe migration)
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS priority ticket_priority DEFAULT 'Medium';

-- Step 3: Ensure global_settings table exists and add SLA config
CREATE TABLE IF NOT EXISTS public.global_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SLA hours per priority level (configurable via Settings UI)
INSERT INTO public.global_settings (key, value)
VALUES (
  'sla_policy',
  '{"Critical": 1, "High": 4, "Medium": 8, "Low": 24}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Step 4: Create index for priority filtering (common query pattern)
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets (priority);
CREATE INDEX IF NOT EXISTS idx_tickets_priority_status ON tickets (priority, status);

-- Step 5: Update RLS - same as existing tickets policies (no change needed)
-- Priority field follows the same row security as the rest of the ticket

COMMENT ON COLUMN tickets.priority IS 'Ticket priority set by IT Staff: Critical=1h SLA, High=4h, Medium=8h, Low=24h (configurable)';
