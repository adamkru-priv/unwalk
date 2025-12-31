-- ============================================
-- FIX ALL PLACEHOLDER IMAGES WITH UNSPLASH
-- ============================================
-- To naprawia wszystkie 52 challenges z via.placeholder.com
-- Używa darmowych zdjęć z Unsplash dopasowanych do tematyki

-- UPDATE wszystkich placeholderów na raz z inteligentnym dopasowaniem
UPDATE admin_challenges
SET 
  image_url = CASE 
    -- Walking & Morning
    WHEN title ILIKE '%walk%' OR title ILIKE '%morning%' OR title ILIKE '%stretch%' OR title ILIKE '%stroll%'
      THEN 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=800&q=80'
    
    -- Sprint & Racing
    WHEN title ILIKE '%sprint%' OR title ILIKE '%race%' OR title ILIKE '%advanced%' OR title ILIKE '%fast%'
      THEN 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80'
    
    -- Mountain & Hiking
    WHEN title ILIKE '%mountain%' OR title ILIKE '%hike%' OR title ILIKE '%peak%' OR title ILIKE '%climb%'
      THEN 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80'
    
    -- City & Urban
    WHEN title ILIKE '%city%' OR title ILIKE '%urban%' OR title ILIKE '%street%' OR title ILIKE '%downtown%'
      THEN 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800&q=80'
    
    -- Beach & Coast
    WHEN title ILIKE '%beach%' OR title ILIKE '%coast%' OR title ILIKE '%ocean%' OR title ILIKE '%sand%'
      THEN 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80'
    
    -- Forest & Nature
    WHEN title ILIKE '%forest%' OR title ILIKE '%nature%' OR title ILIKE '%tree%' OR title ILIKE '%woods%'
      THEN 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80'
    
    -- Marathon
    WHEN title ILIKE '%marathon%' OR title ILIKE '%long distance%'
      THEN 'https://images.unsplash.com/photo-1532444458054-01a7dd3e9fca?w=800&q=80'
    
    -- Team & Group
    WHEN title ILIKE '%team%' OR title ILIKE '%group%' OR title ILIKE '%together%'
      THEN 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80'
    
    -- Butterfly & Garden
    WHEN title ILIKE '%butterfly%' OR title ILIKE '%garden%' OR title ILIKE '%flower%'
      THEN 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=800&q=80'
    
    -- Space & Rocket
    WHEN title ILIKE '%space%' OR title ILIKE '%shuttle%' OR title ILIKE '%rocket%' OR title ILIKE '%cosmos%'
      THEN 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&q=80'
    
    -- Sunset & Sunrise
    WHEN title ILIKE '%sunset%' OR title ILIKE '%sunrise%' OR title ILIKE '%dawn%' OR title ILIKE '%dusk%'
      THEN 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80'
    
    -- Desert
    WHEN title ILIKE '%desert%' OR title ILIKE '%sand dune%'
      THEN 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80'
    
    -- River & Water
    WHEN title ILIKE '%river%' OR title ILIKE '%water%' OR title ILIKE '%lake%' OR title ILIKE '%stream%'
      THEN 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80'
    
    -- Park
    WHEN title ILIKE '%park%'
      THEN 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80'
    
    -- Bridge
    WHEN title ILIKE '%bridge%'
      THEN 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80'
    
    -- Night
    WHEN title ILIKE '%night%' OR title ILIKE '%evening%'
      THEN 'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800&q=80'
    
    -- Snow & Winter
    WHEN title ILIKE '%snow%' OR title ILIKE '%winter%' OR title ILIKE '%ice%'
      THEN 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800&q=80'
    
    -- Trail
    WHEN title ILIKE '%trail%' OR title ILIKE '%path%'
      THEN 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80'
    
    -- Stadium & Arena
    WHEN title ILIKE '%stadium%' OR title ILIKE '%arena%'
      THEN 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80'
    
    -- DEFAULT - general walking/fitness
    ELSE 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80'
  END,
  updated_at = NOW()
WHERE image_url LIKE '%placeholder%';

-- Pokaż co zostało naprawione
SELECT 
  '✅ NAPRAWIONE' as status,
  id,
  title,
  image_url as new_image_url,
  goal_steps,
  points
FROM admin_challenges
WHERE updated_at > NOW() - INTERVAL '10 seconds'
ORDER BY title;

-- Podsumowanie po naprawie
SELECT 
  '📊 AFTER FIX' as info,
  COUNT(*) as total_challenges,
  COUNT(CASE WHEN image_url LIKE '%placeholder%' THEN 1 END) as remaining_placeholders,
  COUNT(CASE WHEN image_url LIKE '%unsplash%' THEN 1 END) as unsplash_images
FROM admin_challenges;
