-- ============================================================
-- 008_setup_storage_attachments.sql
-- Description: Creates the 'attachments' bucket and sets up RLS policies.
-- ============================================================

-- 1. Create the bucket (safe to run multiple times)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (if not already enabled)
-- Note: Supabase enables this by default, but we ensure policies exist.

-- 3. Policy: Allow uploads (Authenticated and Anon as fallback for local dev)
DROP POLICY IF EXISTS "Allow authenticated uploads to attachments" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to attachments"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Allow anon uploads to attachments" ON storage.objects;
CREATE POLICY "Allow anon uploads to attachments"
ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'attachments');

-- 4. Policy: Allow updates
DROP POLICY IF EXISTS "Allow authenticated updates to attachments" ON storage.objects;
CREATE POLICY "Allow authenticated updates to attachments"
ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'attachments') WITH CHECK (bucket_id = 'attachments');

-- 5. Policy: Allow public view access to attachments
DROP POLICY IF EXISTS "Allow public view access to attachments" ON storage.objects;
CREATE POLICY "Allow public view access to attachments"
ON storage.objects FOR SELECT TO public USING (bucket_id = 'attachments');

-- 6. Policy: Allow authenticated users to delete (if needed)
DROP POLICY IF EXISTS "Allow authenticated deletions from attachments" ON storage.objects;
CREATE POLICY "Allow authenticated deletions from attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');
