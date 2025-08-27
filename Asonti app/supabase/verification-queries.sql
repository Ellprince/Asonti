-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these in Supabase SQL Editor to verify your setup

-- 1. Check all registered users
SELECT 
    u.id,
    u.email,
    u.created_at,
    p.full_name,
    p.onboarding_completed,
    s.dark_mode,
    s.ai_model_preference
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
LEFT JOIN user_settings s ON u.id = s.user_id
ORDER BY u.created_at DESC;

-- 2. Count totals
SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM user_profiles) as total_profiles,
    (SELECT COUNT(*) FROM user_settings) as total_settings,
    (SELECT COUNT(*) FROM future_self_profiles) as future_self_profiles,
    (SELECT COUNT(*) FROM chat_messages) as total_messages;

-- 3. Check for any users missing profiles (should be 0)
SELECT COUNT(*) as users_without_profiles
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 4. Check storage buckets
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets;