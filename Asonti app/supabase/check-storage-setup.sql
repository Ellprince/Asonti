-- Check Current Storage Setup
-- Run this to diagnose the storage issue

-- 1. Check if bucket exists and its settings
SELECT 
    'BUCKET CONFIGURATION' as check_type,
    id as bucket_name,
    public as is_public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id = 'future-self-photos';

-- 2. Check existing policies (to see what's already there)
SELECT 
    'EXISTING POLICIES' as check_type,
    policyname,
    cmd as operation,
    roles,
    permissive
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND (qual::text LIKE '%future-self-photos%' OR with_check::text LIKE '%future-self-photos%')
ORDER BY policyname;

-- 3. Check if RLS is enabled
SELECT 
    'RLS STATUS' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 4. Check your current user permissions
SELECT 
    'YOUR PERMISSIONS' as check_type,
    current_user,
    session_user,
    has_table_privilege('storage.objects', 'SELECT') as can_select,
    has_table_privilege('storage.objects', 'INSERT') as can_insert,
    has_table_privilege('storage.objects', 'UPDATE') as can_update,
    has_table_privilege('storage.objects', 'DELETE') as can_delete;