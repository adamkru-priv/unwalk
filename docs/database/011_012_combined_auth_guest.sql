-- ============================================
-- MOVEE: Authentication & Team Management + Guest Support
-- Combined Migration 011 + 012
-- ============================================

-- ============================================
-- PREREQUISITE: Create update_updated_at function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLE: users (extended profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  device_id TEXT UNIQUE,
  is_guest BOOLEAN DEFAULT false,
  daily_step_goal INTEGER DEFAULT 10000 CHECK (daily_step_goal > 0),
  tier TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'pro')),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_device_id ON public.users(device_id);
CREATE INDEX IF NOT EXISTS idx_users_is_guest ON public.users(is_guest);

-- Email unique constraint (allow NULL for guests)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users(email) WHERE email IS NOT NULL;

-- Auto-update trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: team_invitations
-- ============================================
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_invitations_sender ON team_invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_recipient ON team_invitations(recipient_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(recipient_email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

-- Auto-update trigger
DROP TRIGGER IF EXISTS update_team_invitations_updated_at ON team_invitations;
CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: team_members
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, member_id),
  CHECK (user_id != member_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member ON team_members(member_id);

-- ============================================
-- MIGRATE: user_challenges - add user_id
-- ============================================
ALTER TABLE user_challenges
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE user_challenges
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_assigned_by ON user_challenges(assigned_by);

-- Unique constraint: one active challenge per user
DROP INDEX IF EXISTS idx_user_challenges_active_unique;
CREATE UNIQUE INDEX idx_user_challenges_active_unique 
ON user_challenges(user_id, admin_challenge_id) 
WHERE status = 'active' AND user_id IS NOT NULL;

-- ============================================
-- TABLE: challenge_assignments
-- ============================================
CREATE TABLE IF NOT EXISTS challenge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  admin_challenge_id UUID NOT NULL REFERENCES admin_challenges(id) ON DELETE CASCADE,
  user_challenge_id UUID REFERENCES user_challenges(id) ON DELETE SET NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (sender_id != recipient_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenge_assignments_sender ON challenge_assignments(sender_id);
CREATE INDEX IF NOT EXISTS idx_challenge_assignments_recipient ON challenge_assignments(recipient_id);
CREATE INDEX IF NOT EXISTS idx_challenge_assignments_status ON challenge_assignments(status);

-- Auto-update trigger
DROP TRIGGER IF EXISTS update_challenge_assignments_updated_at ON challenge_assignments;
CREATE TRIGGER update_challenge_assignments_updated_at
  BEFORE UPDATE ON challenge_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Auto-create user profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url, is_guest)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCTION: Create guest user
-- ============================================
CREATE OR REPLACE FUNCTION public.create_guest_user(p_device_id TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_display_name TEXT;
  v_suffix TEXT;
BEGIN
  -- Check if guest already exists
  SELECT id INTO v_user_id
  FROM public.users
  WHERE device_id = p_device_id;
  
  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;
  
  -- Generate Guest display name from device_id (last 4 chars)
  v_suffix := SUBSTRING(p_device_id FROM LENGTH(p_device_id) - 3);
  v_display_name := 'Guest_' || v_suffix;
  
  -- Create new guest user
  v_user_id := gen_random_uuid();
  
  INSERT INTO public.users (
    id,
    device_id,
    display_name,
    email,
    tier,
    is_guest,
    onboarding_completed
  ) VALUES (
    v_user_id,
    p_device_id,
    v_display_name,
    NULL,
    'basic',
    true,
    false
  );
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Convert guest to logged user
-- ============================================
CREATE OR REPLACE FUNCTION public.convert_guest_to_user(
  p_device_id TEXT,
  p_auth_user_id UUID,
  p_email TEXT
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id UUID;
BEGIN
  -- Find guest user by device_id
  SELECT id INTO v_guest_id
  FROM public.users
  WHERE device_id = p_device_id
    AND is_guest = true;
  
  IF v_guest_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Update all user_challenges to point to new auth user
  UPDATE user_challenges
  SET user_id = p_auth_user_id
  WHERE user_id = v_guest_id;
  
  -- Update team_members relationships
  UPDATE team_members
  SET user_id = p_auth_user_id
  WHERE user_id = v_guest_id;
  
  UPDATE team_members
  SET member_id = p_auth_user_id
  WHERE member_id = v_guest_id;
  
  -- Update challenge assignments
  UPDATE challenge_assignments
  SET sender_id = p_auth_user_id
  WHERE sender_id = v_guest_id;
  
  UPDATE challenge_assignments
  SET recipient_id = p_auth_user_id
  WHERE recipient_id = v_guest_id;
  
  -- Delete old guest user
  DELETE FROM public.users WHERE id = v_guest_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Accept team invitation
-- ============================================
CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_recipient_id UUID;
BEGIN
  -- Get invitation details
  SELECT sender_id, recipient_id 
  INTO v_sender_id, v_recipient_id
  FROM team_invitations
  WHERE id = invitation_id
    AND status = 'pending'
    AND recipient_id = auth.uid()
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Update invitation status
  UPDATE team_invitations
  SET status = 'accepted',
      responded_at = NOW()
  WHERE id = invitation_id;
  
  -- Create bidirectional team relationship
  INSERT INTO team_members (user_id, member_id)
  VALUES 
    (v_sender_id, v_recipient_id),
    (v_recipient_id, v_sender_id)
  ON CONFLICT (user_id, member_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Cleanup inactive guests
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_inactive_guests(days_inactive INTEGER DEFAULT 30)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.users
    WHERE is_guest = true
      AND updated_at < NOW() - (days_inactive || ' days')::INTERVAL
      AND NOT EXISTS (
        SELECT 1 FROM user_challenges
        WHERE user_id = public.users.id
          AND status = 'active'
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_assignments ENABLE ROW LEVEL SECURITY;

-- users: Anyone can view profiles
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;
CREATE POLICY "Anyone can view user profiles"
  ON public.users FOR SELECT
  USING (true);

-- users: Users can update own profile (including guests by device_id)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (
    auth.uid() = id
    OR device_id IN (SELECT device_id FROM public.users WHERE id = auth.uid())
  );

-- team_invitations: View own invitations
DROP POLICY IF EXISTS "Users can view their invitations" ON team_invitations;
CREATE POLICY "Users can view their invitations"
  ON team_invitations FOR SELECT
  USING (
    auth.uid() = sender_id 
    OR auth.uid() = recipient_id
    OR recipient_email = (SELECT email FROM public.users WHERE id = auth.uid())
  );

-- team_invitations: Send invitations
DROP POLICY IF EXISTS "Users can send invitations" ON team_invitations;
CREATE POLICY "Users can send invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- team_invitations: Update own invitations
DROP POLICY IF EXISTS "Users can update their invitations" ON team_invitations;
CREATE POLICY "Users can update their invitations"
  ON team_invitations FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- team_members: View own team
DROP POLICY IF EXISTS "Users can view their team" ON team_members;
CREATE POLICY "Users can view their team"
  ON team_members FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = member_id);

-- team_members: Remove members
DROP POLICY IF EXISTS "Users can remove team members" ON team_members;
CREATE POLICY "Users can remove team members"
  ON team_members FOR DELETE
  USING (auth.uid() = user_id);

-- challenge_assignments: View assignments
DROP POLICY IF EXISTS "Users can view their challenge assignments" ON challenge_assignments;
CREATE POLICY "Users can view their challenge assignments"
  ON challenge_assignments FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- challenge_assignments: Send assignments
DROP POLICY IF EXISTS "Users can send challenge assignments" ON challenge_assignments;
CREATE POLICY "Users can send challenge assignments"
  ON challenge_assignments FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE user_id = auth.uid() AND member_id = recipient_id
    )
  );

-- challenge_assignments: Update assignments
DROP POLICY IF EXISTS "Recipients can update challenge assignments" ON challenge_assignments;
CREATE POLICY "Recipients can update challenge assignments"
  ON challenge_assignments FOR UPDATE
  USING (auth.uid() = recipient_id);

-- user_challenges: View own challenges (including guests)
DROP POLICY IF EXISTS "Users can view their own challenges" ON user_challenges;
CREATE POLICY "Users can view their own challenges"
  ON user_challenges FOR SELECT
  USING (
    auth.uid() = user_id 
    OR device_id IS NOT NULL
    OR user_id IN (SELECT id FROM public.users WHERE is_guest = true)
  );

-- user_challenges: Update own challenges
DROP POLICY IF EXISTS "Users can update their own challenges" ON user_challenges;
CREATE POLICY "Users can update their own challenges"
  ON user_challenges FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR device_id IS NOT NULL
    OR user_id IN (SELECT id FROM public.users WHERE is_guest = true)
  );

-- user_challenges: Create challenges
DROP POLICY IF EXISTS "Users can create their own challenges" ON user_challenges;
CREATE POLICY "Users can create their own challenges"
  ON user_challenges FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR device_id IS NOT NULL
    OR user_id IN (SELECT id FROM public.users WHERE is_guest = true)
  );

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: My team
CREATE OR REPLACE VIEW my_team AS
SELECT 
  tm.id,
  tm.member_id,
  u.email,
  u.display_name,
  u.avatar_url,
  u.tier,
  tm.added_at,
  (SELECT COUNT(*) FROM user_challenges uc 
   WHERE uc.user_id = tm.member_id AND uc.status = 'active') as active_challenges_count
FROM team_members tm
JOIN public.users u ON tm.member_id = u.id
WHERE tm.user_id = auth.uid();

-- View: Sent invitations
CREATE OR REPLACE VIEW my_sent_invitations AS
SELECT 
  ti.id,
  ti.recipient_email,
  ti.recipient_id,
  u.display_name as recipient_name,
  u.avatar_url as recipient_avatar,
  ti.status,
  ti.message,
  ti.invited_at,
  ti.expires_at
FROM team_invitations ti
LEFT JOIN public.users u ON ti.recipient_id = u.id
WHERE ti.sender_id = auth.uid()
ORDER BY ti.invited_at DESC;

-- View: Received invitations
CREATE OR REPLACE VIEW my_received_invitations AS
SELECT 
  ti.id,
  ti.sender_id,
  u.email as sender_email,
  u.display_name as sender_name,
  u.avatar_url as sender_avatar,
  ti.status,
  ti.message,
  ti.invited_at,
  ti.expires_at
FROM team_invitations ti
JOIN public.users u ON ti.sender_id = u.id
WHERE ti.recipient_id = auth.uid()
  OR ti.recipient_email = (SELECT email FROM public.users WHERE id = auth.uid())
ORDER BY ti.invited_at DESC;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.users IS 'User profiles (authenticated + guests)';
COMMENT ON COLUMN public.users.device_id IS 'Unique device ID for guest users';
COMMENT ON COLUMN public.users.is_guest IS 'True if user is a guest (no auth account)';
COMMENT ON TABLE team_invitations IS 'Team invitations between users';
COMMENT ON TABLE team_members IS 'Bidirectional team relationships';
COMMENT ON TABLE challenge_assignments IS 'Social challenge assignments';
COMMENT ON FUNCTION public.create_guest_user IS 'Creates guest user record';
COMMENT ON FUNCTION public.convert_guest_to_user IS 'Migrates guest data after signup';
COMMENT ON FUNCTION cleanup_inactive_guests IS 'Removes inactive guests';
