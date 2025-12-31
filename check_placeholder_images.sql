-- ============================================
-- CHECK PLACEHOLDER/INVALID IMAGES IN CHALLENGES
-- ============================================

-- 1. Challenges z placeholderami (via.placeholder.com)
SELECT 
  '❌ PLACEHOLDERS' as issue,
  id,
  title,
  image_url,
  goal_steps,
  time_limit_hours,
  points,
  is_team_challenge,
  -- Sugestia URL na podstawie tytułu
  CASE 
    WHEN title ILIKE '%walk%' OR title ILIKE '%morning%' OR title ILIKE '%stretch%' THEN 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=800&q=80'
    WHEN title ILIKE '%sprint%' OR title ILIKE '%race%' OR title ILIKE '%advanced%' THEN 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80'
    WHEN title ILIKE '%mountain%' OR title ILIKE '%hike%' THEN 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80'
    WHEN title ILIKE '%city%' OR title ILIKE '%urban%' THEN 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800&q=80'
    WHEN title ILIKE '%beach%' OR title ILIKE '%coast%' THEN 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80'
    WHEN title ILIKE '%forest%' OR title ILIKE '%nature%' OR title ILIKE '%tree%' THEN 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80'
    WHEN title ILIKE '%marathon%' THEN 'https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=800&q=80'
    WHEN title ILIKE '%team%' OR title ILIKE '%group%' THEN 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80'
    WHEN title ILIKE '%butterfly%' OR title ILIKE '%garden%' THEN 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=800&q=80'
    WHEN title ILIKE '%space%' OR title ILIKE '%shuttle%' OR title ILIKE '%rocket%' THEN 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&q=80'
    WHEN title ILIKE '%sunset%' OR title ILIKE '%sunrise%' THEN 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80'
    WHEN title ILIKE '%desert%' THEN 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80'
    WHEN title ILIKE '%river%' OR title ILIKE '%water%' THEN 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80'
    WHEN title ILIKE '%park%' THEN 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80'
    ELSE 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80' -- default walking
  END as suggested_image_url
FROM admin_challenges
WHERE image_url LIKE '%placeholder%'
ORDER BY created_at DESC;

-- 2. Wszystkie challenges (do przeglądu)
SELECT 
  '📋 ALL CHALLENGES' as info,
  id,
  title,
  image_url,
  goal_steps,
  time_limit_hours,
  points,
  is_team_challenge,
  category,
  difficulty
FROM admin_challenges
ORDER BY created_at DESC;

-- 3. Podsumowanie
SELECT 
  '📊 SUMMARY' as info,
  COUNT(*) as total_challenges,
  COUNT(CASE WHEN image_url LIKE '%placeholder%' THEN 1 END) as placeholder_count,
  COUNT(CASE WHEN image_url IS NULL OR image_url = '' THEN 1 END) as no_image_count,
  COUNT(CASE WHEN image_url LIKE '%unsplash%' THEN 1 END) as unsplash_count
FROM admin_challenges;
