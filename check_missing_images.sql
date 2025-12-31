-- ============================================
-- CHECK MISSING IMAGES IN ALL CHALLENGE TABLES
-- ============================================

-- 1. ADMIN CHALLENGES - główna tabela z wyzwaniami
SELECT 
  '📋 ADMIN CHALLENGES' as source,
  id,
  title,
  description,
  goal_steps,
  time_limit_hours,
  points,
  CASE 
    WHEN image_url IS NULL THEN '❌ BRAK'
    WHEN image_url = '' THEN '❌ PUSTY'
    ELSE '✅ ' || image_url
  END as image_status,
  is_team_challenge,
  created_at
FROM admin_challenges
WHERE image_url IS NULL OR image_url = ''
ORDER BY created_at DESC;

-- 2. USER CHALLENGES - aktywne wyzwania użytkowników (dziedziczą z admin_challenges)
SELECT 
  '🏃 USER CHALLENGES (active)' as source,
  uc.id as user_challenge_id,
  u.email,
  ac.title as challenge_title,
  ac.goal_steps,
  CASE 
    WHEN ac.image_url IS NULL THEN '❌ BRAK'
    WHEN ac.image_url = '' THEN '❌ PUSTY'
    ELSE '✅ ' || ac.image_url
  END as image_status,
  uc.status,
  uc.current_steps,
  uc.started_at
FROM user_challenges uc
JOIN users u ON u.id = uc.user_id
JOIN admin_challenges ac ON ac.id = uc.admin_challenge_id
WHERE (ac.image_url IS NULL OR ac.image_url = '')
  AND uc.status = 'active'
ORDER BY uc.started_at DESC;

-- 3. CHALLENGE ASSIGNMENTS - wysłane wyzwania (również dziedziczą z admin_challenges)
SELECT 
  '📨 CHALLENGE ASSIGNMENTS (pending)' as source,
  ca.id as assignment_id,
  sender.email as sender_email,
  recipient.email as recipient_email,
  ac.title as challenge_title,
  CASE 
    WHEN ac.image_url IS NULL THEN '❌ BRAK'
    WHEN ac.image_url = '' THEN '❌ PUSTY'
    ELSE '✅ ' || ac.image_url
  END as image_status,
  ca.status,
  ca.sent_at
FROM challenge_assignments ca
JOIN users sender ON sender.id = ca.sender_id
JOIN users recipient ON recipient.id = ca.recipient_id
JOIN admin_challenges ac ON ac.id = ca.admin_challenge_id
WHERE (ac.image_url IS NULL OR ac.image_url = '')
  AND ca.status = 'pending'
ORDER BY ca.sent_at DESC;

-- 4. TEAM MEMBERS WITH CHALLENGES - zaproszenia do team challenge
SELECT 
  '👥 TEAM CHALLENGE INVITATIONS' as source,
  tm.id as team_member_id,
  host.email as host_email,
  member.email as member_email,
  ac.title as challenge_title,
  CASE 
    WHEN ac.image_url IS NULL THEN '❌ BRAK'
    WHEN ac.image_url = '' THEN '❌ PUSTY'
    ELSE '✅ ' || ac.image_url
  END as image_status,
  tm.challenge_status,
  tm.invited_to_challenge_at
FROM team_members tm
JOIN users host ON host.id = tm.user_id
JOIN users member ON member.id = tm.member_id
JOIN admin_challenges ac ON ac.id = tm.active_challenge_id
WHERE (ac.image_url IS NULL OR ac.image_url = '')
  AND tm.active_challenge_id IS NOT NULL
ORDER BY tm.invited_to_challenge_at DESC;

-- 5. SUMMARY - podsumowanie brakujących obrazków
SELECT 
  '📊 PODSUMOWANIE' as info,
  COUNT(*) as total_challenges_without_images,
  COUNT(DISTINCT id) as unique_challenges_without_images
FROM admin_challenges
WHERE image_url IS NULL OR image_url = '';

-- 6. LIST ALL UNIQUE CHALLENGES WITHOUT IMAGES (do wstrzelenia obrazków)
SELECT 
  '🎯 LISTA DO NAPRAWY' as action,
  id,
  title,
  goal_steps,
  time_limit_hours,
  is_team_challenge,
  -- Sugestia URL na podstawie tytułu/tematu
  CASE 
    WHEN title ILIKE '%walk%' OR title ILIKE '%march%' THEN 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=800'
    WHEN title ILIKE '%sprint%' OR title ILIKE '%race%' THEN 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800'
    WHEN title ILIKE '%mountain%' OR title ILIKE '%hike%' THEN 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800'
    WHEN title ILIKE '%city%' OR title ILIKE '%urban%' THEN 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800'
    WHEN title ILIKE '%beach%' OR title ILIKE '%coast%' THEN 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'
    WHEN title ILIKE '%forest%' OR title ILIKE '%nature%' THEN 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800'
    WHEN title ILIKE '%marathon%' THEN 'https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=800'
    WHEN title ILIKE '%team%' OR title ILIKE '%group%' THEN 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800'
    WHEN title ILIKE '%challenge%' OR title ILIKE '%goal%' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800'
    ELSE 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800' -- default walking
  END as suggested_image_url
FROM admin_challenges
WHERE image_url IS NULL OR image_url = ''
ORDER BY created_at DESC;
