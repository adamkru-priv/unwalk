-- Create table for sprint challenge scores
CREATE TABLE IF NOT EXISTS public.sprint_challenge_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  opponent_name TEXT NOT NULL,
  opponent_steps INTEGER NOT NULL,
  won BOOLEAN NOT NULL,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_sprint_challenge_scores_user_id ON public.sprint_challenge_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_sprint_challenge_scores_score ON public.sprint_challenge_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_sprint_challenge_scores_played_at ON public.sprint_challenge_scores(played_at DESC);

-- Enable RLS
ALTER TABLE public.sprint_challenge_scores ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all scores (for leaderboard)
CREATE POLICY "Anyone can view sprint challenge scores"
  ON public.sprint_challenge_scores
  FOR SELECT
  USING (true);

-- Policy: Users can insert their own scores
CREATE POLICY "Users can insert their own sprint challenge scores"
  ON public.sprint_challenge_scores
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own scores
CREATE POLICY "Users can view their own sprint challenge scores"
  ON public.sprint_challenge_scores
  FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.sprint_challenge_scores IS 'Stores scores from 30-second sprint challenge mini-game';
