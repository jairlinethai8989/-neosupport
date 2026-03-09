-- ============================================================
-- Messages Table
-- Stores individual LINE messages linked to tickets.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id       UUID         NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    line_uid        VARCHAR(255) NOT NULL,           -- LINE user who sent the message
    content         TEXT         NOT NULL,            -- Message text content
    message_type    VARCHAR(50)  NOT NULL DEFAULT 'text',  -- text, image, sticker, etc.
    line_message_id VARCHAR(255) UNIQUE,             -- Original LINE message ID (for dedup)
    direction       VARCHAR(10)  NOT NULL DEFAULT 'inbound', -- 'inbound' (user→bot) or 'outbound' (bot→user)
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.messages IS 'Stores LINE conversation messages linked to support tickets.';
COMMENT ON COLUMN public.messages.ticket_id IS 'References tickets.id — which ticket this message belongs to.';
COMMENT ON COLUMN public.messages.direction IS 'inbound = user sent to bot, outbound = bot replied to user.';

-- Indexes for common query patterns
CREATE INDEX idx_messages_ticket_id  ON public.messages(ticket_id);
CREATE INDEX idx_messages_line_uid   ON public.messages(line_uid);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- ============================================================
-- RLS Policies for messages
-- ============================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all messages
DROP POLICY IF EXISTS "messages_select_authenticated" ON public.messages;
CREATE POLICY "messages_select_authenticated"
    ON public.messages
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role has full access (for webhook API route)
DROP POLICY IF EXISTS "messages_all_service_role" ON public.messages;
CREATE POLICY "messages_all_service_role"
    ON public.messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
