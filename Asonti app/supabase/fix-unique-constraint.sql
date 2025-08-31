-- Fix Duplicate Unique Constraint Issue
-- This removes the duplicate constraint and ensures proper profile management

-- 1. Drop the duplicate constraint (keep only one)
ALTER TABLE public.future_self_profiles 
DROP CONSTRAINT IF EXISTS unique_active_profile;

-- 2. Ensure any existing duplicate active profiles are cleaned up
-- First, deactivate all but the most recent active profile per user
UPDATE public.future_self_profiles p1
SET is_active = false
WHERE is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.future_self_profiles p2
    WHERE p2.user_id = p1.user_id
      AND p2.is_active = true
      AND p2.updated_at > p1.updated_at
  );

-- 3. Verify the fix
SELECT 
    'Constraint Check' as check_type,
    COUNT(*) as remaining_constraints
FROM pg_constraint
WHERE conrelid = 'public.future_self_profiles'::regclass
  AND conname IN ('one_active_profile_per_user', 'unique_active_profile');

-- 4. Check for any users with multiple active profiles (should be 0)
SELECT 
    'Multiple Active Profiles' as check_type,
    user_id,
    COUNT(*) as active_profile_count
FROM public.future_self_profiles
WHERE is_active = true
GROUP BY user_id
HAVING COUNT(*) > 1;