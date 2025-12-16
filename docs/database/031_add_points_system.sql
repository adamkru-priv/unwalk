-- ============================================
-- MOVEE: Points System for Pro Users
-- Migration 031
-- ============================================

-- Add total_points column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0 CHECK (total_points >= 0);

-- Create index for points leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_total_points ON public.users(total_points DESC) WHERE tier = 'pro';

-- Function to add points to user
CREATE OR REPLACE FUNCTION add_points_to_user(
  p_user_id UUID,
  p_points INTEGER
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET total_points = COALESCE(total_points, 0) + p_points,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN public.users.total_points IS 'Total points earned by Pro users from completing challenges';
COMMENT ON FUNCTION add_points_to_user IS 'Adds points to user total (Pro tier only)';
