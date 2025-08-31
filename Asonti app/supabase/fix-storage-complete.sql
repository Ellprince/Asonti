-- Complete Storage Fix for ASONTI AI
-- This will drop ALL existing policies and recreate them properly

-- ============================================================================
-- STEP 1: Drop ALL existing storage policies
-- ============================================================================
DO $$ 
BEGIN
    -- Drop all policies on storage.objects for the bucket
    DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view own photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public viewing" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated viewing" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
    DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
    DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
    DROP POLICY IF EXISTS "Users can manage own photos" ON storage.objects;
    
    -- Drop any other potential policies
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
    DROP POLICY IF EXISTS "Enable select for authenticated users only" ON storage.objects;
    DROP POLICY IF EXISTS "Enable update for users based on user_id" ON storage.objects;
    DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON storage.objects;
END $$;

-- ============================================================================
-- STEP 2: Ensure RLS is enabled
-- ============================================================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create new, simple policies
-- ============================================================================

-- Policy 1: Allow authenticated users to upload to the bucket
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'future-self-photos'
);

-- Policy 2: Allow everyone to view photos (since bucket is public)
CREATE POLICY "Anyone can view photos in bucket"
ON storage.objects FOR SELECT
TO public
USING (
    bucket_id = 'future-self-photos'
);

-- Policy 3: Allow users to update their own photos
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'future-self-photos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'future-self-photos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow users to delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'future-self-photos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STEP 4: Verify the setup
-- ============================================================================
-- Check if policies were created successfully
SELECT 
    'Storage policies created successfully!' as status,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname IN (
        'Authenticated users can upload photos',
        'Anyone can view photos in bucket',
        'Users can update their own photos',
        'Users can delete their own photos'
    );

-- Check bucket configuration
SELECT 
    id as bucket_name,
    public as is_public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'future-self-photos';