-- Check if the unique constraint exists and drop it if it's causing issues
ALTER TABLE future_self_profiles 
DROP CONSTRAINT IF EXISTS unique_active_profile;

-- Re-add the constraint to ensure only one active profile per user
-- But first, let's fix any existing duplicate active profiles
UPDATE future_self_profiles 
SET is_active = false 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id 
  FROM future_self_profiles 
  WHERE is_active = true 
  ORDER BY user_id, created_at DESC
);

-- Now add the constraint back (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_active_profile' 
    AND conrelid = 'future_self_profiles'::regclass
  ) THEN
    ALTER TABLE future_self_profiles 
    ADD CONSTRAINT unique_active_profile UNIQUE(user_id, is_active);
  END IF;
END $$;

-- Check and add any missing columns
DO $$ 
BEGIN
  -- Add completed_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'future_self_profiles' 
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE future_self_profiles 
    ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add aged_photo_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'future_self_profiles' 
    AND column_name = 'aged_photo_url'
  ) THEN
    ALTER TABLE future_self_profiles 
    ADD COLUMN aged_photo_url TEXT;
  END IF;

  -- Add version_number if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'future_self_profiles' 
    AND column_name = 'version_number'
  ) THEN
    ALTER TABLE future_self_profiles 
    ADD COLUMN version_number INTEGER DEFAULT 1;
  END IF;
END $$;

-- Make sure RLS is enabled
ALTER TABLE future_self_profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view own profiles" ON future_self_profiles;
DROP POLICY IF EXISTS "Users can create own profiles" ON future_self_profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON future_self_profiles;
DROP POLICY IF EXISTS "Users can delete own profiles" ON future_self_profiles;

-- Recreate policies
CREATE POLICY "Users can view own profiles" ON future_self_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profiles" ON future_self_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles" ON future_self_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles" ON future_self_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Test query to see if we can select from the table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'future_self_profiles'
ORDER BY ordinal_position;