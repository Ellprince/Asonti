# Plan 05: Profile History & Versioning

## Overview
**Status:** Active  
**Priority:** Medium  
**Duration:** 1 day  
**Dependencies:** Plan 1 (Database Migration), Plan 4 (AI Personality Analysis)  
**Created:** 2025-01-27  

## Objective
Implement comprehensive profile history tracking and versioning system that captures all changes to Future Self profiles over time, enabling users to see their evolution and allowing the AI to reference past states for more contextual conversations.

## Context
As users evolve and update their Future Self profiles, we need to:
- Track all changes with timestamps and reasons
- Show profile evolution timeline
- Allow comparison between versions
- Enable AI to reference historical context
- Provide insights on personal growth patterns
- Support rollback to previous versions if needed

## Documentation Research Findings (2024-2025)

### PostgreSQL Audit & History Tracking
- **Source:** Supabase Blog, PostgreSQL Wiki, Medium Articles
- **Date:** 2024 - Current
- **Key Findings:**
  1. JSONB storage approach is now standard for audit tables
  2. BRIN indexes on timestamps are 100x smaller than BTREE for append-only data
  3. Generic audit triggers can handle multiple tables with single implementation
  4. Performance overhead of synchronous triggers is ~5-10% on writes
  5. pg_notify() pattern recommended for high-volume async auditing

### Temporal Tables vs Audit Triggers
- **Best Practice:** Audit triggers with JSONB preferred over temporal tables
- **Reasoning:** Lower storage overhead, better query performance, more flexible
- **Pattern:** Single audit table for all profile changes using JSONB
- **Security:** Store user context in session variables, not app metadata
- **Performance:** Use table_oid instead of table_name for better indexing

### Supabase Realtime for History Updates
- **New Feature:** Channel-based subscriptions (2024) more efficient than legacy .on()
- **Requirement:** Must enable table replication in Supabase dashboard
- **Pattern:** Subscribe to specific record by ID to minimize overhead
- **Cleanup:** Always unsubscribe in useEffect return to prevent memory leaks

## Success Criteria
- [ ] All profile changes are automatically captured
- [ ] Version history UI shows timeline of changes
- [ ] Comparison view highlights differences between versions
- [ ] AI can access historical context in prompts
- [ ] Performance impact < 10% on profile saves
- [ ] 100% test coverage for history service

## Test-Driven Development Plan

### Phase 1: Write History Service Tests (1.5 hours)

#### 1.1 History Tracking Tests
**File:** `src/services/__tests__/profileHistoryService.test.ts`

```typescript
describe('ProfileHistoryService - Change Tracking', () => {
  test('should capture all field changes on profile update')
  test('should store old and new values in JSONB')
  test('should record who made the change')
  test('should record when change was made')
  test('should capture change reason if provided')
  test('should handle batch updates efficiently')
})

describe('ProfileHistoryService - Version Management', () => {
  test('should increment version number on each change')
  test('should maintain version chain integrity')
  test('should prevent version conflicts')
  test('should handle concurrent updates safely')
  test('should support version branching for drafts')
})

describe('ProfileHistoryService - History Retrieval', () => {
  test('should fetch complete history for profile')
  test('should support pagination for long histories')
  test('should filter history by date range')
  test('should filter history by change type')
  test('should calculate field-level change frequency')
})

describe('ProfileHistoryService - Comparison', () => {
  test('should compare any two versions')
  test('should generate diff with added/removed/changed')
  test('should handle nested JSONB field comparisons')
  test('should provide human-readable change descriptions')
})

describe('ProfileHistoryService - Rollback', () => {
  test('should restore profile to previous version')
  test('should create new version on rollback')
  test('should preserve rollback history')
  test('should validate version exists before rollback')
})
```

#### 1.2 Database Trigger Tests
**File:** `src/services/__tests__/auditTrigger.test.ts`

```typescript
describe('Audit Trigger - Automatic Capture', () => {
  test('should fire on INSERT operations')
  test('should fire on UPDATE operations')
  test('should fire on DELETE operations')
  test('should capture complete row data in JSONB')
  test('should not fire on unchanged updates')
  test('should handle NULL values correctly')
})

describe('Audit Trigger - Performance', () => {
  test('should complete within 50ms for single update')
  test('should handle 1000 updates per second')
  test('should not block main transaction')
  test('should use minimal storage per audit record')
})
```

### Phase 2: Implement Database Layer (2 hours)

#### 2.1 Create Audit Table
**File:** `supabase/migrations/add_profile_history.sql`

