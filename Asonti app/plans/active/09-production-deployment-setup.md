# Plan 09: Production Deployment Setup

**Date**: 2025-01-29  
**Issue**: Application lacks production deployment infrastructure  
**Priority**: HIGH  
**Estimated Time**: 3-4 hours  
**Dependencies**: Plans 07 & 08 must be complete

## Problem Statement
The application currently runs only locally with a basic Express server. There's no production backend infrastructure, environment variable management, or deployment pipeline. The OpenAI API key is hardcoded in the server, and there's no proper error handling, rate limiting, or monitoring for production use.

## Research & Documentation
**Sources Consulted**:
- [x] Vercel Vite deployment docs (2025)
- [x] Railway Node.js deployment guide (2025)
- [x] Environment variables best practices for Vite
- [x] Express.js production security guidelines
- [x] CI/CD with GitHub Actions for Supabase

**Key Findings**:
- Vite requires VITE_ prefix for client-side env vars
- Railway auto-detects Node.js apps from package.json
- Environment variables must be redeployed on Vercel after changes
- Railway supports automatic restarts on env var updates
- Use encrypted .env.vault for production secrets
- Railway provides zero-config deployment with auto-scaling

## Goals
- [ ] Restructure backend for production deployment
- [ ] Set up secure environment variable management
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Configure CI/CD pipeline
- [ ] Add monitoring and error tracking
- [ ] Implement health checks and rate limiting

## Technical Analysis

### Current Structure Issues
```
/Asonti app/
├── server.js (mixed with frontend)
├── src/ (frontend)
└── package.json (combined dependencies)
```

### Target Production Architecture
```
/Asonti/
├── frontend/ (Vercel)
│   ├── src/
│   ├── package.json
│   └── .env.production
└── backend/ (Railway)
    ├── src/
    │   ├── routes/
    │   ├── middleware/
    │   └── index.js
    ├── package.json
    └── railway.json
```

## Implementation Steps

### Step 1: Restructure Backend (45 min)

**Create separate backend project:**
```bash
# Create backend directory
mkdir backend
cd backend

# Initialize package.json
npm init -y

# Install production dependencies
npm install express cors dotenv helmet morgan compression
npm install openai @supabase/supabase-js
npm install express-rate-limit express-validator

# Install dev dependencies
npm install -D nodemon typescript @types/node @types/express
```

**Create backend/src/index.js:**
```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import chatRouter from './routes/chat.js';
import healthRouter from './routes/health.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Parsing & compression
app.use(express.json({ limit: '10mb' }));
app.use(compression());

// Routes
app.use('/health', healthRouter);
app.use('/api/chat', authenticate, chatRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
```

**Create backend/src/routes/chat.js:**
```javascript
import express from 'express';
import OpenAI from 'openai';
import { body, validationResult } from 'express-validator';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Validation middleware
const validateChat = [
  body('message').isString().trim().isLength({ min: 1, max: 1000 }),
  body('conversationHistory').optional().isArray(),
  body('futureSelfProfile').optional().isObject()
];

router.post('/', validateChat, async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { message, conversationHistory, futureSelfProfile } = req.body;
    const userId = req.user.id; // From auth middleware

    // Get user's profile if not provided
    let profile = futureSelfProfile;
    if (!profile) {
      const { data } = await supabase
        .from('future_self_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      profile = data;
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(profile);

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...(conversationHistory || []).slice(-10),
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      stream: false // Set to true for streaming
    });

    const aiResponse = completion.choices[0].message.content;

    // Save to database
    await supabase.from('chat_messages').insert([
      { user_id: userId, content: message, is_user: true },
      { 
        user_id: userId, 
        content: aiResponse, 
        is_user: false,
        model_used: 'gpt-4o',
        prompt_tokens: completion.usage?.prompt_tokens,
        completion_tokens: completion.usage?.completion_tokens
      }
    ]);

    res.json({ 
      response: aiResponse,
      usage: completion.usage 
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

function buildSystemPrompt(profile) {
  return `You are the user's future self, 10 years from now...
  ${profile ? `Their hopes: ${profile.hope}` : ''}
  ${profile ? `Their fears: ${profile.fear}` : ''}
  Speak with wisdom and compassion.`;
}

export default router;
```

