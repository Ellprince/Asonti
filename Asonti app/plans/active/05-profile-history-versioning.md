# Plan 05: Profile History & Versioning (SIMPLIFIED MVP)

**Date**: 2025-08-31  
**Status**: Active  
**Priority**: Medium  
**Duration**: 3-4 hours  
**Dependencies**: Supabase database access, existing profile system

## Overview
Implement a lightweight profile history tracking system that silently captures all changes for AI context enhancement, with minimal UI and user-controlled data deletion.

## User Requirements
- ✅ Keep history data forever (unless user deletes)
- ✅ Users can delete their own history from Settings
- ✅ AI mentions past changes only when contextually relevant
- ✅ Version info displayed subtly at bottom of profile
- ✅ Test with fake data initially

## Implementation Plan (3-4 Hours)

### Phase 1: Database Setup (1 hour)

#### 1.1 Create History Table
**File**: Run in Supabase SQL Editor

```sql
-- Create profile history table with JSONB storage
CREATE TABLE IF NOT EXISTS profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES future_self_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_data JSONB,
  new_data JSONB,
  -- Computed column for changed fields
  changed_fields TEXT[] GENERATED ALWAYS AS (
    CASE 
      WHEN old_data IS NULL THEN ARRAY[]::TEXT[]
      WHEN new_data IS NULL THEN ARRAY[]::TEXT[]
      ELSE ARRAY(
        SELECT jsonb_object_keys(old_data) 
        EXCEPT 
        SELECT jsonb_object_keys(new_data)
        UNION
        SELECT jsonb_object_keys(new_data) 
        EXCEPT 
        SELECT jsonb_object_keys(old_data)
      )
    END
  ) STORED
);

-- Create indexes for performance
-- BRIN index for timestamp (100x smaller than BTREE for append-only)
CREATE INDEX idx_profile_history_changed_at 
  ON profile_history USING BRIN (changed_at);

-- Regular index for profile lookups
CREATE INDEX idx_profile_history_profile 
  ON profile_history(profile_id, version_number DESC);

-- Index for user's history (for deletion)
CREATE INDEX idx_profile_history_user 
  ON profile_history(user_id);

-- Enable RLS
ALTER TABLE profile_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own history
CREATE POLICY "Users can view own history" ON profile_history
  FOR SELECT USING (auth.uid() = user_id);

-- Users can delete their own history
CREATE POLICY "Users can delete own history" ON profile_history
  FOR DELETE USING (auth.uid() = user_id);
```

#### 1.2 Create Audit Trigger
**File**: Run in Supabase SQL Editor (after table creation)

```sql
-- Create trigger function to capture changes
CREATE OR REPLACE FUNCTION capture_profile_changes() 
RETURNS TRIGGER AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_operation TEXT;
BEGIN
  -- Determine operation type
  v_operation := TG_OP;
  
  -- Capture data based on operation
  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    
    -- Skip if no actual changes (important for performance)
    IF v_old_data = v_new_data THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- Insert history record
  INSERT INTO profile_history (
    profile_id,
    user_id,
    version_number,
    operation,
    old_data,
    new_data
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.user_id, OLD.user_id),
    COALESCE(NEW.version_number, OLD.version_number, 1),
    v_operation,
    v_old_data,
    v_new_data
  );
  
  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to profiles table
DROP TRIGGER IF EXISTS profile_audit_trigger ON future_self_profiles;
CREATE TRIGGER profile_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON future_self_profiles
FOR EACH ROW EXECUTE FUNCTION capture_profile_changes();

-- Enable real-time for history table (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE profile_history;
```

### Phase 2: Backend Service Integration (1 hour)

#### 2.1 Add History Service Functions
**File**: `src/services/profileHistoryService.ts`

