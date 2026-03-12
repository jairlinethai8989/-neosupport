-- ============================================================
-- Add role column to users table
-- ============================================================

-- Create an enum for user roles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('Customer', 'Staff', 'Admin');
    END IF;
END $$;

-- Add role column with default 'Customer'
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'Customer';

-- Index for filtering by role
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

COMMENT ON COLUMN public.users.role IS 'User role: Customer (Hosp staff), Staff (IT support), Admin (Superuser)';
