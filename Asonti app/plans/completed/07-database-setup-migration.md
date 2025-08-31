# Plan 07: Database Setup & Migration

**Date**: 2025-01-29  
**Issue**: Database tables don't exist, causing all Supabase operations to fail silently  
**Priority**: CRITICAL  
**Estimated Time**: 3-4 hours  
**Status**: NOT NEEDED - Using hosted Supabase directly  
**Completion Date**: 2025-01-31

## COMPLETION NOTE
This plan was marked as not needed because:
1. **Using Hosted Supabase**: The app is configured to use Supabase's cloud service directly (epmopmfwauwcctnlrrbo.supabase.co) rather than local development
2. **Direct Cloud Connection**: All services are already implemented to connect to the production Supabase instance via environment variables
3. **No Local Setup Required**: The local development workflow with Docker containers and migrations described in this plan is optional - not required when working directly with the hosted instance
4. **Tables Should Be Created Via Dashboard**: Any missing tables should be created directly in the Supabase Dashboard SQL Editor using the existing schema files

The critical tables and schemas should be verified/created directly in the Supabase Dashboard at supabase.com rather than through local development setup.

## Problem Statement
The application has complete Supabase integration code but all database operations are failing because the tables were never created in Supabase. SQL schema files exist but were never executed. This causes all services to silently fall back to localStorage, making the app appear functional while no data is actually persisted to the database.

## Research & Documentation
**Sources Consulted**:
- [x] Supabase Database Migration Docs (2025)
- [x] RLS Performance Best Practices (2025)
- [x] Local Development with Schema Migrations
- [x] Supabase CLI migration workflow
- [x] Row Level Security optimization with auth.uid()

**Key Findings**:
- Use local development first with Supabase CLI for migrations
- Wrap auth.uid() in SELECT for 100x performance improvement
- Always specify 'authenticated' role in RLS policies
- Add indexes on foreign key columns for RLS performance
- Use CI/CD for production deployments (GitHub Actions)
- Schema-first migration strategy is recommended

## Goals
- [ ] Set up local Supabase development environment
- [ ] Execute all SQL schemas with proper migration workflow
- [ ] Add missing columns (version_number, aged_photo_url, personality_analysis)
- [ ] Configure optimized RLS policies with indexes
- [ ] Set up storage buckets for photo uploads
- [ ] Verify all tables work with test queries
- [ ] Create migration pipeline for future changes

## Technical Analysis

### Current SQL Files
```
/supabase/
├── schema.sql (main tables)
├── storage-setup.sql (buckets)
├── fix-auth-trigger.sql (user profile auto-creation)
├── migrations/
│   ├── 20250128_add_personality_analysis.sql
│   └── add_aged_photo_column.sql
└── verification-queries.sql
```

### Missing Database Elements
1. All tables (future_self_profiles, user_profiles, chat_messages, etc.)
2. Columns: version_number, aged_photo_url, personality_analysis
3. Storage buckets: future-self-photos, avatars
4. Optimized indexes for RLS policies
5. Proper role specifications in policies

## Implementation Steps

### Step 1: Set Up Local Development (30 min)
```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Initialize local project
cd "Asonti app"
supabase init

# Start local Supabase
supabase start

# Link to remote project
supabase link --project-ref [your-project-ref]
```

### Step 2: Create Consolidated Migration (45 min)
```bash
# Generate new migration file
supabase migration new initial_schema

# This creates: supabase/migrations/[timestamp]_initial_schema.sql
```

Consolidate all SQL into this migration:
```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create all tables from schema.sql
-- ... (include full schema)

-- Add missing columns
ALTER TABLE future_self_profiles 
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS aged_photo_url TEXT,
ADD COLUMN IF NOT EXISTS personality_analysis JSONB;

-- Create indexes for RLS performance (2025 best practice)
CREATE INDEX IF NOT EXISTS idx_future_self_user_id 
ON future_self_profiles USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id 
ON chat_messages USING btree (user_id);

-- Optimized RLS policies (wrap auth.uid() in SELECT)
CREATE POLICY "Users can view own profiles" ON future_self_profiles
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own profiles" ON future_self_profiles
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);
```

### Step 3: Test Locally First (30 min)
```bash
# Reset local database with migrations
supabase db reset

# This will:
# 1. Drop all tables
# 2. Run all migrations in order
# 3. Apply seed data if exists

# Test with seed data
echo "INSERT INTO auth.users (email) VALUES ('test@example.com');" > supabase/seed.sql

# Verify tables exist
supabase db inspect
```

### Step 4: Deploy to Production (45 min)
```bash
# Generate diff to see changes
supabase db diff --linked

# Push migrations to production
supabase db push --linked

# Verify in Supabase Dashboard
# Go to Table Editor and check all tables exist
```

### Step 5: Configure Storage Buckets (30 min)
```sql
-- Run in SQL Editor after tables are created
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('future-self-photos', 'future-self-photos', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies with optimized RLS
CREATE POLICY "Users can upload own photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('future-self-photos', 'avatars') AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own photos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id IN ('future-self-photos', 'avatars') AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
);
```

### Step 6: Fix Service Code (30 min)
Update `futureSelfService.ts`:
```typescript
// Add proper error logging
private handleError(error: any): never {
  console.error('Supabase error:', error);
  
  // Check for common issues
  if (error?.code === '42P01') {
    throw new Error('Table does not exist. Run migrations first.');
  }
  
  if (error?.code === 'PGRST301') {
    throw new Error('RLS policy violation. Check authentication.');
  }
  
  // Don't silently fail anymore
  throw new Error(error?.message || 'Database operation failed');
}
```

## Testing Plan
- [ ] Create test user via Supabase Auth
- [ ] Complete wizard and verify profile saves to database
- [ ] Send chat messages and verify persistence
- [ ] Upload photo and verify storage bucket
- [ ] Check RLS policies work (can't see other users' data)
- [ ] Verify localStorage is empty (no app data)
- [ ] Test performance with auth.uid() optimization

## Rollback Plan
```bash
# If issues occur in production:
supabase migration repair --status applied

# Create fix migration
supabase migration new fix_issue

# Test locally first
supabase db reset

# Then push fix
supabase db push
```

## Success Criteria
- [ ] All tables visible in Supabase Table Editor
- [ ] No "relation does not exist" errors in console
- [ ] RLS policies show "authenticated" role specified
- [ ] Indexes created for all foreign keys
- [ ] Storage buckets accessible and policies work
- [ ] Data persists after page refresh
- [ ] localStorage contains only auth token, no app data

## Migration Pipeline for Future
```yaml
# .github/workflows/migrate.yml
name: Database Migration
on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase db push --linked
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

## Notes
- Keep migration files in version control
- Never edit applied migrations
- Use `supabase migration new` for all changes
- Test locally before pushing to production
- Consider pg_prove for database testing
- Monitor query performance in Supabase Dashboard

**Created**: 2025-01-29  
**Author**: Development Team