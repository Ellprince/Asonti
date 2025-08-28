-- Storage Setup for ASONTI AI
-- This file sets up the storage buckets and policies for photo uploads
-- Run this after the main schema.sql

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
-- Note: Buckets must be created via Supabase Dashboard or Management API
-- The SQL commands below are for reference and RLS policies only

-- The 'future-self-photos' bucket stores:
-- 1. Original uploaded photos
-- 2. Aged photos from Replicate API
-- 3. User avatars

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Allow users to upload files to their own folder
CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'future-self-photos' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Allow users to view their own photos
CREATE POLICY "Users can view own photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'future-self-photos' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Allow users to update their own photos (for replacements)
CREATE POLICY "Users can update own photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'future-self-photos' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
)
WITH CHECK (
  bucket_id = 'future-self-photos' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'future-self-photos' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- ============================================================================
-- STORAGE CONFIGURATION NOTES
-- ============================================================================

/*
To create the storage bucket via Supabase Dashboard:

1. Go to Storage section in Supabase Dashboard
2. Click "New Bucket"
3. Name: future-self-photos
4. Public: Yes (for CDN access)
5. File size limit: 5MB
6. Allowed MIME types: image/jpeg, image/png, image/webp

To create via Supabase Management API:

curl -X POST https://<project-ref>.supabase.co/storage/v1/bucket \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "future-self-photos",
    "name": "future-self-photos",
    "public": true,
    "file_size_limit": 5242880,
    "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"]
  }'

Storage URL pattern:
- Original: /future-self-photos/{user_id}/original_{timestamp}.{ext}
- Aged: /future-self-photos/{user_id}/aged_{timestamp}.{ext}
- Avatar: /future-self-photos/{user_id}/avatar_{timestamp}.{ext}
*/

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's photo URLs
CREATE OR REPLACE FUNCTION get_user_photos(user_uuid UUID)
RETURNS TABLE(
  photo_type TEXT,
  url TEXT,
  uploaded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN name LIKE '%/original_%' THEN 'original'
      WHEN name LIKE '%/aged_%' THEN 'aged'
      WHEN name LIKE '%/avatar_%' THEN 'avatar'
      ELSE 'other'
    END as photo_type,
    'https://' || current_setting('app.settings.project_ref') || '.supabase.co/storage/v1/object/public/future-self-photos/' || name as url,
    created_at as uploaded_at
  FROM storage.objects
  WHERE bucket_id = 'future-self-photos'
    AND (string_to_array(name, '/'))[1] = user_uuid::text
  ORDER BY created_at DESC;
END;
$$;

-- Function to clean up old photos (keep only latest 5 per type)
CREATE OR REPLACE FUNCTION cleanup_old_photos(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  photo_record RECORD;
  photo_count INTEGER;
BEGIN
  -- For each photo type, keep only the 5 most recent
  FOR photo_record IN 
    SELECT name, 
           ROW_NUMBER() OVER (
             PARTITION BY 
               CASE 
                 WHEN name LIKE '%/original_%' THEN 'original'
                 WHEN name LIKE '%/aged_%' THEN 'aged'
                 WHEN name LIKE '%/avatar_%' THEN 'avatar'
                 ELSE 'other'
               END
             ORDER BY created_at DESC
           ) as row_num
    FROM storage.objects
    WHERE bucket_id = 'future-self-photos'
      AND (string_to_array(name, '/'))[1] = user_uuid::text
  LOOP
    IF photo_record.row_num > 5 THEN
      -- Delete old photo
      DELETE FROM storage.objects 
      WHERE bucket_id = 'future-self-photos' 
        AND name = photo_record.name;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- CLEANUP TRIGGER
-- ============================================================================

-- Trigger to update future_self_profiles when aged photo is uploaded
CREATE OR REPLACE FUNCTION update_profile_on_aged_photo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  -- If an aged photo is uploaded, update the user's active profile
  IF NEW.name LIKE '%/aged_%' THEN
    UPDATE future_self_profiles
    SET 
      aged_photo_url = 'https://' || current_setting('app.settings.project_ref') || '.supabase.co/storage/v1/object/public/future-self-photos/' || NEW.name,
      updated_at = NOW()
    WHERE user_id = (string_to_array(NEW.name, '/'))[1]::UUID
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for aged photo updates
CREATE TRIGGER on_aged_photo_upload
AFTER INSERT ON storage.objects
FOR EACH ROW
WHEN (NEW.bucket_id = 'future-self-photos')
EXECUTE FUNCTION update_profile_on_aged_photo();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if bucket exists (run in Dashboard SQL Editor)
-- SELECT * FROM storage.buckets WHERE id = 'future-self-photos';

-- Check policies
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Test upload permission for current user
-- SELECT auth.uid(), 
--        storage.filename('future-self-photos/' || auth.uid()::text || '/test.jpg'),
--        storage.foldername('future-self-photos/' || auth.uid()::text || '/test.jpg');