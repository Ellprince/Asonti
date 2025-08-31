-- Check Database Permissions and Table Structure
-- Run this to diagnose the database save error

-- 1. Check if future_self_profiles table exists
SELECT 
    'TABLE EXISTS' as check_type,
    table_name,
    table_schema
FROM information_schema.tables
WHERE table_name = 'future_self_profiles'
    AND table_schema = 'public';

-- 2. Check table columns
SELECT 
    'TABLE COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'future_self_profiles'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check RLS policies on future_self_profiles
SELECT 
    'RLS POLICIES' as check_type,
    policyname,
    cmd as operation,
    roles,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE tablename = 'future_self_profiles'
    AND schemaname = 'public'
ORDER BY policyname;

-- 4. Check if RLS is enabled on the table
SELECT 
    'RLS STATUS' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'future_self_profiles'
    AND schemaname = 'public';

-- 5. Check if there are any existing profiles (to see if inserts work at all)
SELECT 
    'PROFILE COUNT' as check_type,
    COUNT(*) as total_profiles,
    COUNT(DISTINCT user_id) as unique_users
FROM public.future_self_profiles;

-- 6. Check constraints on the table
SELECT 
    'CONSTRAINTS' as check_type,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.future_self_profiles'::regclass;