# Storage Setup Instructions for ASONTI Photo Aging

## Quick Fix for "row-level security policy" Error

Follow these steps in order to fix the storage upload error:

## Step 1: Create Storage Bucket

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"New bucket"** button
5. Configure the bucket:
   - **Name:** `future-self-photos`
   - **Public bucket:** ✅ YES (check this box - IMPORTANT!)
   - **File size limit:** 5MB (or 5242880 bytes)
   - **Allowed MIME types:** Add these:
     - `image/jpeg`
     - `image/png`
     - `image/webp`
6. Click **"Save"** or **"Create bucket"**

## Step 2: Set Up Storage Policies

1. In Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy and paste the ENTIRE contents of `fix-storage-policies.sql`
4. Click **"Run"** button (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

## Step 3: Verify Setup

1. Still in SQL Editor, run this verification query:

```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'future-self-photos';

-- Check policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage';
```

You should see:
- 1 bucket named 'future-self-photos'
- 5 policies for storage.objects

## Step 4: Test Upload

1. Go back to your ASONTI app
2. Try uploading a photo in the wizard
3. The upload should now work!

## Troubleshooting

### If you still get "row-level security" errors:

1. **Check Authentication**: Make sure you're logged in to the app
2. **Check Bucket Name**: Ensure it's exactly `future-self-photos`
3. **Check Public Setting**: The bucket MUST be public
4. **Try Simpler Policy**: Run this in SQL Editor:

```sql
-- Nuclear option - disable RLS temporarily
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Or create a super permissive policy
CREATE POLICY "Allow everything for testing"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'future-self-photos')
WITH CHECK (bucket_id = 'future-self-photos');
```

**IMPORTANT**: Only use the "nuclear option" for testing. Re-enable RLS with proper policies for production!

### To Re-enable Proper Security (for production):

```sql
-- Re-enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Then run fix-storage-policies.sql again
```

## Storage URL Pattern

Your uploaded photos will be accessible at:
```
https://[project-ref].supabase.co/storage/v1/object/public/future-self-photos/[user-id]/[filename]
```

## Need Help?

If you're still having issues:
1. Check Supabase Dashboard > Authentication > Users (make sure you're logged in)
2. Check Supabase Dashboard > Storage > Buckets (make sure bucket exists)
3. Check Supabase Dashboard > Database > Policies (check storage.objects policies)