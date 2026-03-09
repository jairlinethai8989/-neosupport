-- ============================================================
-- 007_customizable_ticket_no.sql
-- Description: Allows custom ticket prefixes and sequence starting values per hospital.
-- ============================================================

-- Add customization columns to hospitals table
ALTER TABLE public.hospitals 
ADD COLUMN IF NOT EXISTS ticket_prefix VARCHAR(100),
ADD COLUMN IF NOT EXISTS ticket_padding INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS ticket_format_mode TEXT DEFAULT 'default'; -- 'default', 'ym', 'y'

COMMENT ON COLUMN public.hospitals.ticket_prefix IS 'Custom prefix for ticket numbers (e.g., SRS_KOKHA_IPD_). If NULL, defaults to SRS_{ABBR}_IPD_.';
COMMENT ON COLUMN public.hospitals.ticket_padding IS 'Number of digits for the running number (default 4 -> 0001).';
COMMENT ON COLUMN public.hospitals.ticket_format_mode IS 'Format mode: default (prefix+seq), ym (prefix+YYYYMM+seq), y (prefix+YYYY+seq).';

-- 2. Update existing hospitals with a default prefix based on their abbreviation
UPDATE public.hospitals 
SET ticket_prefix = 'SRS_' || abbreviation || '_IPD_'
WHERE ticket_prefix IS NULL;

-- 3. Modify generate_ticket_no function to use new customization columns
CREATE OR REPLACE FUNCTION public.generate_ticket_no()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_abbreviation VARCHAR;
    v_prefix       VARCHAR;
    v_padding      INTEGER;
    v_format_mode  TEXT;
    v_running_no   BIGINT;
    v_date_part    TEXT := '';
BEGIN
    -- 1. Look up hospital configuration
    SELECT h.abbreviation, 
           COALESCE(h.ticket_prefix, 'SRS_' || h.abbreviation || '_IPD_'),
           COALESCE(h.ticket_padding, 4),
           COALESCE(h.ticket_format_mode, 'default')
      INTO v_abbreviation, v_prefix, v_padding, v_format_mode
      FROM public.users u
      JOIN public.hospitals h ON h.id = u.hospital_id
     WHERE u.id = NEW.reporter_id;

    -- Guard: reporter must exist and belong to a hospital
    IF v_abbreviation IS NULL THEN
        RAISE EXCEPTION 'Cannot generate ticket_no: reporter_id "%" has no associated hospital.', NEW.reporter_id;
    END IF;

    -- 2. Prepare date part based on mode
    IF v_format_mode = 'ym' THEN
        v_date_part := TO_CHAR(NOW(), 'YYYYMM');
    ELSIF v_format_mode = 'y' THEN
        v_date_part := TO_CHAR(NOW(), 'YYYY');
    END IF;

    -- 3. Get the next running number for this hospital
    v_running_no := public.get_or_create_hospital_sequence(v_abbreviation);

    -- 4. Format: {PREFIX}{DATE_PART}{PADDED_NUMBER}
    NEW.ticket_no := v_prefix || v_date_part || LPAD(v_running_no::TEXT, v_padding, '0');

    RETURN NEW;
END;
$$;

-- 4. Create a helper function to reset/set the starting number for a hospital
CREATE OR REPLACE FUNCTION public.set_hospital_ticket_sequence(p_hospital_id UUID, p_next_val BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_abbreviation VARCHAR;
    v_seq_name     TEXT;
BEGIN
    -- Get abbreviation
    SELECT abbreviation INTO v_abbreviation FROM public.hospitals WHERE id = p_hospital_id;
    
    IF v_abbreviation IS NULL THEN
        RAISE EXCEPTION 'Hospital ID % not found.', p_hospital_id;
    END IF;

    v_seq_name := 'ticket_seq_' || LOWER(v_abbreviation);

    -- Ensure sequence exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = v_seq_name
    ) THEN
        EXECUTE format('CREATE SEQUENCE public.%I START WITH %L INCREMENT BY 1', v_seq_name, p_next_val);
    ELSE
        -- Restart sequence at p_next_val
        EXECUTE format('ALTER SEQUENCE public.%I RESTART WITH %L', v_seq_name, p_next_val);
    END IF;
END;
$$;

COMMENT ON FUNCTION public.set_hospital_ticket_sequence IS 'Manually sets the next starting number for a hospital''s ticket sequence.';
