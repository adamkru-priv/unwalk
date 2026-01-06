-- Add background check settings to users table
-- This allows users' background check preferences to sync across devices

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS background_check_interval_minutes INTEGER DEFAULT 15 CHECK (background_check_interval_minutes IN (5, 10, 15, 30, 60));

COMMENT ON COLUMN public.users.background_check_interval_minutes IS 'How often to check steps in background (iOS only). Options: 5, 10, 15, 30, 60 minutes';

-- Add background check history table (optional - for analytics)
CREATE TABLE IF NOT EXISTS public.background_check_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    steps_count INTEGER NOT NULL,
    goals_achieved JSONB,
    notifications_sent INTEGER DEFAULT 0,
    device_platform TEXT,
    app_version TEXT
);

-- Index for querying user's check history
CREATE INDEX IF NOT EXISTS idx_background_check_history_user_id ON public.background_check_history(user_id);
CREATE INDEX IF NOT EXISTS idx_background_check_history_checked_at ON public.background_check_history(checked_at DESC);

-- RLS Policies
ALTER TABLE public.background_check_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own background check history" ON public.background_check_history;
CREATE POLICY "Users can view their own background check history"
    ON public.background_check_history
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own background check history" ON public.background_check_history;
CREATE POLICY "Users can insert their own background check history"
    ON public.background_check_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to log background check (called from app)
CREATE OR REPLACE FUNCTION public.log_background_check(
    p_steps_count INTEGER,
    p_goals_achieved JSONB DEFAULT NULL,
    p_notifications_sent INTEGER DEFAULT 0,
    p_device_platform TEXT DEFAULT 'ios',
    p_app_version TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_check_id UUID;
BEGIN
    INSERT INTO public.background_check_history (
        user_id,
        steps_count,
        goals_achieved,
        notifications_sent,
        device_platform,
        app_version
    ) VALUES (
        auth.uid(),
        p_steps_count,
        p_goals_achieved,
        p_notifications_sent,
        p_device_platform,
        p_app_version
    )
    RETURNING id INTO v_check_id;
    
    RETURN v_check_id;
END;
$$;

-- Function to get user's background check stats
CREATE OR REPLACE FUNCTION public.get_background_check_stats(
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    total_checks BIGINT,
    avg_steps INTEGER,
    total_notifications_sent BIGINT,
    last_check_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_checks,
        AVG(steps_count)::INTEGER as avg_steps,
        SUM(notifications_sent)::BIGINT as total_notifications_sent,
        MAX(checked_at) as last_check_at
    FROM public.background_check_history
    WHERE user_id = auth.uid()
        AND checked_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

COMMENT ON FUNCTION public.log_background_check IS 'Log a background step check from mobile app';
COMMENT ON FUNCTION public.get_background_check_stats IS 'Get user background check statistics for analytics';
