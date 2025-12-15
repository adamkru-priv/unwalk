-- ============================================
-- UNWALK: Authentication & Team Management
-- Migration 011
-- ============================================

-- ============================================
-- TABLE: users (extended profiles)
-- Extends Supabase auth.users with app-specific data
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  daily_step_goal INTEGER DEFAULT 10000 CHECK (daily_step_goal > 0),
  tier TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'pro')),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookup
CREATE INDEX idx_users_email ON public.users(email);

-- Auto-update trigger
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: team_invitations
-- Tracks invitations sent between users
-- ============================================
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- NULL until they sign up
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT, -- Optional personal message
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'), -- Invitations expire after 7 days
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate pending invitations
  UNIQUE(sender_id, recipient_email, status)
);

-- Indexes
CREATE INDEX idx_team_invitations_sender ON team_invitations(sender_id);
CREATE INDEX idx_team_invitations_recipient ON team_invitations(recipient_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(recipient_email);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);

-- Auto-update trigger
CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE: team_members
-- Tracks established team relationships (accepted invitations)
-- ============================================
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitation_id UUID NOT NULL REFERENCES team_invitations(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate relationships
  UNIQUE(user_id, member_id),
  
  -- Prevent self-teaming
  CHECK (user_id != member_id)
);

-- Indexes for bidirectional lookups
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_member ON team_members(member_id);

-- ============================================
-- MIGRATE: user_challenges from device_id to user_id
-- ============================================

-- Add user_id column (nullable at first for migration)
ALTER TABLE user_challenges
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Add assigned_by for social challenges
ALTER TABLE user_challenges
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_assigned_by ON user_challenges(assigned_by);

-- Keep device_id for now (backwards compatibility during migration)
-- We'll deprecate it later once all users are authenticated

-- Update unique constraint to include user_id
-- User can only have one active challenge of same type at a time
CREATE UNIQUE INDEX idx_user_challenges_active_unique 
ON user_challenges(user_id, admin_challenge_id) 
WHERE status = 'active' AND user_id IS NOT NULL;

-- ============================================
-- TABLE: challenge_assignments
-- Tracks social challenge assignments (who sent what to whom)
-- ============================================
CREATE TABLE challenge_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  admin_challenge_id UUID NOT NULL REFERENCES admin_challenges(id) ON DELETE CASCADE,
  user_challenge_id UUID REFERENCES user_challenges(id) ON DELETE SET NULL, -- Links to actual challenge when accepted
  message TEXT, -- Optional motivational message
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (sender_id != recipient_id)
);

-- Indexes
CREATE INDEX idx_challenge_assignments_sender ON challenge_assignments(sender_id);
CREATE INDEX idx_challenge_assignments_recipient ON challenge_assignments(recipient_id);
CREATE INDEX idx_challenge_assignments_status ON challenge_assignments(status);

-- Auto-update trigger
CREATE TRIGGER update_challenge_assignments_updated_at
  BEFORE UPDATE ON challenge_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTIONS: Auto-create user profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCTIONS: Accept team invitation
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
  INSERT INTO team_members (user_id, member_id, invitation_id)
  VALUES 
    (v_sender_id, v_recipient_id, invitation_id),
    (v_recipient_id, v_sender_id, invitation_id)
  ON CONFLICT (user_id, member_id) DO NOTHING;
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

-- users: Users can view all profiles (for team discovery)
CREATE POLICY "Anyone can view user profiles"
  ON public.users FOR SELECT
  USING (true);

-- users: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- team_invitations: Users can view invitations they sent or received
CREATE POLICY "Users can view their invitations"
  ON team_invitations FOR SELECT
  USING (
    auth.uid() = sender_id 
    OR auth.uid() = recipient_id
    OR recipient_email = (SELECT email FROM public.users WHERE id = auth.uid())
  );

-- team_invitations: Users can send invitations
CREATE POLICY "Users can send invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- team_invitations: Users can update invitations they sent (cancel) or received (accept/reject)
CREATE POLICY "Users can update their invitations"
  ON team_invitations FOR UPDATE
  USING (
    auth.uid() = sender_id 
    OR auth.uid() = recipient_id
  );

-- team_members: Users can view their team members
CREATE POLICY "Users can view their team"
  ON team_members FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = member_id
  );

-- team_members: Users can remove team members (delete relationship)
CREATE POLICY "Users can remove team members"
  ON team_members FOR DELETE
  USING (auth.uid() = user_id);

-- challenge_assignments: Users can view assignments they sent or received
CREATE POLICY "Users can view their challenge assignments"
  ON challenge_assignments FOR SELECT
  USING (
    auth.uid() = sender_id 
    OR auth.uid() = recipient_id
  );

-- challenge_assignments: Users can send assignments to team members
CREATE POLICY "Users can send challenge assignments"
  ON challenge_assignments FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE user_id = auth.uid() 
      AND member_id = recipient_id
    )
  );

-- challenge_assignments: Users can update assignments they received (accept/reject)
CREATE POLICY "Recipients can update challenge assignments"
  ON challenge_assignments FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Update user_challenges RLS to include user_id
DROP POLICY IF EXISTS "Users can view their own challenges" ON user_challenges;
CREATE POLICY "Users can view their own challenges"
  ON user_challenges FOR SELECT
  USING (
    auth.uid() = user_id 
    OR device_id IS NOT NULL -- Backwards compatibility
  );

DROP POLICY IF EXISTS "Users can update their own challenges" ON user_challenges;
CREATE POLICY "Users can update their own challenges"
  ON user_challenges FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR device_id IS NOT NULL -- Backwards compatibility
  );

DROP POLICY IF EXISTS "Users can create their own challenges" ON user_challenges;
CREATE POLICY "Users can create their own challenges"
  ON user_challenges FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR device_id IS NOT NULL -- Backwards compatibility
  );

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: My team with full details
CREATE OR REPLACE VIEW my_team AS
SELECT 
  tm.id,
  tm.member_id,
  u.email,
  u.display_name,
  u.avatar_url,
  u.tier,
  tm.added_at,
  -- Count their active challenges
  (SELECT COUNT(*) FROM user_challenges uc 
   WHERE uc.user_id = tm.member_id AND uc.status = 'active') as active_challenges_count
FROM team_members tm
JOIN public.users u ON tm.member_id = u.id
WHERE tm.user_id = auth.uid();

-- View: My pending invitations (sent)
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

-- View: My received invitations
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
COMMENT ON TABLE public.users IS 'Extended user profiles (supplements auth.users)';
COMMENT ON TABLE team_invitations IS 'Tracks team invitations between users';
COMMENT ON TABLE team_members IS 'Bidirectional team relationships';
COMMENT ON TABLE challenge_assignments IS 'Social challenge assignments between team members';
COMMENT ON COLUMN user_challenges.user_id IS 'Links to authenticated user (replaces device_id)';
COMMENT ON COLUMN user_challenges.assigned_by IS 'If this challenge was assigned by another user (social challenge)';
