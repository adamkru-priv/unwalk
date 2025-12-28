-- Sprawdź dane aktywnego challenge "Window Shopping"
SELECT 
  uc.id::text as user_challenge_id,
  uc.current_steps,
  ac.title,
  ac.goal_steps,
  ac.points,  -- ✅ To pole musi mieć wartość!
  ac.is_custom
FROM user_challenges uc
JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
WHERE uc.user_id = (SELECT id FROM users WHERE email = 'adam.krusz@gmail.com')
  AND uc.status = 'active'
ORDER BY uc.created_at DESC
LIMIT 1;