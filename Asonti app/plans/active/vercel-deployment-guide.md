# Vercel Deployment Guide for Asonti

## Environment Variable Setup

### For Local Development
Your `.env.local` file is already configured and will work automatically when you run `npm run dev`.

### For Production (Vercel)

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Click "Settings" tab
   - Click "Environment Variables" in the left sidebar

2. **Add These Variables**
   ```
   VITE_SUPABASE_URL = https://epmopmfwauwcctnlrrbo.supabase.co
   VITE_SUPABASE_ANON_KEY = [your anon key]
   ```

3. **Important Settings**
   - Environment: Select "Production", "Preview", and "Development"
   - Sensitive: Toggle ON for any service keys (not needed for anon key)

## Deployment Commands

### Initial Deploy
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Deploy from Asonti app folder
cd "Asonti app"
vercel

# Follow prompts:
# - Link to existing project or create new
# - Confirm settings
```

### Subsequent Deploys
```bash
# Production deploy
vercel --prod

# Preview deploy (for testing)
vercel
```

## Vercel Configuration File

Create `vercel.json` in the Asonti app folder:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Build Configuration Issues

### Common Problems & Solutions

1. **Build Path Issue**
   - Set build command: `cd "Asonti app" && npm run build`
   - Output directory: `Asonti app/dist` (Vite default, not `build`)
   - Root directory: Keep as repository root

2. **Node Version**
   - Specify Node 18 or 20 in Vercel settings
   - Add `.nvmrc` file with `20` for consistency

3. **SPA Routing**
   - Without rewrites config, refreshing on `/profile` returns 404
   - The rewrite rule ensures all routes serve `index.html`

4. **Environment Variables**
   - Must use `VITE_` prefix for client-side access
   - Variables without prefix won't be available in browser
   - Add to Vercel dashboard, not committed `.env` files

## Security Notes

✅ **Safe to expose** (already in browser anyway):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

❌ **Never expose** (backend only):
- `SUPABASE_SERVICE_ROLE_KEY`
- Database passwords
- JWT secrets

## Supabase Configuration for Vercel

### Auth Settings (Required)
1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Add these to "Redirect URLs":
   ```
   https://your-app.vercel.app/**
   https://*.vercel.app/**  (for preview deployments)
   http://localhost:3000/**  (for local dev)
   ```

3. Add to "Site URL":
   ```
   https://your-app.vercel.app
   ```

### CORS Configuration
- Supabase automatically handles CORS for authenticated requests
- Ensure your domain is in the allowed redirects list

### Realtime Considerations
- Websockets work on Vercel but count toward bandwidth limits
- Free tier: 100GB bandwidth/month
- Each active user maintains persistent connection

## Deployment Checklist

- [ ] Environment variables added in Vercel dashboard
- [ ] `.env.local` added to `.gitignore`
- [ ] `vercel.json` created with SPA rewrites
- [ ] Supabase redirect URLs configured
- [ ] Test build locally: `npm run build`
- [ ] Deploy to preview first: `vercel`
- [ ] Test preview deployment thoroughly
- [ ] Deploy to production: `vercel --prod`

## Monitoring After Deploy

1. Check Vercel Functions tab for any errors
2. Monitor Supabase Dashboard for API usage
3. Test all auth flows in production
4. Verify environment variables are loading (check browser console)

## Edge Cases & Performance

### Preview Deployment URLs
- Each PR gets unique URL like `asonti-pr-123.vercel.app`
- Need wildcard `*.vercel.app` in Supabase redirects
- Consider separate Supabase project for staging

### Free Tier Limits
- **Vercel:** 100GB bandwidth, 10s function timeout
- **Supabase:** 500MB database, 2GB bandwidth, 50K auth users
- **Concern:** Realtime subscriptions maintain persistent connections

### Performance Optimizations
1. **Cache Profile Status**: Don't query on every navigation
2. **Lazy Load Routes**: Split code for faster initial load
3. **Image Optimization**: Use Vercel's image optimization for avatars
4. **Edge Caching**: Cache static assets at edge locations

### Deployment Strategy
1. **Feature Flags**: Use env vars for gradual rollout
2. **Database Migrations**: Run before deploying new code
3. **Rollback Plan**: Keep previous deployment URL active
4. **Health Checks**: Add `/api/health` endpoint for monitoring