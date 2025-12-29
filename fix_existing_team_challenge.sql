-- Manually set team_id for existing challenge to move it from SOLO to TEAM

-- Update the challenge that was just created (8ef0f56c-d1b3-412f-a1fd-f71ba15960f3)
UPDATE public.user_challenges
SET team_id = id  -- Use its own ID as team_id
WHERE id = '8ef0f56c-d1b3-412f-a1fd-f71ba15960f3'
  AND team_id IS NULL;

-- Verify the update
SELECT 
  id,
  user_id,
  admin_challenge_id,
  team_id,
  status,
  current_steps,
  (SELECT title FROM admin_challenges WHERE id = user_challenges.admin_challenge_id) as challenge_title
FROM user_challenges
WHERE id = '8ef0f56c-d1b3-412f-a1fd-f71ba15960f3';
