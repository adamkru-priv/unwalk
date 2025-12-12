-- ============================================
-- UNWALK STAGE 1: Admin-Curated Challenges
-- Database Schema Migration
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: admin_challenges
-- Admin creates these challenges manually
-- ============================================
CREATE TABLE admin_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('travel', 'art', 'motivation', 'fun')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  goal_steps INTEGER NOT NULL CHECK (goal_steps > 0),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT, -- Optional smaller version for cards
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for filtering by category
CREATE INDEX idx_admin_challenges_category ON admin_challenges(category);

-- Index for active challenges (most queries will filter by this)
CREATE INDEX idx_admin_challenges_active ON admin_challenges(is_active);

-- Index for sorting
CREATE INDEX idx_admin_challenges_sort ON admin_challenges(sort_order, created_at);

-- ============================================
-- TABLE: user_challenges
-- Tracks user progress on challenges (guest mode)
-- ============================================
CREATE TABLE user_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT NOT NULL, -- localStorage UUID (no auth in Stage 1)
  admin_challenge_id UUID NOT NULL REFERENCES admin_challenges(id) ON DELETE CASCADE,
  current_steps INTEGER DEFAULT 0 CHECK (current_steps >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding user's challenges by device_id
CREATE INDEX idx_user_challenges_device ON user_challenges(device_id);

-- Index for finding active challenges
CREATE INDEX idx_user_challenges_status ON user_challenges(status);

-- Composite index for common query: device_id + status
CREATE INDEX idx_user_challenges_device_status ON user_challenges(device_id, status);

-- ============================================
-- TABLE: challenge_stats
-- Aggregate stats for each admin challenge
-- ============================================
CREATE TABLE challenge_stats (
  challenge_id UUID PRIMARY KEY REFERENCES admin_challenges(id) ON DELETE CASCADE,
  started_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  avg_completion_days DECIMAL(5,2),
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS: Auto-update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_admin_challenges_updated_at
  BEFORE UPDATE ON admin_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_challenges_updated_at
  BEFORE UPDATE ON user_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTIONS: Auto-update challenge_stats
-- ============================================
CREATE OR REPLACE FUNCTION update_challenge_stats()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update stats row
  INSERT INTO challenge_stats (challenge_id, started_count, completed_count, last_updated_at)
  VALUES (NEW.admin_challenge_id, 0, 0, NOW())
  ON CONFLICT (challenge_id) DO NOTHING;

  -- If challenge just started
  IF TG_OP = 'INSERT' THEN
    UPDATE challenge_stats
    SET started_count = started_count + 1,
        last_updated_at = NOW()
    WHERE challenge_id = NEW.admin_challenge_id;
  END IF;

  -- If challenge just completed
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'completed' THEN
    UPDATE challenge_stats
    SET completed_count = completed_count + 1,
        last_updated_at = NOW()
    WHERE challenge_id = NEW.admin_challenge_id;
    
    -- Recalculate average completion days
    UPDATE challenge_stats
    SET avg_completion_days = (
      SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 86400)
      FROM user_challenges
      WHERE admin_challenge_id = NEW.admin_challenge_id
        AND status = 'completed'
        AND completed_at IS NOT NULL
    )
    WHERE challenge_id = NEW.admin_challenge_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating stats
CREATE TRIGGER update_challenge_stats_trigger
  AFTER INSERT OR UPDATE ON user_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_stats();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Stage 1: Open read, restricted write
-- ============================================

-- Enable RLS
ALTER TABLE admin_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_stats ENABLE ROW LEVEL SECURITY;

-- admin_challenges: Anyone can read active challenges
CREATE POLICY "Anyone can view active admin challenges"
  ON admin_challenges FOR SELECT
  USING (is_active = true);

-- admin_challenges: Only service role can modify (admin only)
CREATE POLICY "Only service role can modify admin challenges"
  ON admin_challenges FOR ALL
  USING (auth.role() = 'service_role');

-- user_challenges: Users can read their own challenges
CREATE POLICY "Users can view their own challenges"
  ON user_challenges FOR SELECT
  USING (true); -- We'll filter by device_id in app code

-- user_challenges: Users can insert their own challenges
CREATE POLICY "Users can create their own challenges"
  ON user_challenges FOR INSERT
  WITH CHECK (true);

-- user_challenges: Users can update their own challenges
CREATE POLICY "Users can update their own challenges"
  ON user_challenges FOR UPDATE
  USING (true);

-- challenge_stats: Anyone can read stats
CREATE POLICY "Anyone can view challenge stats"
  ON challenge_stats FOR SELECT
  USING (true);

-- challenge_stats: Triggers can modify (SECURITY DEFINER handles this)
-- No blocking policy needed - SECURITY DEFINER in function allows trigger writes

-- ============================================
-- SEED DATA: 5 Example Admin Challenges
-- ============================================

INSERT INTO admin_challenges (title, description, category, difficulty, goal_steps, image_url, sort_order) VALUES
(
  'Reveal Mount Fuji',
  'Walk 15,000 steps to discover the majestic view of Mount Fuji at sunrise.',
  'travel',
  'medium',
  15000,
  'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1200', -- Mount Fuji
  1
),
(
  'Discover Starry Night',
  'Walk 10,000 steps to unveil Van Gogh''s masterpiece.',
  'art',
  'easy',
  10000,
  'https://images.unsplash.com/photo-1578926314433-e2789279f4aa?w=1200', -- Van Gogh style
  2
),
(
  'Unlock Your Power',
  'Walk 30,000 steps to reveal your true strength.',
  'motivation',
  'hard',
  30000,
  'https://images.unsplash.com/photo-1434596922112-19c563067271?w=1200', -- Mountain peak
  3
),
(
  'Mystery Cat',
  'Walk 5,000 steps to see what this cute cat is doing!',
  'fun',
  'easy',
  5000,
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1200', -- Cute cat
  4
),
(
  'Grand Canyon Sunrise',
  'Walk 20,000 steps to witness the breathtaking Grand Canyon.',
  'travel',
  'hard',
  20000,
  'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=1200', -- Grand Canyon
  5
);

-- ============================================
-- HELPFUL QUERIES (for admin)
-- ============================================

-- View all active challenges with stats
-- SELECT 
--   ac.title,
--   ac.category,
--   ac.difficulty,
--   ac.goal_steps,
--   cs.started_count,
--   cs.completed_count,
--   ROUND((cs.completed_count::decimal / NULLIF(cs.started_count, 0) * 100), 2) as completion_rate,
--   cs.avg_completion_days
-- FROM admin_challenges ac
-- LEFT JOIN challenge_stats cs ON ac.id = cs.challenge_id
-- WHERE ac.is_active = true
-- ORDER BY ac.sort_order;

-- View user progress on a specific challenge
-- SELECT 
--   uc.device_id,
--   uc.current_steps,
--   ac.goal_steps,
--   ROUND((uc.current_steps::decimal / ac.goal_steps * 100), 2) as progress_percent,
--   uc.status,
--   uc.started_at,
--   uc.completed_at
-- FROM user_challenges uc
-- JOIN admin_challenges ac ON uc.admin_challenge_id = ac.id
-- WHERE ac.title = 'Reveal Mount Fuji'
-- ORDER BY uc.started_at DESC;
