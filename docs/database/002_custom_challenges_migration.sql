-- Migration: Add Custom Challenge Support
-- Add new columns to admin_challenges table for custom challenges

ALTER TABLE admin_challenges
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by_device_id TEXT,
ADD COLUMN IF NOT EXISTS is_image_hidden BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE;

-- Add new columns to user_challenges table for assignment tracking
ALTER TABLE user_challenges
ADD COLUMN IF NOT EXISTS assigned_by TEXT,
ADD COLUMN IF NOT EXISTS is_group_challenge BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS group_members TEXT[];

-- Create storage bucket for custom challenge images
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-challenges', 'custom-challenges', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies to allow uploads (with unique names to avoid conflicts)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow custom challenge uploads'
  ) THEN
    CREATE POLICY "Allow custom challenge uploads"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'custom-challenges');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow custom challenge access'
  ) THEN
    CREATE POLICY "Allow custom challenge access"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'custom-challenges');
  END IF;
END $$;

-- Create index for better performance on custom challenges queries
CREATE INDEX IF NOT EXISTS idx_admin_challenges_custom 
ON admin_challenges(is_custom, created_by_device_id) 
WHERE is_custom = true;

CREATE INDEX IF NOT EXISTS idx_user_challenges_group 
ON user_challenges(is_group_challenge, assigned_by) 
WHERE is_group_challenge = true;
