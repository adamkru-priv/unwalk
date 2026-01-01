-- Pokaż wszystkie obrazki w challengach
UPDATE admin_challenges
SET 
    is_image_hidden = false,
    updated_at = now()
WHERE is_active = true;

-- Pokaż statystyki po zmianie
SELECT 
    CASE WHEN is_team_challenge THEN 'team' ELSE 'solo' END as type,
    difficulty,
    COUNT(*) as total,
    COUNT(CASE WHEN is_image_hidden = false THEN 1 END) as visible_images,
    COUNT(CASE WHEN is_image_hidden = true THEN 1 END) as hidden_images
FROM admin_challenges
WHERE is_active = true
GROUP BY is_team_challenge, difficulty
ORDER BY is_team_challenge, difficulty;

-- Pokaż przykładowe obrazki
SELECT 
    title,
    difficulty,
    CASE WHEN is_team_challenge THEN 'team' ELSE 'solo' END as type,
    image_url,
    is_image_hidden
FROM admin_challenges
WHERE is_active = true
ORDER BY is_team_challenge, difficulty, title
LIMIT 10;
