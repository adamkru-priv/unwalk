-- Check how many challenges have placeholder images

SELECT 
    CASE 
        WHEN image_url LIKE '%placeholder%' THEN 'Placeholder URL'
        WHEN image_url LIKE 'http%' THEN 'Real URL'
        WHEN image_url IS NULL THEN 'NULL'
        ELSE 'Other'
    END as url_type,
    COUNT(*) as count,
    -- Show examples
    STRING_AGG(DISTINCT SUBSTRING(image_url, 1, 100), ', ' ORDER BY SUBSTRING(image_url, 1, 100)) as examples
FROM admin_challenges
GROUP BY url_type
ORDER BY count DESC;

-- List all placeholder URLs
SELECT id, title, image_url, is_custom
FROM admin_challenges
WHERE image_url LIKE '%placeholder%'
LIMIT 50;
