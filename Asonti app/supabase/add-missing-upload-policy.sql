-- Add Missing Upload Policy for Authenticated Users
-- This specifically allows users to upload to their own folder

-- The issue is that the current "Allow authenticated uploads" policy
-- might not have the correct WITH CHECK expression

-- First, let's check what the current policies actually say
SELECT 
    policyname,
    definition
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname LIKE '%upload%';

-- If the above shows the policy is missing proper checks, 
-- you'll need to UPDATE it in the Dashboard UI:

-- Click on "Allow authenticated uploads" policy and update it to:
-- 
-- USING expression (leave empty or put: true)
-- 
-- WITH CHECK expression should be:
-- bucket_id = 'future-self-photos' AND (storage.foldername(name))[1] = auth.uid()::text
--
-- This ensures users can only upload to their own folder (userId/filename.jpg)

-- Alternative: If you can't modify, try creating a new policy in the Dashboard:
-- Name: "Users upload to own folder"
-- Allowed operation: INSERT
-- Target roles: authenticated  
-- USING: true
-- WITH CHECK: bucket_id = 'future-self-photos' AND (storage.foldername(name))[1] = auth.uid()::text