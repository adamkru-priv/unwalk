-- ============================================
-- MOVEE: Fix Explorer Badge Emoji
-- Migration 044
-- ============================================

-- Update Explorer badge icon to use compass emoji (better cross-platform support)
UPDATE achievement_definitions
SET icon = '🧭'
WHERE id = 'explorer';

-- Comments
COMMENT ON TABLE achievement_definitions IS 'Explorer badge icon updated to �� (compass) for better rendering';
