# Debug Edge Function

## Check Function Logs

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/epmopmfwauwcctnlrrbo)
2. Navigate to **Edge Functions**
3. Click on `chat-with-future-self`
4. Click on **Logs** tab
5. Look for any error messages

## Test the Function Directly

Run this in your browser console while logged into your app:

```javascript
// Get the current session
const { data: { session } } = await supabase.auth.getSession();

// Test the edge function directly
const response = await fetch('https://epmopmfwauwcctnlrrbo.supabase.co/functions/v1/chat-with-future-self', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwbW9wbWZ3YXV3Y2N0bmxycmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODY4NDAsImV4cCI6MjA3MTg2Mjg0MH0.mHF7irW0m5ZfeUO3KH1hB0Y_Vul8HjTJdKMJLVUDO3I'
  },
  body: JSON.stringify({
    message: 'Hello',
    conversationHistory: []
  })
});

const result = await response.text();
console.log('Response:', result);
```

This will show us the actual error from the Edge Function.