```sql
-- Create generic audit table using JSONB for flexibility
CREATE TABLE IF NOT EXISTS profile_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES future_self_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by UUID REFERENCES auth.users(id),
    change_reason TEXT,
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[] GENERATED ALWAYS AS (
        ARRAY(
            SELECT jsonb_object_keys(old_data) 
            UNION 
            SELECT jsonb_object_keys(new_data)
        )
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Use BRIN index for timestamp (100x smaller than BTREE)
CREATE INDEX idx_profile_history_changed_at 
ON profile_history USING BRIN (changed_at);

-- Index for profile lookups
CREATE INDEX idx_profile_history_profile 
ON profile_history(profile_id, version_number DESC);

-- Index for user's history
CREATE INDEX idx_profile_history_user 
ON profile_history(user_id, changed_at DESC);
```

#### 2.2 Create Audit Trigger Function
**File:** `supabase/migrations/add_audit_trigger.sql`

```sql
-- Generic audit trigger function using JSONB
CREATE OR REPLACE FUNCTION audit_profile_changes() 
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_user_id UUID;
    v_change_reason TEXT;
BEGIN
    -- Get user context from session
    v_user_id := COALESCE(
        current_setting('app.user_id', true)::UUID,
        auth.uid()
    );
    
    v_change_reason := current_setting('app.change_reason', true);
    
    -- Convert records to JSONB
    IF TG_OP = 'DELETE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_old_data := NULL;
        v_new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        
        -- Skip if no actual changes
        IF v_old_data = v_new_data THEN
            RETURN NEW;
        END IF;
    END IF;
    
    -- Insert audit record
    INSERT INTO profile_history (
        profile_id,
        user_id,
        version_number,
        operation,
        changed_by,
        change_reason,
        old_data,
        new_data
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.user_id, OLD.user_id),
        COALESCE(NEW.version_number, OLD.version_number, 1),
        TG_OP,
        v_user_id,
        v_change_reason,
        v_old_data,
        v_new_data
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to profiles table
CREATE TRIGGER profile_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON future_self_profiles
FOR EACH ROW EXECUTE FUNCTION audit_profile_changes();
```

### Phase 3: Implement History Service (2 hours)

#### 3.1 Create History Service
**File:** `src/services/profileHistoryService.ts`

```typescript
interface ProfileHistory {
  id: string
  profile_id: string
  version_number: number
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  changed_at: string
  changed_by: string
  change_reason?: string
  old_data: any
  new_data: any
  changed_fields: string[]
}

interface VersionComparison {
  added: Record<string, any>
  removed: Record<string, any>
  changed: Record<string, { old: any; new: any }>
}

class ProfileHistoryService {
  // Core history retrieval
  async getProfileHistory(
    profileId: string,
    options?: {
      limit?: number
      offset?: number
      startDate?: Date
      endDate?: Date
      fields?: string[]
    }
  ): Promise<ProfileHistory[]>
  
  // Version comparison
  async compareVersions(
    profileId: string,
    version1: number,
    version2: number
  ): Promise<VersionComparison>
  
  // Field-level analytics
  async getFieldChangeFrequency(
    profileId: string,
    field: string
  ): Promise<{
    total_changes: number
    last_changed: Date
    change_pattern: 'frequent' | 'occasional' | 'rare'
  }>
  
  // Rollback functionality
  async rollbackToVersion(
    profileId: string,
    targetVersion: number,
    reason: string
  ): Promise<void>
  
  // Set change context for audit
  async setChangeContext(
    userId: string,
    reason?: string
  ): Promise<void> {
    // Set session variables for trigger
    await supabase.rpc('set_config', {
      setting: 'app.user_id',
      value: userId
    })
    
    if (reason) {
      await supabase.rpc('set_config', {
        setting: 'app.change_reason',
        value: reason
      })
    }
  }
  
  // Real-time history subscription
  subscribeToHistory(
    profileId: string,
    callback: (history: ProfileHistory) => void
  ): () => void {
    const channel = supabase
      .channel(`profile-history:${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_history',
          filter: `profile_id=eq.${profileId}`
        },
        (payload) => callback(payload.new as ProfileHistory)
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }
  
  // Generate human-readable descriptions
  describeChanges(comparison: VersionComparison): string[] {
    const descriptions: string[] = []
    
    // Describe additions
    Object.entries(comparison.added).forEach(([field, value]) => {
      descriptions.push(`Added ${field}: "${value}"`)
    })
    
    // Describe removals
    Object.entries(comparison.removed).forEach(([field, value]) => {
      descriptions.push(`Removed ${field}: "${value}"`)
    })
    
    // Describe changes
    Object.entries(comparison.changed).forEach(([field, { old, new }]) => {
      descriptions.push(`Changed ${field} from "${old}" to "${new}"`)
    })
    
    return descriptions
  }
}

