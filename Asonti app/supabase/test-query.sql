-- Test 1: Check if you have any profiles
SELECT 
  id,
  user_id,
  is_active,
  completed_at,
  created_at
FROM future_self_profiles
WHERE user_id = auth.uid();

-- Test 2: Try to create a test profile
INSERT INTO future_self_profiles (
  user_id,
  is_active,
  attributes,
  current_values,
  future_values
) VALUES (
  auth.uid(),
  true,
  '{}'::jsonb,
  ARRAY[]::text[],
  ARRAY[]::text[]
)
ON CONFLICT (user_id, is_active) 
WHERE is_active = true
DO UPDATE SET updated_at = NOW()
RETURNING id, user_id, is_active;

-- Test 3: Check the profile was created
SELECT * FROM future_self_profiles 
WHERE user_id = auth.uid() 
AND is_active = true;