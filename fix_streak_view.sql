-- Fix ambiguous column reference in user_daily_stats view
CREATE OR REPLACE VIEW user_daily_stats AS
SELECT 
  u.id as user_id,
  u.display_name,
  u.avatar_url,
  u.today_steps,
  u.today_base_xp,
  u.last_steps_sync_date,
  u.current_streak,
  u.xp as total_xp,
  u.level,
  dq.completed as daily_quest_completed,
  dq.xp_reward as daily_quest_xp,
  COUNT(DISTINCT uc.id) FILTER (WHERE uc.status = 'active' AND ac.is_team_challenge = true) as active_team_challenges
FROM public.users u
LEFT JOIN public.daily_quests dq ON dq.user_id = u.id AND dq.quest_date = CURRENT_DATE
LEFT JOIN public.user_challenges uc ON uc.user_id = u.id
LEFT JOIN public.admin_challenges ac ON ac.id = uc.admin_challenge_id
GROUP BY u.id, u.display_name, u.avatar_url, u.today_steps, u.today_base_xp, 
         u.last_steps_sync_date, u.current_streak, u.xp, u.level, 
         dq.completed, dq.xp_reward;
