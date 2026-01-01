-- Sprawdź obrazki w challenges (solo)
SELECT 
    id,
    title,
    difficulty,
    image_url,
    CASE 
        WHEN image_url IS NULL THEN '❌ BRAK'
        WHEN image_url = '' THEN '❌ PUSTY'
        ELSE '✅ JEST'
    END as status
FROM challenges
ORDER BY difficulty, title;

-- Sprawdź obrazki w team_challenges
SELECT 
    id,
    title,
    difficulty,
    image_url,
    CASE 
        WHEN image_url IS NULL THEN '❌ BRAK'
        WHEN image_url = '' THEN '❌ PUSTY'
        ELSE '✅ JEST'
    END as status
FROM team_challenges
ORDER BY difficulty, title;

-- Statystyki
SELECT 
    'solo' as type,
    difficulty,
    COUNT(*) as total,
    COUNT(image_url) as with_url,
    COUNT(*) - COUNT(image_url) as missing
FROM challenges
GROUP BY difficulty

UNION ALL

SELECT 
    'team' as type,
    difficulty,
    COUNT(*) as total,
    COUNT(image_url) as with_url,
    COUNT(*) - COUNT(image_url) as missing
FROM team_challenges
GROUP BY difficulty
ORDER BY type, difficulty;
