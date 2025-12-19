-- Device push tokens (APNs)
-- Stores per-install/device token for iOS push notifications.

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios')),
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(token)
);

CREATE INDEX IF NOT EXISTS device_push_tokens_user_id_idx ON public.device_push_tokens(user_id);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users (including guests) can read their own tokens
DROP POLICY IF EXISTS "device_push_tokens_select_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_select_own"
  ON public.device_push_tokens
  FOR SELECT
  USING (user_id = auth.uid());

-- Users (including guests) can insert tokens for themselves
DROP POLICY IF EXISTS "device_push_tokens_insert_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_insert_own"
  ON public.device_push_tokens
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update only their own rows
DROP POLICY IF EXISTS "device_push_tokens_update_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_update_own"
  ON public.device_push_tokens
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete only their own rows
DROP POLICY IF EXISTS "device_push_tokens_delete_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_delete_own"
  ON public.device_push_tokens
  FOR DELETE
  USING (user_id = auth.uid());