export const profileHistory = new ProfileHistoryService()
```

### Phase 4: Write Component Tests (1 hour)

#### 4.1 History Timeline Tests
**File:** `src/components/__tests__/ProfileHistory.test.tsx`

```typescript
describe('ProfileHistory - Timeline Display', () => {
  test('should fetch and display history on mount')
  test('should show loading state while fetching')
  test('should handle empty history gracefully')
  test('should paginate long history lists')
  test('should group changes by date')
  test('should show change descriptions')
})

describe('ProfileHistory - Version Comparison', () => {
  test('should allow selecting two versions')
  test('should display side-by-side comparison')
  test('should highlight differences')
  test('should show added/removed/changed badges')
})

describe('ProfileHistory - Rollback', () => {
  test('should show rollback button for past versions')
  test('should confirm before rollback')
  test('should require rollback reason')
  test('should refresh after successful rollback')
})
```

### Phase 5: Implement UI Components (1.5 hours)

#### 5.1 History Timeline Component
**File:** `src/components/ProfileHistory.tsx`

```typescript
describe('ProfileHistory Component Tests', () => {
  test('should render timeline of changes')
  test('should subscribe to real-time updates')
  test('should unsubscribe on unmount')
  test('should handle comparison selection')
})

const ProfileHistory = ({ profileId }: { profileId: string }) => {
  const [history, setHistory] = useState<ProfileHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [compareVersions, setCompareVersions] = useState<[number?, number?]>([])
  
  useEffect(() => {
    // Fetch initial history
    loadHistory()
    
    // Subscribe to real-time updates
    const unsubscribe = profileHistory.subscribeToHistory(
      profileId,
      (newHistory) => {
        setHistory(prev => [newHistory, ...prev])
      }
    )
    
    return () => unsubscribe()
  }, [profileId])
  
  // Component implementation with timeline UI
}
```

### Phase 6: AI Context Integration (1 hour)

#### 6.1 History Context Provider
**File:** `src/services/aiContextService.ts`

```typescript
describe('AI Context - History Integration', () => {
  test('should include recent changes in context')
  test('should summarize evolution patterns')
  test('should identify growth areas')
  test('should format history for LLM consumption')
})

class AIContextService {
  async buildHistoricalContext(profileId: string): Promise<string> {
    const history = await profileHistory.getProfileHistory(profileId, {
      limit: 10
    })
    
    // Analyze patterns
    const patterns = this.analyzeGrowthPatterns(history)
    
    // Format for LLM
    return `
      Profile Evolution Summary:
      - Total updates: ${history.length}
      - Most changed: ${patterns.mostChangedField}
      - Growth areas: ${patterns.growthAreas.join(', ')}
      - Recent focus: ${patterns.recentFocus}
      
      Recent changes:
      ${history.slice(0, 5).map(h => 
        `- ${h.changed_at}: ${h.change_reason || 'Updated profile'}`
      ).join('\n')}
    `
  }
}
```

### Phase 7: End-to-End Tests (30 minutes)

**File:** `e2e/profileHistory.spec.ts`

```typescript
describe('Profile History E2E', () => {
  test('profile changes create history records')
  test('history timeline displays all versions')
  test('version comparison shows differences')
  test('rollback restores previous version')
  test('real-time updates appear immediately')
  test('AI uses historical context in responses')
})
```

## Implementation Order

1. **Hour 1-2:** Write all service and trigger tests
2. **Hour 3-4:** Implement database schema and triggers
3. **Hour 5-6:** Build history service layer
4. **Hour 7:** Create UI components
5. **Hour 8:** AI context integration and E2E tests

## Technical Specifications

### Performance Targets
- History retrieval: < 200ms for 100 records
- Comparison calculation: < 100ms
- Audit trigger overhead: < 50ms
- Real-time subscription: < 1 second delay

### Storage Estimates
- Average audit record: ~2KB (JSONB)
- 10 changes per user per month
- 1000 users = ~20MB per month
- Use VACUUM and partitioning for tables > 1GB

### Query Optimization
```sql
-- Efficient history retrieval with BRIN index
SELECT * FROM profile_history
WHERE profile_id = $1
  AND changed_at BETWEEN $2 AND $3
