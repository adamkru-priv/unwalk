-- ============================================
-- Update placeholder images with real Unsplash photos
-- ============================================

-- Easy challenges - nature/walking/park images
UPDATE admin_challenges
SET image_url = CASE 
    WHEN goal_steps <= 3000 THEN 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80' -- Forest path
    WHEN goal_steps <= 5000 THEN 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&q=80' -- Park walking
    WHEN goal_steps <= 7000 THEN 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80' -- Beach walk
    WHEN goal_steps <= 10000 THEN 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80' -- Mountain view
    ELSE 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80' -- Scenic trail
END
WHERE title = 'Easy Challenge' 
  AND image_url LIKE '%placeholder%'
  AND is_custom = false;

-- Advanced challenges - mountain/trail/adventure images
UPDATE admin_challenges
SET image_url = CASE 
    WHEN goal_steps <= 12000 THEN 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80' -- Mountain peak
    WHEN goal_steps <= 15000 THEN 'https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?w=800&q=80' -- Mountain trail
    WHEN goal_steps <= 20000 THEN 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&q=80' -- Canyon
    ELSE 'https://images.unsplash.com/photo-1454391304352-2bf4678b1a7a?w=800&q=80' -- Desert landscape
END
WHERE title = 'Advanced Challenge' 
  AND image_url LIKE '%placeholder%'
  AND is_custom = false;

-- Expert+ challenges - extreme landscapes/peaks
UPDATE admin_challenges
SET image_url = CASE 
    WHEN goal_steps <= 30000 THEN 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&q=80' -- Grand Canyon
    WHEN goal_steps <= 40000 THEN 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80' -- Snow peaks
    ELSE 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=800&q=80' -- Mountain summit
END
WHERE title = 'Expert+ Challenge' 
  AND image_url LIKE '%placeholder%'
  AND is_custom = false;

-- Update any remaining placeholder images with a default beautiful landscape
UPDATE admin_challenges
SET image_url = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80'
WHERE image_url LIKE '%placeholder%'
  AND is_custom = false;

-- Verify the update
SELECT 
    title,
    goal_steps,
    CASE 
        WHEN image_url IS NULL THEN 'NULL'
        WHEN image_url LIKE '%placeholder%' THEN 'Still has placeholder ❌'
        WHEN image_url LIKE '%unsplash%' THEN 'Updated to Unsplash ✅'
        ELSE 'Other URL'
    END as image_status,
    COUNT(*) as count
FROM admin_challenges
WHERE is_custom = false
GROUP BY title, goal_steps, image_status
ORDER BY title, goal_steps;

-- Summary
SELECT 
    CASE 
        WHEN image_url LIKE '%unsplash%' THEN '✅ Unsplash images'
        WHEN image_url LIKE '%placeholder%' THEN '❌ Still placeholder'
        WHEN image_url IS NULL THEN '⚠️ NULL'
        ELSE 'Other'
    END as status,
    COUNT(*) as count
FROM admin_challenges
WHERE is_custom = false
GROUP BY status
ORDER BY count DESC;
