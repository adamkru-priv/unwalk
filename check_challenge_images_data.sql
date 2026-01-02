-- Check if completed challenges have image_url populated

-- 1. Check admin_challenges table - do they have image_url?
SELECT 
    id,
    title,
    image_url,
    CASE 
        WHEN image_url IS NULL THEN '❌ NULL'
        WHEN image_url = '' THEN '❌ EMPTY'
        WHEN image_url LIKE 'http%' THEN '✅ Has URL'
        ELSE '⚠️ Invalid format'
    END as image_status,
    is_custom,
    is_active
FROM admin_challenges
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check user_challenges with their admin_challenge data
SELECT 
    uc.id as user_challenge_id,
    uc.status,
    uc.completed_at,
    uc.claimed_at,
    ac.title as challenge_title,
    ac.image_url,
    CASE 
        WHEN ac.image_url IS NULL THEN '❌ NULL'
        WHEN ac.image_url = '' THEN '❌ EMPTY'
        WHEN ac.image_url LIKE 'http%' THEN '✅ Has URL'
        ELSE '⚠️ Invalid'
    END as image_status
FROM user_challenges uc
LEFT JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
WHERE uc.status IN ('completed', 'claimed')
ORDER BY uc.completed_at DESC NULLS LAST
LIMIT 20;

-- 3. Count challenges by image status
SELECT 
    CASE 
        WHEN image_url IS NULL THEN 'NULL'
        WHEN image_url = '' THEN 'EMPTY STRING'
        WHEN image_url LIKE 'http%' THEN 'Has URL'
        ELSE 'Invalid Format'
    END as status,
    COUNT(*) as count
FROM admin_challenges
GROUP BY status
ORDER BY count DESC;
