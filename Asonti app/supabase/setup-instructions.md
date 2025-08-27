# Supabase Database Setup Instructions

## 📋 Quick Setup (5 minutes)

### Step 1: Run the SQL Schema
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `epmopmfwauwcctnlrrbo`
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `schema.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

✅ You should see "Success. No rows returned" - this is normal!

### Step 2: Create Storage Buckets
1. Go to **Storage** in the left sidebar
2. Click **New Bucket**
3. Create two buckets:

#### Bucket 1: Avatars
- **Name**: `avatars`
- **Public**: ✅ Yes (toggle on)
- **File size limit**: 5MB
- **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`

#### Bucket 2: Future Self Photos
- **Name**: `future-self-photos`
- **Public**: ✅ Yes (toggle on)
- **File size limit**: 10MB
- **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp`

### Step 3: Configure Authentication
1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Configure email settings:
   - **Confirm email**: Off (for MVP)
   - **Secure email change**: Off (for MVP)
   - **Secure password change**: Off (for MVP)

4. (Optional) Enable OAuth providers:
   - **Google**: Add your OAuth credentials
   - **Apple**: Add your OAuth credentials

### Step 4: Set Authentication URLs
1. Go to **Authentication** → **URL Configuration**
2. Add your URLs:
   - **Site URL**: `http://localhost:3000` (development)
   - **Redirect URLs**: 
     - `http://localhost:3000`
     - `https://your-app.vercel.app` (when deployed)

## ✅ Verification Checklist

Run these queries in SQL Editor to verify:

### Check Tables Created
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```
You should see:
- chat_conversations
- chat_messages
- future_self_profiles
- user_profiles
- user_settings

### Check RLS Policies
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```
You should see multiple policies per table.

### Check Storage Buckets
Go to Storage section - you should see:
- avatars bucket
- future-self-photos bucket

## 🔥 Database Schema Overview

### Tables Created:
1. **user_profiles** - Extended user information
2. **future_self_profiles** - Wizard data and future self attributes
3. **chat_conversations** - Groups messages into conversations
4. **chat_messages** - Individual chat messages
5. **user_settings** - User preferences

### Security Features:
- ✅ Row Level Security (RLS) enabled
- ✅ Users can only access their own data
- ✅ Automatic profile creation on signup
- ✅ Updated timestamps on all tables
- ✅ Soft delete for messages

### Special Features:
- 🎯 One active future self profile per user
- 📊 Automatic conversation stats (message count, last message)
- 🔄 Triggers for automatic updates
- 🚀 pgvector extension ready for AI embeddings

## 🚨 Troubleshooting

### If you get permission errors:
- Make sure you're logged into the correct Supabase project
- Check that RLS is enabled on all tables

### If triggers don't work:
- The user profile creation trigger requires the auth schema
- Run the schema.sql file again

### If storage upload fails:
- Check bucket permissions are set to public
- Verify MIME types are configured correctly

## 📝 Next Steps

After database setup:
1. Install Supabase client: `npm install @supabase/supabase-js`
2. Set up authentication in React
3. Migrate from localStorage to Supabase
4. Add AI chat integration

## 🔗 Useful Links

- [Supabase Docs](https://supabase.com/docs)
- [SQL Editor](https://app.supabase.com/project/epmopmfwauwcctnlrrbo/editor)
- [Table Editor](https://app.supabase.com/project/epmopmfwauwcctnlrrbo/editor)
- [Authentication Settings](https://app.supabase.com/project/epmopmfwauwcctnlrrbo/auth/providers)