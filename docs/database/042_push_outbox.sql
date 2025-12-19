-- ============================================
-- MOVEE: Push outbox + automatic challenge notifications
-- Migration 042 (docs-only)
-- ============================================

-- Outbox table for push notifications.
-- A background worker (Supabase Edge Function) will deliver these via APNs.
CREATE TABLE IF NOT EXISTS public.push_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'ios' CHECK (platform IN ('ios')),
  type text NOT NULL CHECK (type IN ('challenge_started', 'challenge_completed')),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS push_outbox_status_idx ON public.push_outbox(status, created_at);
CREATE INDEX IF NOT EXISTS push_outbox_user_idx ON public.push_outbox(user_id, created_at);

ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;

-- Only service role (edge function) should read/modify outbox.
DROP POLICY IF EXISTS "push_outbox_service_role_all" ON public.push_outbox;
CREATE POLICY "push_outbox_service_role_all"
  ON public.push_outbox
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- Trigger functions
-- ============================================

CREATE OR REPLACE FUNCTION public.enqueue_challenge_started_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
BEGIN
  -- Only notify authenticated/guest users that are represented in public.users
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Avoid noisy notifications for challenges created from assignments if desired.
  -- (leave enabled by default)

  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'challenge_started',
    'MOVEE',
    'Rozpocząłeś wyzwanie: ' || v_title,
    jsonb_build_object(
      'type', 'challenge_started',
      'user_challenge_id', NEW.id,
      'admin_challenge_id', NEW.admin_challenge_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.enqueue_challenge_completed_push()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(ac.title, 'Challenge') INTO v_title
  FROM admin_challenges ac
  WHERE ac.id = NEW.admin_challenge_id;

  INSERT INTO public.push_outbox (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'challenge_completed',
    'Gratulacje!',
    'Ukończyłeś wyzwanie na 100%: ' || v_title,
    jsonb_build_object(
      'type', 'challenge_completed',
      'user_challenge_id', NEW.id,
      'admin_challenge_id', NEW.admin_challenge_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers on user_challenges
-- ============================================

DROP TRIGGER IF EXISTS trg_push_challenge_started ON public.user_challenges;
CREATE TRIGGER trg_push_challenge_started
  AFTER INSERT ON public.user_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_challenge_started_push();

DROP TRIGGER IF EXISTS trg_push_challenge_completed ON public.user_challenges;
CREATE TRIGGER trg_push_challenge_completed
  AFTER UPDATE ON public.user_challenges
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status = 'completed')
  EXECUTE FUNCTION public.enqueue_challenge_completed_push();

-- Notes:
-- - Delivery is handled by the edge function `process_push_outbox`.
-- - This approach guarantees notifications happen even if the client doesn't explicitly call anything.
