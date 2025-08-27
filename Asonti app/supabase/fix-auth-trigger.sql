-- ============================================
-- FIX AUTH TRIGGER ISSUE
-- ============================================
-- Run this in Supabase SQL Editor to fix the user profile creation issue

-- First, drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a simpler, more reliable function for user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create user profile
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        created_at,
        updated_at,
        onboarding_completed,
        last_active
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NOW(),
        NOW(),
        FALSE,
        NOW()
    ) ON CONFLICT (id) DO NOTHING; -- Prevent duplicate key errors
    
    -- Create default user settings
    INSERT INTO public.user_settings (
        user_id,
        dark_mode,
        notifications_enabled,
        email_notifications,
        data_sharing,
        analytics_enabled,
        ai_model_preference,
        response_style,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        FALSE,
        TRUE,
        TRUE,
        FALSE,
        TRUE,
        'gpt-4',
        'balanced',
        NOW(),
        NOW()
    ) ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate key errors
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the signup
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ALTERNATIVE: Manual Profile Creation
-- ============================================
-- If the trigger still doesn't work, we'll create profiles manually from the app
-- This function can be called from the client after successful signup

CREATE OR REPLACE FUNCTION public.create_user_profile(
    user_email TEXT,
    user_name TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current user's ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Create user profile
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        created_at,
        updated_at,
        onboarding_completed,
        last_active
    ) VALUES (
        current_user_id,
        user_email,
        COALESCE(user_name, user_email),
        NOW(),
        NOW(),
        FALSE,
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        updated_at = NOW();
    
    -- Create default settings
    INSERT INTO public.user_settings (
        user_id,
        created_at,
        updated_at
    ) VALUES (
        current_user_id,
        NOW(),
        NOW()
    ) ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
-- Check if there are any users without profiles
SELECT 
    au.id,
    au.email,
    au.created_at,
    up.id as profile_id
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- ============================================
-- CLEANUP: Create missing profiles for existing users
-- ============================================
INSERT INTO public.user_profiles (id, email, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Create missing settings for existing users
INSERT INTO public.user_settings (user_id, created_at, updated_at)
SELECT 
    au.id,
    NOW(),
    NOW()
FROM auth.users au
LEFT JOIN public.user_settings us ON au.id = us.user_id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;