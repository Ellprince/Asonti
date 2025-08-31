# Plan 09: Production Deployment Setup (SIMPLIFIED)

**Date**: 2025-01-31  
**Issue**: Application needs to be deployed to production  
**Priority**: HIGH  
**Estimated Time**: 30-45 minutes  
**Dependencies**: Application should be running locally

## Problem Statement
The application runs locally but isn't deployed to production. Since Supabase handles all backend infrastructure (database, auth, storage), we only need to deploy:
1. The React frontend to Vercel
2. The OpenAI API proxy (currently Express server) as Vercel Edge Functions

## Current Architecture
```
Frontend (React + Vite) → Supabase (Backend)
                       ↘ Vercel Edge Functions (OpenAI proxy)
```

## Goals
- [x] Understand that Supabase IS the backend (no separate backend needed)
- [ ] Convert Express server endpoints to Vercel Edge Functions
- [ ] Deploy React app to Vercel
- [ ] Configure environment variables
- [ ] Update Supabase redirect URLs
- [ ] Test production deployment

## Implementation Steps

### Step 1: Convert Express Server to Vercel Edge Functions (10 min)

**Create `/api/chat.ts` in the root directory:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory, futureSelfProfile } = await request.json();
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = `You are the user's future self, 10 years from now. You've achieved their goals and overcome their challenges.
${futureSelfProfile ? `
ABOUT YOUR PAST SELF:
- Their hopes: ${futureSelfProfile.hope || 'To achieve their dreams'}
- Their fears: ${futureSelfProfile.fear || 'Not reaching their potential'}
- How they want to feel: ${futureSelfProfile.feelings || 'Fulfilled and at peace'}
` : ''}

You are wise, compassionate, and understanding. Speak with warmth and authenticity as someone who truly understands because you've been there. Never break character or mention you're an AI.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).slice(-10),
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return NextResponse.json({ 
      response: completion.choices[0].message.content 
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
```

**Create `/api/analyze-personality.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const wizardData = await request.json();
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Create a comprehensive prompt for personality analysis
    const prompt = `Analyze this person's responses and provide a personality profile...
    ${JSON.stringify(wizardData)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a psychological profiler...' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze personality' },
      { status: 500 }
    );
  }
}
```

### Step 2: Update `vercel.json` Configuration (5 min)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Step 3: Update Frontend API Calls (5 min)

**Update `src/services/aiChatService.ts`:**
```typescript
const API_URL = import.meta.env.VITE_API_URL || '';

async sendMessage(message: string) {
  // Remove localhost:3002, use relative URL for same-origin
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      conversationHistory: this.conversationHistory,
      futureSelfProfile: this.futureSelfProfile
    })
  });
  // ... rest of the code
}
```

### Step 4: Deploy to Vercel (10 min)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (from Asonti app directory)
cd "Asonti app"
vercel

# Follow prompts:
# - Link to existing project or create new
# - Confirm settings
# - Deploy
```

### Step 5: Configure Environment Variables in Vercel Dashboard (5 min)

Go to your Vercel project settings and add:

**Production Environment Variables:**
```
OPENAI_API_KEY = sk-...your-key...
VITE_SUPABASE_URL = https://epmopmfwauwcctnlrrbo.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbG...your-anon-key...
```

Note: VITE_ prefix is required for frontend variables in Vite apps.

### Step 6: Update Supabase Configuration (5 min)

1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Add to "Redirect URLs":
   ```
   https://your-app.vercel.app/**
   https://*.vercel.app/**
   http://localhost:3000/**
   http://localhost:3001/**
   ```
3. Set "Site URL" to:
   ```
   https://your-app.vercel.app
   ```

### Step 7: Deploy to Production (5 min)

```bash
# After testing preview deployment
vercel --prod
```

## File Structure After Changes
```
/Asonti app/
├── api/                    # Vercel Edge Functions
│   ├── chat.ts
│   └── analyze-personality.ts
├── src/                    # React app (unchanged)
├── vercel.json            # Deployment config
├── package.json           # Remove server scripts
└── server.js              # Can be deleted after migration
```

## Testing Checklist
- [ ] Edge Functions respond locally: `vercel dev`
- [ ] Authentication works (signup/login)
- [ ] Profile creation wizard completes
- [ ] Chat with future self works
- [ ] Photo upload to Supabase storage works
- [ ] Environment variables load correctly

## Common Issues & Solutions

**Issue**: API calls return 404
**Solution**: Ensure `/api` routes are properly configured in vercel.json

**Issue**: CORS errors
**Solution**: Edge Functions on same domain don't need CORS

**Issue**: Environment variables not working
**Solution**: Redeploy after adding env vars in Vercel dashboard

**Issue**: OpenAI API errors
**Solution**: Check OPENAI_API_KEY is set (no VITE_ prefix for server-side)

## Monitoring After Deploy
1. Check Vercel Functions tab for errors
2. Monitor Supabase Dashboard for API usage
3. Test all auth flows in production
4. Verify OpenAI API usage in OpenAI dashboard

## Rollback Plan
- Vercel keeps all deployments, use dashboard to rollback
- Keep local Express server as backup
- Can switch back to localhost:3002 in frontend if needed

## Success Criteria
- [ ] App accessible at production URL
- [ ] All features work (auth, profiles, chat)
- [ ] No console errors in production
- [ ] Edge Functions execute successfully
- [ ] Supabase integration working

## Why This Approach?
- **Simpler**: No separate backend to maintain
- **Cheaper**: Vercel Edge Functions are included in free tier
- **Faster**: Edge Functions run closer to users
- **Secure**: API keys never exposed to client
- **Integrated**: Everything deploys together

## Next Steps After Deployment
1. Set up custom domain
2. Enable Vercel Analytics
3. Set up error monitoring (Sentry)
4. Configure rate limiting on Edge Functions
5. Set up staging environment

**Created**: 2025-01-31  
**Author**: Development Team  
**Status**: Ready to implement