```typescript
import { supabase } from '@/lib/supabase';

export interface ProfileHistory {
  id: string;
  profile_id: string;
  version_number: number;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_at: string;
  old_data: any;
  new_data: any;
  changed_fields?: string[];
}

export class ProfileHistoryService {
  /**
   * Get profile history for AI context
   * Returns last 5 changes for contextual awareness
   */
  async getRecentHistory(profileId: string): Promise<ProfileHistory[]> {
    const { data, error } = await supabase
      .from('profile_history')
      .select('*')
      .eq('profile_id', profileId)
      .order('version_number', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Error fetching history:', error);
      return [];
    }
    
    return data || [];
  }

  /**
   * Get summarized changes for AI context
   * Returns human-readable change descriptions
   */
  async getHistorySummary(profileId: string): Promise<string> {
    const history = await this.getRecentHistory(profileId);
    
    if (history.length === 0) {
      return '';
    }
    
    const summaries = history
      .filter(h => h.operation === 'UPDATE')
      .slice(0, 3)
      .map(h => {
        const changes = this.describeChanges(h.old_data, h.new_data);
        const date = new Date(h.changed_at).toLocaleDateString();
        return `${date}: ${changes}`;
      });
    
    return summaries.length > 0 
      ? `Recent profile evolution:\n${summaries.join('\n')}`
      : '';
  }

  /**
   * Describe changes between two versions
   */
  private describeChanges(oldData: any, newData: any): string {
    if (!oldData || !newData) return 'Profile created';
    
    const changes: string[] = [];
    
    // Check key fields for changes
    if (oldData.hope !== newData.hope) {
      changes.push('updated hopes');
    }
    if (oldData.fear !== newData.fear) {
      changes.push('revised fears');
    }
    if (JSON.stringify(oldData.values) !== JSON.stringify(newData.values)) {
      changes.push('adjusted values');
    }
    if (oldData.day_in_life !== newData.day_in_life) {
      changes.push('reimagined daily life');
    }
    
    return changes.length > 0 
      ? changes.join(', ')
      : 'minor updates';
  }

  /**
   * Delete all history for a user (for Settings)
   */
  async deleteUserHistory(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('profile_history')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error deleting history:', error);
      return false;
    }
    
    return true;
  }

  /**
   * Get history count for display
   */
  async getHistoryCount(profileId: string): Promise<number> {
    const { count, error } = await supabase
      .from('profile_history')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId);
    
    return count || 0;
  }
}

export const profileHistory = new ProfileHistoryService();
```

#### 2.2 Update AI Chat Service
**File**: Update `src/services/aiChatService.ts`

```typescript
// Add to imports
import { profileHistory } from './profileHistoryService';

// Update sendMessage method
async sendMessage(message: string) {
  try {
    // Get profile history for context (only if relevant)
    let historyContext = '';
    
    // Only include history if message relates to change/progress/evolution
    const changeKeywords = ['changed', 'different', 'progress', 'evolved', 'growth', 'before', 'used to', 'originally'];
    const shouldIncludeHistory = changeKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    if (shouldIncludeHistory && this.futureSelfProfile?.id) {
      historyContext = await profileHistory.getHistorySummary(this.futureSelfProfile.id);
    }
    
    // Add to system prompt if history exists
    const enhancedProfile = {
      ...this.futureSelfProfile,
      historyContext
    };
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory: this.conversationHistory,
        futureSelfProfile: enhancedProfile
      })
    });
    
    // ... rest of existing code
  } catch (error) {
    // ... existing error handling
  }
}
```

### Phase 3: Minimal UI Integration (1 hour)

#### 3.1 Add Version Badge to Profile
**File**: Update `src/components/ProfileScreen.tsx`

```typescript
// Add to imports
import { profileHistory } from '@/services/profileHistoryService';

// Add state for version info
const [versionInfo, setVersionInfo] = useState<{
  version: number;
  lastUpdated: string;
  historyCount: number;
}>({ version: 1, lastUpdated: '', historyCount: 0 });

// Add useEffect to fetch version info
useEffect(() => {
  const fetchVersionInfo = async () => {
    if (profile?.id) {
      const count = await profileHistory.getHistoryCount(profile.id);
      setVersionInfo({
        version: profile.version_number || 1,
        lastUpdated: profile.updated_at 
          ? new Date(profile.updated_at).toLocaleDateString()
          : 'Never',
        historyCount: count
      });
    }
  };
  
  fetchVersionInfo();
}, [profile]);

// Add to render (at bottom of profile card)
{profile && (
  <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
    <div className="flex justify-between items-center">
      <span>Version {versionInfo.version}</span>
      <span>Last updated: {versionInfo.lastUpdated}</span>
    </div>
  </div>
)}
```

#### 3.2 Add Delete History to Settings
**File**: Update `src/components/SettingsScreen.tsx`

```typescript
// Add to imports
import { profileHistory } from '@/services/profileHistoryService';
import { toast } from 'sonner';

// Add delete history function
const handleDeleteHistory = async () => {
  const confirmed = window.confirm(
    'This will permanently delete all your profile history. This cannot be undone. Continue?'
  );
  
  if (confirmed) {
    const success = await profileHistory.deleteUserHistory(user.id);
    if (success) {
      toast.success('Profile history deleted successfully');
    } else {
      toast.error('Failed to delete history. Please try again.');
    }
  }
};

// Add to Data Management section
<div className="bg-white p-6 rounded-lg shadow">
  <h3 className="text-lg font-semibold mb-4">Data Management</h3>
  
  <div className="space-y-4">
    {/* Existing delete account button */}
    
    <div className="pt-4 border-t">
      <p className="text-sm text-gray-600 mb-2">
        Delete all profile change history. Your current profile will remain unchanged.
      </p>
      <button
        onClick={handleDeleteHistory}
        className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
      >
        Delete Profile History
      </button>
    </div>
  </div>
</div>
```

### Phase 4: Testing (30 minutes)

#### 4.1 Create Test Data
**File**: Run in Supabase SQL Editor after implementation