ORDER BY version_number DESC
LIMIT 50;

-- Field change frequency analysis
SELECT 
  COUNT(*) as change_count,
  MAX(changed_at) as last_changed
FROM profile_history
WHERE profile_id = $1
  AND $2 = ANY(changed_fields);
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Audit table grows too large | High | Implement partitioning by month |
| Trigger slows down updates | Medium | Monitor performance, consider async |
| History queries slow UI | Medium | Add caching layer |
| Storage costs increase | Low | Archive old history to cold storage |

## Monitoring & Metrics

### Key Metrics
- Audit trigger execution time (target: <50ms)
- History table size growth rate
- Query performance p95 (target: <200ms)
- Rollback success rate (target: >99%)

### Analytics Events
- `profile_history_viewed`
- `profile_versions_compared`
- `profile_rollback_initiated`
- `profile_rollback_completed`

## Rollback Plan
1. Disable audit trigger with feature flag
2. Keep trigger but skip inserts
3. Maintain manual version tracking as fallback
4. One-click trigger removal if needed

## Definition of Done

### Code Complete
- [ ] All tests written and passing
- [ ] Audit trigger implemented
- [ ] History service functional
- [ ] UI components integrated
- [ ] AI context includes history
- [ ] E2E tests passing

### Quality Checks
- [ ] Performance targets met
- [ ] No memory leaks in subscriptions
- [ ] Rollback tested thoroughly
- [ ] Documentation updated

### Deployment Ready
- [ ] Migration scripts tested
- [ ] Feature flags configured
- [ ] Monitoring dashboards created
- [ ] Support team trained on history features

## Dependencies
- Plan 1 (Database Migration) must be complete ✅
- Plan 4 (AI Personality) for evolution insights ✅
- Supabase Realtime enabled for profile_history table
- BRIN index support in PostgreSQL

## Notes
- Consider implementing soft deletes for profiles
- Future enhancement: Visual timeline with charts
- May want to add change approval workflow later
- Archive strategy needed for histories > 1 year old

## Documentation Sources & References

### Official Documentation
1. **Supabase Postgres Audit Guide**  
   https://supabase.com/blog/postgres-audit
   
2. **PostgreSQL Trigger Documentation**  
   https://www.postgresql.org/docs/current/plpgsql-trigger.html
   
3. **Supabase Realtime Subscriptions**  
   https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
   
4. **PostgreSQL JSONB Functions**  
   https://www.postgresql.org/docs/current/functions-json.html

### Community Guides & Best Practices
5. **The Ultimate Guide to PostgreSQL Data Change Tracking**  
   https://blog.bemi.io/the-ultimate-guide-to-postgresql-data-change-tracking/
   
6. **Understanding PostgreSQL Triggers for Real-time Database Auditing**  
   https://naiknotebook.medium.com/understanding-postgresql-triggers-for-real-time-database-auditing-71ed35d39906
   
7. **PostgreSQL Trigger-Based Audit Log**  
   https://medium.com/israeli-tech-radar/postgresql-trigger-based-audit-log-fd9d9d5e412c
   
8. **Working with Postgres Audit Triggers**  
   https://www.enterprisedb.com/postgres-tutorials/working-postgres-audit-triggers

### Implementation Examples
9. **How to Implement Data Versioning in Supabase**  
   https://bootstrapped.app/guide/how-to-implement-data-versioning-in-supabase
   
10. **Real-time Table Changes in Supabase with React.js**  
    https://www.codu.co/articles/real-time-table-changes-in-supabase-with-react-js-next-js-swmgqmq9
    
11. **Audit trigger - PostgreSQL wiki**  
    https://wiki.postgresql.org/wiki/Audit_trigger
    
12. **PostgreSQL audit logging using triggers**  
    https://vladmihalcea.com/postgresql-audit-logging-triggers/

### Key Takeaways from Sources
- **JSONB Storage:** Universal preference for JSONB over text/hstore (Source 1, 5)
- **BRIN Indexes:** 100x smaller than BTREE for append-only timestamp data (Source 1)
- **Performance:** Trigger overhead typically 5-10% on writes (Source 6)
- **Real-time:** Must enable replication in Supabase dashboard first (Source 10)
- **Cleanup:** Always unsubscribe channels to prevent memory leaks (Source 3)
- **Security:** Use session variables, not app metadata for user context (Source 7)
- **Optimization:** Index table_oid instead of table_name for better performance (Source 5)

**Last Verified:** January 27, 2025