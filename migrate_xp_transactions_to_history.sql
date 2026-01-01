-- ============================================
-- MIGRATION: xp_transactions → xp_history
-- ============================================
-- Problem: Funkcja add_xp_to_user zapisuje do xp_transactions,
--          ale aplikacja czyta z xp_history
-- Rozwiązanie: Migracja danych i aktualizacja funkcji

-- 1. Sprawdź strukturę obu tabel
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('xp_transactions', 'xp_history')
ORDER BY table_name, ordinal_position;

-- 2. Sprawdź ile danych jest w każdej tabeli
SELECT 'xp_transactions' as table_name, COUNT(*) as count FROM xp_transactions
UNION ALL
SELECT 'xp_history' as table_name, COUNT(*) as count FROM xp_history;

-- 3. Jeśli xp_history nie istnieje - stwórz ją
CREATE TABLE IF NOT EXISTS xp_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_history_user ON xp_history(user_id, created_at DESC);

-- 4. Migruj dane z xp_transactions do xp_history (jeśli są)
INSERT INTO xp_history (id, user_id, amount, source_type, source_id, description, created_at)
SELECT 
  id,
  user_id,
  xp_amount as amount,
  source_type,
  source_id::text,
  description,
  created_at
FROM xp_transactions
ON CONFLICT (id) DO NOTHING;

-- 5. Drop i recreate funkcji add_xp_to_user (zapisuje do xp_history)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname = 'add_xp_to_user'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

-- Recreate z xp_history zamiast xp_transactions
CREATE OR REPLACE FUNCTION add_xp_to_user(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_source_type TEXT,
  p_source_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  new_xp INTEGER,
  new_level INTEGER,
  leveled_up BOOLEAN
) AS $$
DECLARE
  v_current_xp INTEGER;
  v_current_level INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_xp_for_next_level INTEGER;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO v_current_xp, v_current_level
  FROM users
  WHERE id = p_user_id;

  -- Calculate new XP
  v_new_xp := v_current_xp + p_xp_amount;

  -- Calculate new level
  v_new_level := v_current_level;
  
  LOOP
    v_xp_for_next_level := FLOOR(100 * (POWER(1.5, v_new_level) - 1) / 0.5);
    EXIT WHEN v_new_xp < v_xp_for_next_level OR v_new_level >= 50;
    v_new_level := v_new_level + 1;
  END LOOP;

  -- Update user's XP and level
  UPDATE users
  SET 
    xp = v_new_xp,
    level = v_new_level,
    last_activity_date = NOW()
  WHERE id = p_user_id;

  -- ✅ ZAPISZ DO xp_history (nie xp_transactions!)
  INSERT INTO xp_history (user_id, amount, source_type, source_id, description)
  VALUES (p_user_id, p_xp_amount, p_source_type, p_source_id, p_description);

  -- Return result
  RETURN QUERY SELECT v_new_xp, v_new_level, (v_new_level > v_current_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Zaktualizuj RLS policies dla xp_history
ALTER TABLE xp_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own XP history" ON xp_history;
CREATE POLICY "Users can view their own XP history"
  ON xp_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage xp_history" ON xp_history;
CREATE POLICY "Service role can manage xp_history"
  ON xp_history FOR ALL
  USING (auth.role() = 'service_role');

-- 7. Weryfikacja końcowa
SELECT COUNT(*) as total_entries FROM xp_history;

SELECT 
  u.email,
  xh.amount,
  xh.source_type,
  xh.description,
  xh.created_at
FROM xp_history xh
JOIN users u ON xh.user_id = u.id
ORDER BY xh.created_at DESC
LIMIT 5;
