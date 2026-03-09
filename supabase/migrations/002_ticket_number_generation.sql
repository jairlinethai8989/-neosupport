-- ============================================================
-- Ticket Number Auto-Generation System
-- ============================================================
-- Format: SRS_{HOSPITAL_ABBR}_IPD_{RUNNING_NUMBER}
-- Example: SRS_KOKHA_IPD_0154
--
-- Strategy:
--   - One sequence PER HOSPITAL to avoid cross-hospital conflicts.
--   - A trigger on INSERT automatically generates ticket_no.
--   - Running number is zero-padded to 4 digits.
-- ============================================================

-- ============================================================
-- FUNCTION: get_or_create_hospital_sequence
-- Ensures each hospital has its own sequence for ticket numbering.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_hospital_sequence(p_abbreviation VARCHAR)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    seq_name TEXT;
    next_val BIGINT;
BEGIN
    -- Build a safe sequence name from the abbreviation
    seq_name := 'ticket_seq_' || LOWER(p_abbreviation);

    -- Check if the sequence exists; if not, create it
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = seq_name
    ) THEN
        EXECUTE format('CREATE SEQUENCE public.%I START WITH 1 INCREMENT BY 1', seq_name);
    END IF;

    -- Get the next value
    EXECUTE format('SELECT nextval(''public.%I'')', seq_name) INTO next_val;

    RETURN next_val;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_hospital_sequence IS 
    'Creates a per-hospital sequence if it does not exist, then returns the next value.';

-- ============================================================
-- FUNCTION: generate_ticket_no
-- Trigger function that auto-generates ticket_no on INSERT.
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_ticket_no()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_abbreviation VARCHAR;
    v_running_no   BIGINT;
BEGIN
    -- 1. Look up the hospital abbreviation via the reporter
    SELECT h.abbreviation
      INTO v_abbreviation
      FROM public.users u
      JOIN public.hospitals h ON h.id = u.hospital_id
     WHERE u.id = NEW.reporter_id;

    -- Guard: reporter must exist and belong to a hospital
    IF v_abbreviation IS NULL THEN
        RAISE EXCEPTION 'Cannot generate ticket_no: reporter_id "%" has no associated hospital.', NEW.reporter_id;
    END IF;

    -- 2. Get the next running number for this hospital
    v_running_no := public.get_or_create_hospital_sequence(v_abbreviation);

    -- 3. Format: SRS_{ABBR}_IPD_{0001}
    NEW.ticket_no := 'SRS_' || v_abbreviation || '_IPD_' || LPAD(v_running_no::TEXT, 4, '0');

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.generate_ticket_no IS 
    'Trigger function: auto-generates ticket_no as SRS_{ABBR}_IPD_{000X} on new ticket insert.';

-- ============================================================
-- TRIGGER: trg_generate_ticket_no
-- Fires BEFORE INSERT on tickets to set ticket_no automatically.
-- ============================================================
DROP TRIGGER IF EXISTS trg_generate_ticket_no ON public.tickets;
CREATE TRIGGER trg_generate_ticket_no
    BEFORE INSERT ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_ticket_no();

-- ============================================================
-- FUNCTION: update_updated_at
-- Automatically sets updated_at on row modification.
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON public.tickets;
CREATE TRIGGER trg_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
