-- ========================================
-- 🎯 TRIGGER: Send push notification when team challenge invitation is created
-- ========================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_team_challenge_invitation_created ON team_challenge_invitations;
DROP FUNCTION IF EXISTS notify_team_challenge_invitation();

-- Create function that adds notification to push_outbox
CREATE OR REPLACE FUNCTION notify_team_challenge_invitation()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_challenge_title TEXT;
BEGIN
  -- Only send notification for new 'pending' invitations
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get sender's display name
  SELECT display_name INTO v_sender_name
  FROM users
  WHERE id = NEW.invited_by;

  -- Get challenge title
  SELECT title INTO v_challenge_title
  FROM admin_challenges
  WHERE id = NEW.challenge_id;

  -- Set defaults if not found
  v_sender_name := COALESCE(v_sender_name, 'Someone');
  v_challenge_title := COALESCE(v_challenge_title, 'a team challenge');

  -- ✅ Insert push notification into push_outbox (ALWAYS succeeds)
  BEGIN
    INSERT INTO push_outbox (
      user_id,
      platform,
      type,
      title,
      body,
      data,
      status,
      attempts
    ) VALUES (
      NEW.invited_user,
      'ios',
      'team_challenge_invitation',
      '👥 Team Challenge Invitation',
      v_sender_name || ' invited you to join "' || v_challenge_title || '"!',
      jsonb_build_object(
        'invitation_id', NEW.id,
        'challenge_id', NEW.challenge_id,
        'invited_by', NEW.invited_by,
        'sender_name', v_sender_name,
        'challenge_title', v_challenge_title
      ),
      'pending',
      0
    );
    
    RAISE NOTICE '✅ Push notification created for user: %', NEW.invited_user;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING '❌ Failed to create push notification: %', SQLERRM;
  END;

  -- ✅ NOTE: Email is sent separately by frontend code
  -- (Edge Function called from TeamChallengeInviteModal.tsx)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_team_challenge_invitation_created
  AFTER INSERT ON team_challenge_invitations
  FOR EACH ROW
  EXECUTE FUNCTION notify_team_challenge_invitation();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON push_outbox TO anon, authenticated;

COMMENT ON FUNCTION notify_team_challenge_invitation() IS 'Automatically sends push notification when user receives team challenge invitation. Email is sent by frontend.';
COMMENT ON TRIGGER on_team_challenge_invitation_created ON team_challenge_invitations IS 'Triggers push notification on new team challenge invitation';