**Create backend/src/middleware/auth.js:**
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
}
```

### Step 2: Configure Railway Deployment (30 min)

**Create backend/railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30
  }
}
```

**Create backend/package.json scripts:**
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "build": "echo 'No build step required'"
  },
  "type": "module",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**Deploy to Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Add environment variables in Railway dashboard:
# - OPENAI_API_KEY
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY
# - SUPABASE_ANON_KEY
# - FRONTEND_URL
# - NODE_ENV=production

# Deploy
railway up
```

### Step 3: Update Frontend Configuration (45 min)

**Create frontend/.env.production:**
```env
VITE_SUPABASE_URL=https://epmopmfwauwcctnlrrbo.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=https://asonti-backend.up.railway.app
```

**Update src/services/aiChatClient.ts:**
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

class AIChatClient {
  async sendMessage(message: string): Promise<ChatResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Please sign in to chat');
    }

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message,
          conversationHistory: this.conversationHistory
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get response');
      }

      const data = await response.json();
      return { response: data.response };
    } catch (error) {
      console.error('Chat error:', error);
      
      // Retry logic with exponential backoff
      if (this.retryCount < 3) {
        this.retryCount++;
        await new Promise(r => setTimeout(r, 1000 * this.retryCount));
        return this.sendMessage(message);
      }
      
      throw error;
    }
  }
}
```

### Step 4: Deploy Frontend to Vercel (30 min)

**Create vercel.json:**
```json
{
  "buildCommand": "cd \"Asonti app\" && npm run build",
  "outputDirectory": "Asonti app/dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Deploy to Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd "Asonti app"
vercel

# Add environment variables in Vercel dashboard:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY  
# - VITE_API_URL (Railway backend URL)

# Deploy to production
vercel --prod
```

### Step 5: Set Up CI/CD Pipeline (45 min)

**Create .github/workflows/deploy.yml:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Railway CLI
        run: npm i -g @railway/cli
      
      - name: Deploy to Railway
        run: |
          cd backend
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd "Asonti app"
          npm ci
      
      - name: Build
        run: |
          cd "Asonti app"
          npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./Asonti app

  migrate-database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: supabase/setup-cli@v1
      
      - name: Run migrations
        run: supabase db push --linked
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### Step 6: Add Monitoring (30 min)

**Install Sentry for error tracking:**
```javascript
// backend/src/index.js
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Add Sentry middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

**Add health check endpoint:**
```javascript
// backend/src/routes/health.js
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const { error } = await supabase.from('user_profiles').select('count').limit(1);
    
    // Check OpenAI API
    const openAIHealthy = !!process.env.OPENAI_API_KEY;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: !error,
        openai: openAIHealthy
      }
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

## Testing Plan
- [ ] Test backend locally with all endpoints
- [ ] Deploy backend to Railway and verify health check
- [ ] Test frontend locally with production backend
- [ ] Deploy frontend to Vercel
- [ ] Test complete flow: signup → profile → chat
- [ ] Verify environment variables work
- [ ] Test rate limiting
- [ ] Check error tracking in Sentry

## Rollback Plan
1. Keep old server.js as backup
2. Use feature flags for gradual rollout
3. Railway supports instant rollback to previous deployment
4. Vercel keeps deployment history for rollback

## Success Criteria
- [ ] Backend deployed and accessible on Railway
- [ ] Frontend deployed and accessible on Vercel
- [ ] All environment variables properly configured
- [ ] Authentication working between frontend/backend
- [ ] Chat functionality working in production
- [ ] Health checks passing
- [ ] Error tracking operational
- [ ] CI/CD pipeline triggered on git push

## Production Checklist
- [ ] Remove all console.logs from production code
- [ ] Enable CORS only for production frontend URL
- [ ] Set secure headers with Helmet
- [ ] Implement request validation
- [ ] Add API documentation
- [ ] Set up domain names
- [ ] Configure SSL certificates (auto on Railway/Vercel)
- [ ] Set up monitoring alerts
- [ ] Create runbook for common issues

## Notes
- Railway provides automatic SSL and scaling
- Vercel provides automatic preview deployments
- Consider adding Redis for session management
- Implement WebSocket for real-time chat
- Add CDN for static assets
- Monitor API costs for OpenAI usage

**Created**: 2025-01-29  
**Author**: Development Team