# 🔧 Fix "Database Error Saving New User" Issue

## Quick Fix Steps (2 minutes)

### Step 1: Run the Fix Script
1. Go to your [Supabase SQL Editor](https://app.supabase.com/project/epmopmfwauwcctnlrrbo/sql/new)
2. Copy the entire contents of `fix-auth-trigger.sql`
3. Paste and click **Run**
4. You should see "Success" message

### Step 2: Verify Auth Settings
1. Go to [Authentication Settings](https://app.supabase.com/project/epmopmfwauwcctnlrrbo/auth/providers)
2. Make sure **Email** provider is enabled
3. Under Email settings, ensure:
   - ✅ Enable Email Signup is ON
   - ❌ Confirm email is OFF (for testing)
   - ❌ Secure email change is OFF (for testing)

### Step 3: Check URL Configuration  
1. Go to [URL Configuration](https://app.supabase.com/project/epmopmfwauwcctnlrrbo/auth/url-configuration)
2. Ensure Site URL is set to: `http://localhost:3000`

### Step 4: Test Registration Again
1. Refresh your app at http://localhost:3000
2. Try signing up with:
   - Name: Test User
   - Email: test@example.com
   - Password: test123456

## 🔍 Debugging Checklist

If it still doesn't work, check these in order:

### 1. Check Supabase Logs
Go to [Logs](https://app.supabase.com/project/epmopmfwauwcctnlrrbo/logs/explorer) and look for any errors

### 2. Verify Tables Exist
Run this query in SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- user_profiles
- user_settings
- future_self_profiles
- chat_conversations
- chat_messages

### 3. Check RLS Policies
Run this query:
```sql
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'user_profiles';
```

### 4. Test Direct Insert
Try this in SQL Editor:
```sql
-- Create a test user directly
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'manual-test@example.com',
    crypt('testpassword123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"full_name": "Manual Test User"}'::jsonb
);
```

If this fails, there's a database configuration issue.

## 💡 Alternative Solution

If the automatic trigger doesn't work, the app now has a fallback:
- The AuthContext will manually create the profile after signup
- Check the browser console for any warnings

## 🚨 Common Issues & Solutions

### Issue: "Database error saving new user"
**Cause**: Trigger failing to create user_profile
**Solution**: Run fix-auth-trigger.sql

### Issue: "User already registered"  
**Cause**: Email already exists in auth.users
**Solution**: Use a different email or delete the user in Supabase Dashboard

### Issue: No error but user not appearing
**Cause**: Email confirmation required
**Solution**: Disable email confirmation in Auth settings

### Issue: "Invalid login credentials"
**Cause**: User created but email not confirmed
**Solution**: Check email for confirmation link or disable confirmation

## ✅ Success Indicators

When working correctly, you should see:
1. No error message on signup
2. Automatic login after signup
3. User appears in [Auth Users](https://app.supabase.com/project/epmopmfwauwcctnlrrbo/auth/users)
4. Profile appears in [user_profiles table](https://app.supabase.com/project/epmopmfwauwcctnlrrbo/editor)

## Need More Help?

1. Check browser console (F12) for detailed errors
2. Check Supabase Logs for backend errors
3. Try creating a user directly in Supabase Dashboard to isolate the issue