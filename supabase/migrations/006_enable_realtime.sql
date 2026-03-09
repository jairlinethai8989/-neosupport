-- ============================================================
-- Enable Supabase Realtime for Messages Table
-- ============================================================

-- 1. Enable REALTIME on the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 2. Add an anonymous select policy so the frontend client can receive messages
-- NOTE: In a production app, you'd restrict this to authenticated staff members.
CREATE POLICY "messages_select_anon"
    ON public.messages
    FOR SELECT
    TO anon
    USING (true);
