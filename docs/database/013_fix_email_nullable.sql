-- ============================================
-- Fix: Make email nullable for guest users
-- ============================================

-- Remove NOT NULL constraint from email column
ALTER TABLE public.users 
ALTER COLUMN email DROP NOT NULL;

-- Ensure unique constraint only on non-null emails
DROP INDEX IF EXISTS users_email_key;
CREATE UNIQUE INDEX users_email_key ON public.users(email) WHERE email IS NOT NULL;

COMMENT ON COLUMN public.users.email IS 'Email address (NULL for guest users)';
