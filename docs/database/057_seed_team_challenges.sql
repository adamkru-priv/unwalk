-- ============================================
-- Add 5 Team Challenges to admin_challenges
-- ============================================

INSERT INTO admin_challenges (
  title,
  description,
  category,
  difficulty,
  goal_steps,
  image_url,
  thumbnail_url,
  is_team_challenge,
  time_limit_hours,
  points,
  sort_order,
  is_active
) VALUES
-- 1. Weekend Warriors
(
  'Weekend Warriors',
  'Team up and conquer 100,000 steps together this weekend! Perfect for getting the whole crew moving.',
  'sport',
  'medium',
  100000,
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400',
  true,
  48,
  300,
  1000,
  true
),
-- 2. Marathon Teammates
(
  'Marathon Teammates',
  'Complete a marathon distance as a team within 7 days. Every step counts towards victory!',
  'sport',
  'hard',
  50000,
  'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800',
  'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=400',
  true,
  168,
  500,
  1001,
  true
),
-- 3. City Explorers Squad
(
  'City Explorers Squad',
  'Discover your city together! Team challenge to walk 150,000 steps exploring new neighborhoods.',
  'nature',
  'hard',
  150000,
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800',
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400',
  true,
  120,
  600,
  1002,
  true
),
-- 4. Quick Sprint Team
(
  'Quick Sprint Team',
  'Fast-paced team challenge! Can your team reach 50,000 steps in just 24 hours?',
  'sport',
  'easy',
  50000,
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400',
  true,
  24,
  200,
  1003,
  true
),
-- 5. Nature Walk Collective
(
  'Nature Walk Collective',
  'Explore parks, trails, and green spaces together. Team up for 80,000 steps of outdoor adventure!',
  'nature',
  'medium',
  80000,
  'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800',
  'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=400',
  true,
  72,
  350,
  1004,
  true
);

-- Update challenge_stats for new challenges
INSERT INTO challenge_stats (challenge_id, started_count, completed_count, last_updated_at)
SELECT id, 0, 0, NOW()
FROM admin_challenges
WHERE is_team_challenge = true
ON CONFLICT (challenge_id) DO NOTHING;

-- Verify insertion
SELECT 
  title,
  goal_steps,
  time_limit_hours,
  points,
  is_team_challenge
FROM admin_challenges
WHERE is_team_challenge = true
ORDER BY sort_order;
