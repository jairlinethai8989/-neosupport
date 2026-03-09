-- ============================================================
-- Enable Supabase Realtime for Messages Table
-- ============================================================

-- 1. Enable REALTIME on the messages table (only if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

-- 2. Add an anonymous select policy so the frontend client can receive messages
-- NOTE: In a production app, you'd restrict this to authenticated staff members.
DROP POLICY IF EXISTS "messages_select_anon" ON public.messages;
CREATE POLICY "messages_select_anon"
    ON public.messages
    FOR SELECT
    TO anon
    USING (true);
