-- ============================================
-- TEST DATA FOR PROFILE HISTORY
-- ============================================
-- This script creates test profile history to verify the audit system
-- Run this AFTER running the migration (20250831_add_profile_history.sql)
--
-- IMPORTANT: This uses your actual profile, so make sure to restore
-- your original data after testing if needed
-- ============================================

-- Create test profile updates to generate history
DO $$
DECLARE
  test_profile_id UUID;
  test_user_id UUID;
  original_hope TEXT;
  original_fear TEXT;
  original_values TEXT[];
BEGIN
  -- Get the first active profile (use your actual profile)
  SELECT id, user_id, hope, fear, current_values 
  INTO test_profile_id, test_user_id, original_hope, original_fear, original_values
  FROM future_self_profiles
  WHERE is_active = true
  LIMIT 1;
  
  IF test_profile_id IS NOT NULL THEN
    RAISE NOTICE 'Testing with profile ID: %', test_profile_id;
    RAISE NOTICE 'Original hope: %', original_hope;
    
    -- Update 1: Change hope (simulated from 7 days ago)
    UPDATE future_self_profiles 
    SET hope = 'Test Update 1: Achieve perfect work-life balance and spend more time with family',
        version_number = COALESCE(version_number, 1) + 1,
        updated_at = NOW() - INTERVAL '7 days'
    WHERE id = test_profile_id;
    
    -- Manually update the history timestamp (since trigger uses NOW())
    UPDATE profile_history 
    SET changed_at = NOW() - INTERVAL '7 days'
    WHERE id = (
      SELECT id FROM profile_history 
      WHERE profile_id = test_profile_id 
      ORDER BY changed_at DESC 
      LIMIT 1
    );
    
    -- Update 2: Change fear (simulated from 5 days ago)
    UPDATE future_self_profiles 
    SET fear = 'Test Update 2: Missing out on important family moments while chasing career',
        version_number = version_number + 1,
        updated_at = NOW() - INTERVAL '5 days'
    WHERE id = test_profile_id;
    
    UPDATE profile_history 
    SET changed_at = NOW() - INTERVAL '5 days'
    WHERE id = (
      SELECT id FROM profile_history 
      WHERE profile_id = test_profile_id 
      ORDER BY changed_at DESC 
      LIMIT 1
    );
    
    -- Update 3: Change values (simulated from 3 days ago)
    UPDATE future_self_profiles 
    SET current_values = ARRAY['family', 'health', 'personal_growth', 'creativity'],
        future_values = ARRAY['wisdom', 'fulfillment', 'legacy', 'peace'],
        version_number = version_number + 1,
        updated_at = NOW() - INTERVAL '3 days'
    WHERE id = test_profile_id;
    
    UPDATE profile_history 
    SET changed_at = NOW() - INTERVAL '3 days'
    WHERE id = (
      SELECT id FROM profile_history 
      WHERE profile_id = test_profile_id 
      ORDER BY changed_at DESC 
      LIMIT 1
    );
    
    -- Update 4: Change feelings (simulated from 1 day ago)
    UPDATE future_self_profiles 
    SET feelings = 'Test Update 4: Confident, peaceful, and deeply fulfilled with life choices',
        version_number = version_number + 1,
        updated_at = NOW() - INTERVAL '1 day'
    WHERE id = test_profile_id;
    
    UPDATE profile_history 
    SET changed_at = NOW() - INTERVAL '1 day'
    WHERE id = (
      SELECT id FROM profile_history 
      WHERE profile_id = test_profile_id 
      ORDER BY changed_at DESC 
      LIMIT 1
    );
    
    -- Update 5: Restore original values (current time)
    UPDATE future_self_profiles 
    SET hope = COALESCE(original_hope, 'Original hope restored'),
        fear = COALESCE(original_fear, 'Original fear restored'),
        current_values = original_values,
        version_number = version_number + 1,
        updated_at = NOW()
    WHERE id = test_profile_id;
    
    RAISE NOTICE 'Test history created with 5 updates for profile %', test_profile_id;
    RAISE NOTICE 'Profile has been restored to original values';
  ELSE
    RAISE NOTICE 'No active profile found. Please create a profile first.';
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- 1. Check history was created
SELECT 
  version_number,
  operation,
  to_char(changed_at, 'YYYY-MM-DD HH24:MI') as change_time,
  CASE 
    WHEN old_data IS NULL THEN 'Initial creation'
    WHEN old_data->>'hope' != new_data->>'hope' THEN 'Hope changed'
    WHEN old_data->>'fear' != new_data->>'fear' THEN 'Fear changed'
    WHEN old_data->>'current_values' != new_data->>'current_values' THEN 'Values changed'
    WHEN old_data->>'feelings' != new_data->>'feelings' THEN 'Feelings changed'
    ELSE 'Other changes'
  END as change_type,
  new_data->>'hope' as new_hope
FROM profile_history
ORDER BY version_number DESC
LIMIT 10;

-- 2. Count total history records
SELECT 
  COUNT(*) as total_history_records,
  COUNT(DISTINCT profile_id) as profiles_with_history,
  MAX(version_number) as highest_version
FROM profile_history;

-- 3. Check if trigger is working
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_orientation
FROM information_schema.triggers
WHERE trigger_name = 'profile_audit_trigger';

-- 4. View recent changes summary
SELECT 
  p.id,
  p.version_number as current_version,
  COUNT(h.id) as total_changes,
  MAX(h.changed_at) as last_change
FROM future_self_profiles p
LEFT JOIN profile_history h ON p.id = h.profile_id
WHERE p.is_active = true
GROUP BY p.id, p.version_number;

-- ============================================
-- CLEANUP (Optional)
-- ============================================
-- To remove test history (keeps current profile):
-- DELETE FROM profile_history WHERE profile_id IN (
--   SELECT id FROM future_self_profiles WHERE is_active = true
-- );
-- UPDATE future_self_profiles SET version_number = 1 WHERE is_active = true;