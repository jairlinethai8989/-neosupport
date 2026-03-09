-- ============================================================
-- 009_create_cleanup_logs.sql
-- Description: Table to store metadata of deleted attachments (for audit/backup purposes).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cleanup_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id   UUID,
    message_id  UUID,
    file_name   VARCHAR(255),
    public_url  TEXT,
    file_type   VARCHAR(50),
    deleted_at  TIMESTAMPTZ DEFAULT NOW(),
    metadata    JSONB -- Any extra info like ticket_no or sender
);

COMMENT ON TABLE public.cleanup_logs IS 'Logs metadata of files deleted by the 30-day cleanup policy.';
