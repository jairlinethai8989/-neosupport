-- ============================================================
-- Migration: 016_department_schema.sql
-- Description: Department-based escalation and handover tracking
-- ============================================================

-- 1. Create departments table for granular escalation
CREATE TABLE IF NOT EXISTS public.departments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial departments
INSERT INTO public.departments (name, description) VALUES
('IT Support', 'General IT and hardware support'),
('Programmer', 'Software development and bug fixes'),
('QA', 'Quality assurance and testing'),
('System Admin', 'Server and infrastructure management'),
('Network', 'Network and connectivity issues'),
('DBA', 'Database administration')
ON CONFLICT (name) DO NOTHING;

-- 2. Add department_id and handover tracking to tickets
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS current_department_id UUID REFERENCES public.departments(id),
ADD COLUMN IF NOT EXISTS last_handover_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_handover_by UUID REFERENCES public.users(id);

-- 3. Migrate existing data from escalated_to (if any)
-- Mapping escalated_to enum values to the new departments table
UPDATE public.tickets
SET current_department_id = d.id
FROM public.departments d
WHERE public.tickets.escalated_to::text = d.name;

-- Set default department for non-escalated tickets to 'IT Support'
UPDATE public.tickets
SET current_department_id = (SELECT id FROM public.departments WHERE name = 'IT Support')
WHERE current_department_id IS NULL;

-- 4. Create a handover_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.handover_logs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id         UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    from_department_id UUID REFERENCES public.departments(id),
    to_department_id   UUID NOT NULL REFERENCES public.departments(id),
    handed_over_by     UUID NOT NULL REFERENCES public.users(id),
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Comments for clarity
COMMENT ON TABLE public.departments IS 'Lookup table for different specialized departments.';
COMMENT ON COLUMN public.tickets.current_department_id IS 'The department currently responsible for the ticket.';
COMMENT ON TABLE public.handover_logs IS 'Audit trail of ticket transfers between departments.';

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_curr_dept ON public.tickets(current_department_id);
CREATE INDEX IF NOT EXISTS idx_handover_ticket_id ON public.handover_logs(ticket_id);
