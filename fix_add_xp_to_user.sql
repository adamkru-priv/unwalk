-- 1️⃣ Usuń starą funkcję
DROP FUNCTION IF EXISTS add_xp_to_user(uuid, integer, text, text, text);

-- 2️⃣ Utwórz nową funkcję z poprawką UUID
CREATE OR REPLACE FUNCTION add_xp_to_user(
  p_user_id uuid,
  p_xp_amount integer,
  p_source_type text,
  p_source_id text,
  p_description text DEFAULT NULL
)
RETURNS TABLE(
  new_total_xp integer,
  new_level integer,
  leveled_up boolean
) AS $$
DECLARE
  v_current_xp integer;
  v_current_level integer;
  v_new_xp integer;
  v_new_level integer;
  v_leveled_up boolean := false;
BEGIN
  -- Get current stats
  SELECT xp, level INTO v_current_xp, v_current_level
  FROM users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Calculate new XP
  v_new_xp := v_current_xp + p_xp_amount;

  -- Calculate new level
  v_new_level := v_current_level;
  WHILE v_new_xp >= (100 * (POWER(1.5, v_new_level) - 1) / 0.5)::integer AND v_new_level < 50 LOOP
    v_new_level := v_new_level + 1;
    v_leveled_up := true;
  END LOOP;

  -- 🔴 FIX: Konwertuj text → uuid (lub NULL jeśli nie jest UUID)
  INSERT INTO xp_transactions (user_id, xp_amount, source_type, source_id, description)
  VALUES (
    p_user_id, 
    p_xp_amount, 
    p_source_type, 
    CASE 
      WHEN p_source_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN p_source_id::uuid 
      ELSE NULL 
    END,
    p_description
  );

  -- Update user stats
  UPDATE users
  SET xp = v_new_xp,
      level = v_new_level,
      updated_at = now()
  WHERE id = p_user_id;

  RETURN QUERY SELECT v_new_xp, v_new_level, v_leveled_up;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
