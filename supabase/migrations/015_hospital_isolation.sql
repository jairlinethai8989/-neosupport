-- ============================================================
-- Migration: 015_hospital_isolation.sql
-- Description: Implements strict multi-hospital data isolation
-- ============================================================

-- 1. Add hospital_id to tickets to enable efficient RLS and filtering
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id);

-- 2. Populate hospital_id for existing tickets from their reporters
UPDATE public.tickets t
SET hospital_id = u.hospital_id
FROM public.users u
WHERE t.reporter_id = u.id
AND t.hospital_id IS NULL;

-- 3. Update the generate_ticket_no trigger to auto-populate hospital_id
CREATE OR REPLACE FUNCTION public.generate_ticket_no()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_abbreviation VARCHAR;
    v_hospital_id   UUID;
    v_running_no    BIGINT;
BEGIN
    -- 1. Look up the hospital info via the reporter
    SELECT u.hospital_id, h.abbreviation
      INTO v_hospital_id, v_abbreviation
      FROM public.users u
      JOIN public.hospitals h ON h.id = u.hospital_id
     WHERE u.id = NEW.reporter_id;

    -- Guard: reporter must exist and belong to a hospital
    IF v_hospital_id IS NULL THEN
        RAISE EXCEPTION 'Cannot generate ticket_no: reporter_id "%" has no associated hospital.', NEW.reporter_id;
    END IF;

    -- 2. Set the hospital_id on the ticket
    NEW.hospital_id := v_hospital_id;

    -- 3. Get the next running number for this hospital
    v_running_no := public.get_or_create_hospital_sequence(v_abbreviation);

    -- 4. Format: SRS_{ABBR}_IPD_{0001}
    NEW.ticket_no := 'SRS_' || v_abbreviation || '_IPD_' || LPAD(v_running_no::TEXT, 4, '0');

    RETURN NEW;
END;
$$;

-- 4. Implement Strict Row Level Security (RLS)
-- We replace existing loose policies with hospital-aware ones.

-- 4.1 USERS Policies (Isolate Hospital Staff)
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
CREATE POLICY "users_select_isolated"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (
        -- Staff/Admin can see everyone
        (EXISTS (SELECT 1 FROM public.users curr WHERE curr.id = auth.uid() AND curr.role IN ('Staff', 'Admin')))
        OR
        -- Customers can only see users from their own hospital
        (hospital_id = (SELECT hospital_id FROM public.users WHERE id = auth.uid()))
    );

-- 4.2 TICKETS Policies (The Core of Isolation)
DROP POLICY IF EXISTS "tickets_select_authenticated" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert_own" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_support" ON public.tickets;

-- SELECT Policy
CREATE POLICY "tickets_select_isolated"
    ON public.tickets
    FOR SELECT
    TO authenticated
    USING (
        -- Staff/Admin can read all tickets
        (EXISTS (SELECT 1 FROM public.users curr WHERE curr.id = auth.uid() AND curr.role IN ('Staff', 'Admin')))
        OR
        -- Customers can only read tickets from their hospital
        (hospital_id = (SELECT hospital_id FROM public.users WHERE id = auth.uid()))
    );

-- INSERT Policy
CREATE POLICY "tickets_insert_isolated"
    ON public.tickets
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Staff/Admin can create tickets
        (EXISTS (SELECT 1 FROM public.users curr WHERE curr.id = auth.uid() AND curr.role IN ('Staff', 'Admin')))
        OR
        -- Customers can only create tickets where they are the reporter
        (reporter_id = auth.uid())
    );

-- UPDATE Policy
CREATE POLICY "tickets_update_isolated"
    ON public.tickets
    FOR UPDATE
    TO authenticated
    USING (
        -- ONLY Staff/Admin can update tickets (e.g., status, assignee)
        (EXISTS (SELECT 1 FROM public.users curr WHERE curr.id = auth.uid() AND curr.role IN ('Staff', 'Admin')))
    )
    WITH CHECK (
        (EXISTS (SELECT 1 FROM public.users curr WHERE curr.id = auth.uid() AND curr.role IN ('Staff', 'Admin')))
    );

-- 5. Indexing for performance
CREATE INDEX IF NOT EXISTS idx_tickets_hospital_id ON public.tickets(hospital_id);

COMMENT ON COLUMN public.tickets.hospital_id IS 'Direct reference to hospital for multi-tenant isolation and isolation.';
