-- Fix Storage Policies for ASONTI AI
-- Run this in Supabase SQL Editor to fix storage upload issues

-- ============================================================================
-- STEP 1: Create the storage bucket (if not exists)
-- ============================================================================
-- NOTE: You need to create the bucket first in Supabase Dashboard:
-- 1. Go to Storage section
-- 2. Click "New Bucket"
-- 3. Name: future-self-photos
-- 4. Public bucket: YES (check this box)
-- 5. Click "Create bucket"

-- ============================================================================
-- STEP 2: Drop existing policies (if any)
-- ============================================================================
DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing" ON storage.objects;

-- ============================================================================
-- STEP 3: Create simple, permissive policies for testing
-- ============================================================================

-- Allow all authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'future-self-photos'
);

-- Allow all authenticated users to view all photos
CREATE POLICY "Allow authenticated viewing"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'future-self-photos'
);

-- Allow all authenticated users to update their own photos
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'future-self-photos' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
)
WITH CHECK (
  bucket_id = 'future-self-photos' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Allow all authenticated users to delete their own photos
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'future-self-photos' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Allow public viewing (since bucket is public)
CREATE POLICY "Allow public viewing"
ON storage.objects FOR SELECT
TO anon
USING (
  bucket_id = 'future-self-photos'
);

-- ============================================================================
-- STEP 4: Verify the policies
-- ============================================================================
-- Run this query to check if policies are created:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY policyname;