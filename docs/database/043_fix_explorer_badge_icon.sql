-- ============================================
-- MOVEE: Fix Explorer Badge Icon
-- Migration 043
-- ============================================

-- Update Explorer badge icon to be more consistent with other badges
-- Change from 🌍 (realistic earth) to 🗺️ (flat map icon)
UPDATE achievement_definitions
SET icon = '🗺️'
WHERE id = 'explorer';

-- Comments
COMMENT ON TABLE achievement_definitions IS 'Explorer badge icon updated to 🗺️ for visual consistency';
