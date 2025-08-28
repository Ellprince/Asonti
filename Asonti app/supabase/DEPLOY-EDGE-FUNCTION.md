# Deploy OpenAI Chat Edge Function

This guide will help you deploy the Edge Function that powers the AI chat with your future self.

## Prerequisites

1. **Supabase CLI** - Install if you haven't already:
```bash
brew install supabase/tap/supabase
```

2. **OpenAI API Key** - Get one from [platform.openai.com](https://platform.openai.com/api-keys)

## Step 1: Link Your Project

```bash
cd "Asonti app"
supabase link --project-ref epmopmfwauwcctnlrrbo
```

When prompted, enter your database password.

## Step 2: Set Environment Variables

Set your OpenAI API key as a secret in your Supabase project:

```bash
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key-here
```

Replace `sk-your-openai-api-key-here` with your actual OpenAI API key.

## Step 3: Deploy the Edge Function

Deploy the chat function:

```bash
supabase functions deploy chat-with-future-self
```

## Step 4: Verify Deployment

Check that the function was deployed successfully:

```bash
supabase functions list
```

You should see `chat-with-future-self` in the list.

## Step 5: Test the Function

You can test the function directly in your app:
1. Complete your future self profile
2. Go to the chat screen
3. Send a message - it should now respond with real AI responses!

## Troubleshooting

### If the function doesn't deploy:

1. Make sure you're in the correct directory (`Asonti app`)
2. Ensure your Supabase CLI is up to date: `supabase update`
3. Check that the function file exists: `supabase/functions/chat-with-future-self/index.ts`

### If you get "Edge Function not found" errors:

1. Wait 1-2 minutes after deployment for the function to propagate
2. Check the function logs: `supabase functions logs chat-with-future-self`

### If you get authentication errors:

1. Make sure you're logged in when testing
2. Check that your session token is valid

### To view function logs:

```bash
supabase functions logs chat-with-future-self --tail
```

## Cost Considerations

- **OpenAI Costs**: 
  - GPT-4o-mini: ~$0.15 per 1M input tokens, $0.60 per 1M output tokens
  - Approximately $0.001-0.002 per conversation message
  
- **Supabase Edge Functions**:
  - Free tier: 500K invocations/month
  - Each chat message = 1 invocation

## Security Notes

- The OpenAI API key is stored securely as a Supabase secret
- It's never exposed to the client/browser
- All API calls go through the Edge Function
- User authentication is required for all chat requests

## Alternative: Manual Deployment via Dashboard

If you prefer not to use the CLI:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Edge Functions**
3. Click **"New Function"**
4. Name: `chat-with-future-self`
5. Copy the contents of `supabase/functions/chat-with-future-self/index.ts`
6. Paste into the editor
7. Click **"Deploy"**
8. Go to **Settings** → **Secrets**
9. Add secret: `OPENAI_API_KEY` with your OpenAI API key
10. Save changes

Your AI chat should now be working! 🎉