-- Fix display_name for existing authenticated users who still have "Guest_xxx" names
-- This updates all non-guest users who have display_name starting with "Guest_"

UPDATE public.users
SET 
  display_name = email,
  updated_at = NOW()
WHERE 
  is_guest = false 
  AND email IS NOT NULL
  AND (display_name IS NULL OR display_name LIKE 'Guest_%');

-- Show results
SELECT 
  id,
  email,
  display_name,
  is_guest
FROM public.users
WHERE is_guest = false
ORDER BY created_at DESC;
