# Deploy Age Photo Edge Function

This guide will help you deploy the Edge Function that handles photo aging via Replicate API.

## Step 1: Deploy the Function

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/epmopmfwauwcctnlrrbo)
2. Navigate to **Edge Functions**
3. Click **"Deploy a new function"**
4. **Function name:** Enter exactly `age-photo`
5. **Delete all default code** and paste the entire contents from `supabase/functions/age-photo/index.ts`
6. Click **"Deploy"**

## Step 2: Add Secrets

After deployment, you need to add your Replicate API token:

1. Click on the `age-photo` function
2. Go to **Secrets** in the left sidebar
3. Click **"Add new secret"**
4. Add the following secret:
   - **Name:** `REPLICATE_API_TOKEN`
   - **Value:** Your Replicate API token (from .env.local: `VITE_REPLICATE_API_TOKEN`)
5. Click **"Save"**

## Step 3: Test the Function

To test if photo aging is working:

1. Go to your app at http://localhost:3001
2. Start creating a new Future Self profile
3. Upload a photo with a clear face
4. Continue through the wizard
5. Check the browser console for aging status logs
6. When you reach the completion step, if aging succeeded, you'll see "This is you, 2 years from now"

## How It Works

1. **Frontend uploads photo** to Supabase Storage
2. **Frontend calls Edge Function** with the photo URL
3. **Edge Function calls Replicate API** (no CORS issues!)
4. **Replicate processes the photo** (takes 10-30 seconds)
5. **Edge Function polls for results** and returns aged photo URL
6. **Frontend stores aged URL** for display in completion step

## Troubleshooting

### If aging fails:

1. **Check Edge Function logs:**
   - Go to Edge Functions → age-photo → Logs
   - Look for error messages

2. **Verify Replicate API token:**
   - Make sure the token is correctly set in Secrets
   - Test your token at [replicate.com/account](https://replicate.com/account/api-tokens)

3. **Check photo requirements:**
   - Photo must contain a clear face
   - File size should be under 10MB
   - Supported formats: JPG, PNG

### Common Issues:

- **"Replicate API token not configured"** - Add the REPLICATE_API_TOKEN secret
- **"Failed to start aging process"** - Check if Replicate API is down or token is invalid
- **Timeout after 30 seconds** - Large photos may take longer; the app will fallback gracefully

## Cost Considerations

- Each photo aging costs approximately **$0.008** (Replicate pricing)
- Free tier includes some credits
- Monitor usage at [replicate.com/account](https://replicate.com/account)

## Alternative: Keep Using Direct API (Not Recommended)

If you prefer not to deploy the Edge Function, the app will continue to work but:
- Photo aging will fail due to CORS
- The app will gracefully fallback to using the original photo
- Users won't see their aged photo

The Edge Function approach is recommended for production use.