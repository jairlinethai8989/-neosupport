-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================
-- These are PLACEHOLDER policies. Adjust them to match your
-- actual authentication strategy (Supabase Auth, service_role, etc.)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HOSPITALS - Read-only for authenticated users
-- ============================================================
CREATE POLICY "hospitals_select_authenticated"
    ON public.hospitals
    FOR SELECT
    TO authenticated
    USING (true);

-- Only service_role (admin/backend) can insert/update/delete hospitals
CREATE POLICY "hospitals_all_service_role"
    ON public.hospitals
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- USERS - Users can read their own data + hospital peers
-- ============================================================

-- Any authenticated user can see all users (for display names, etc.)
CREATE POLICY "users_select_authenticated"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can update only their own profile
-- NOTE: Match auth.uid() to users.id if you link Supabase Auth to this table.
-- If using LINE UID, you'll need a custom JWT claim or a mapping table.
CREATE POLICY "users_update_own"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Service role can manage all users
CREATE POLICY "users_all_service_role"
    ON public.users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- TICKETS - Core access control
-- ============================================================

-- Authenticated users can read all tickets (dashboard visibility)
CREATE POLICY "tickets_select_authenticated"
    ON public.tickets
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can create tickets (reporter_id must match their own ID)
CREATE POLICY "tickets_insert_own"
    ON public.tickets
    FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = auth.uid());

-- Support staff can update any ticket (adjust role check as needed)
-- PLACEHOLDER: In production, check for a 'support' or 'admin' role claim.
CREATE POLICY "tickets_update_support"
    ON public.tickets
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Service role has full access
CREATE POLICY "tickets_all_service_role"
    ON public.tickets
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- ANON access for LINE webhook (if needed)
-- ============================================================
-- If your LINE webhook uses the anon key with a service-level
-- function, you may want to allow anon INSERT on tickets:
--
-- CREATE POLICY "tickets_insert_anon_webhook"
--     ON public.tickets
--     FOR INSERT
--     TO anon
--     WITH CHECK (source = 'LINE');
--
-- SECURITY NOTE: Be cautious with anon policies. 
-- Prefer using a Supabase Edge Function with service_role key instead.