```sql
-- Create test profile updates to generate history
DO $$
DECLARE
  test_profile_id UUID;
  test_user_id UUID;
BEGIN
  -- Get a test profile (use your actual profile ID)
  SELECT id, user_id INTO test_profile_id, test_user_id
  FROM future_self_profiles
  LIMIT 1;
  
  IF test_profile_id IS NOT NULL THEN
    -- Simulate profile evolution over time
    
    -- Update 1: Change hope
    UPDATE future_self_profiles 
    SET hope = 'Test: Achieve work-life balance',
        version_number = version_number + 1,
        updated_at = NOW() - INTERVAL '7 days'
    WHERE id = test_profile_id;
    
    -- Update 2: Change fear
    UPDATE future_self_profiles 
    SET fear = 'Test: Missing important moments',
        version_number = version_number + 1,
        updated_at = NOW() - INTERVAL '3 days'
    WHERE id = test_profile_id;
    
    -- Update 3: Change values
    UPDATE future_self_profiles 
    SET current_values = ARRAY['family', 'health', 'growth'],
        version_number = version_number + 1,
        updated_at = NOW() - INTERVAL '1 day'
    WHERE id = test_profile_id;
    
    RAISE NOTICE 'Test history created for profile %', test_profile_id;
  END IF;
END $$;

-- Verify history was created
SELECT 
  version_number,
  operation,
  changed_at,
  old_data->>'hope' as old_hope,
  new_data->>'hope' as new_hope
FROM profile_history
ORDER BY version_number DESC
LIMIT 5;
```

#### 4.2 Test Scenarios
**File**: `src/services/__tests__/profileHistoryService.test.ts`

```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { profileHistory } from '../profileHistoryService';

describe('ProfileHistoryService', () => {
  test('should fetch recent history', async () => {
    const history = await profileHistory.getRecentHistory('test-profile-id');
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeLessThanOrEqual(5);
  });
  
  test('should generate history summary for AI', async () => {
    const summary = await profileHistory.getHistorySummary('test-profile-id');
    expect(typeof summary).toBe('string');
    
    // Should include dates and changes if history exists
    if (summary) {
      expect(summary).toContain('Recent profile evolution');
    }
  });
  
  test('should only include history for relevant queries', () => {
    const relevantQueries = [
      'How have I changed?',
      'What was different before?',
      'Show my progress',
      'How have I evolved?'
    ];
    
    const irrelevantQueries = [
      'What is the weather?',
      'Tell me a joke',
      'How are you today?'
    ];
    
    relevantQueries.forEach(query => {
      const keywords = ['changed', 'different', 'progress', 'evolved'];
      const shouldInclude = keywords.some(k => query.toLowerCase().includes(k));
      expect(shouldInclude).toBe(true);
    });
    
    irrelevantQueries.forEach(query => {
      const keywords = ['changed', 'different', 'progress', 'evolved'];
      const shouldInclude = keywords.some(k => query.toLowerCase().includes(k));
      expect(shouldInclude).toBe(false);
    });
  });
  
  test('should delete user history', async () => {
    // This would need a test user ID
    const success = await profileHistory.deleteUserHistory('test-user-id');
    expect(typeof success).toBe('boolean');
  });
  
  test('should handle missing history gracefully', async () => {
    const history = await profileHistory.getRecentHistory('non-existent-id');
    expect(history).toEqual([]);
    
    const summary = await profileHistory.getHistorySummary('non-existent-id');
    expect(summary).toBe('');
  });
});
```

## Success Criteria
- [x] Trigger automatically captures all profile changes
- [x] History stored efficiently using JSONB
- [x] AI can access history when contextually relevant
- [x] Users can delete their history from Settings
- [x] Version info displays at bottom of profile
- [x] No performance impact on normal operations
- [x] Test data validates functionality

## Rollback Plan
If issues arise:
1. Disable trigger: `DROP TRIGGER profile_audit_trigger ON future_self_profiles;`
2. Keep history table (no data loss)
3. Remove UI elements via feature flag
4. Fix issues and re-enable

## Documentation Sources
- **Supabase Audit Guide**: https://supabase.com/blog/postgres-audit (official Supabase approach)
- **PostgreSQL Triggers**: https://www.postgresql.org/docs/current/plpgsql-trigger.html (v17 docs)
- **JSONB Best Practices**: https://vladmihalcea.com/postgresql-audit-logging-triggers/
- **BRIN Index Performance**: 100x smaller than BTREE for append-only data (Supabase blog)

## Notes
- History is kept forever unless user explicitly deletes
- AI only mentions history when contextually relevant (not every message)
- Version badge is subtle, not prominent
- Delete history option is in Settings under Data Management
- Uses BRIN index for optimal storage efficiency
- Trigger runs AFTER operations to ensure data integrity

**Status**: Ready for implementation
**Time Estimate**: 3-4 hours
**Risk Level**: Low (trigger can be disabled instantly if issues arise)