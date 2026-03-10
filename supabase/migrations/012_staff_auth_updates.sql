-- ============================================================
-- Migration: Add Staff Authentication & Approval Workflow
-- Description: Adds status, profile image, and role to users table.
-- ============================================================

-- 1. Create a custom ENUM for user status if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE public.user_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- 2. Add new columns to public.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status public.user_status NOT NULL DEFAULT 'approved', -- Default approved for existing users
ADD COLUMN IF NOT EXISTS line_picture_url TEXT,
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT false;

-- 3. Update existing users to be 'approved' and 'is_staff' if needed
-- (Assumption: current users are already active staff/reporters)
UPDATE public.users SET status = 'approved', is_staff = true WHERE status IS NULL;

-- 4. Set default for NEW users going forward to 'pending' for staff registration flow
-- (Note: We might keep it 'approved' and handle 'pending' in the registration logic instead)
-- ALTER TABLE public.users ALTER COLUMN status SET DEFAULT 'pending';

COMMENT ON COLUMN public.users.status IS 'Status for approval workflow (pending, approved, rejected).';
COMMENT ON COLUMN public.users.is_staff IS 'Distinguishes between hospital staff (reporters) and IT Support staff.';
COMMENT ON COLUMN public.users.full_name IS 'Real name of the employee for verification.';
