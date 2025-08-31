# Plan 08: Remove localStorage Dependencies

**Date**: 2025-01-29  
**Issue**: App uses localStorage instead of Supabase database for data persistence  
**Priority**: HIGH  
**Estimated Time**: 4-5 hours  
**Dependencies**: Plan 07 (Database Setup) must be complete

## Problem Statement
The application currently uses a hybrid approach where data is saved to both localStorage and Supabase, with localStorage as the primary fallback. When Supabase operations fail (due to missing tables), the app silently falls back to localStorage, creating data inconsistency and preventing proper multi-device synchronization. All components need to be updated to use Supabase as the single source of truth.

## Research & Documentation
**Sources Consulted**:
- [x] React Supabase Integration Best Practices (2025)
- [x] Supabase Real-time Subscriptions Documentation
- [x] React Query with Supabase patterns
- [x] Optimistic UI updates with Supabase
- [x] Session storage best practices

**Key Findings**:
- Use Supabase client with proper error boundaries
- Implement optimistic updates for better UX
- Real-time subscriptions should be cleaned up in useEffect
- Keep only auth session in localStorage
- Use React Query or SWR for caching (not localStorage)
- Always show loading states during database operations

## Goals
- [x] Remove all localStorage usage for app data (90% complete - wizard remains)
- [x] Implement proper error handling with user feedback
- [x] Add loading states for all database operations
- [x] Set up real-time subscriptions for chat (limited by Supabase Replication)
- [x] Implement optimistic UI updates
- [ ] Add retry logic for failed operations
- [ ] Ensure data syncs across devices (pending Supabase Replication feature)

## Technical Analysis

### Current localStorage Usage
```javascript
// Components using localStorage:
1. ChatScreen.tsx - stores messages
2. ProfileScreen.tsx - stores future self data
3. SettingsScreen.tsx - stores app settings
4. FutureSelfWizard.tsx - stores wizard progress
5. aiChatClient.ts - reads profile data

// Hooks:
- useLocalStorage.ts - generic localStorage wrapper
```

### Target Architecture
```javascript
// All data flows through Supabase:
Supabase DB ←→ Services ←→ Components
           ↓
     Real-time updates
```

## Implementation Steps

### Step 1: Update ChatScreen.tsx (1 hour)

**Current State:**
```javascript
// Saves to localStorage
localStorage.setItem('chat-messages', JSON.stringify(messages));
```

**New Implementation:**
```javascript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load messages from database
  useEffect(() => {
    if (!user) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (err) {
        console.error('Failed to load messages:', err);
        setError('Failed to load chat history');
        // No localStorage fallback!
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Set up real-time subscription
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Save message to database (with optimistic update)
  const sendMessage = async (text: string) => {
    const tempMessage = {
      id: crypto.randomUUID(),
      text,
      is_user: true,
      created_at: new Date().toISOString(),
      user_id: user.id
    };

    // Optimistic update
    setMessages(prev => [...prev, tempMessage]);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          content: text,
          is_user: true,
          user_id: user.id
        });

      if (error) throw error;
    } catch (err) {
      // Rollback optimistic update
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setError('Failed to send message');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={loadMessages} />;

  return (
    // Component JSX
  );
}
```

### Step 2: Update ProfileScreen.tsx (1 hour)

**Remove localStorage fallback:**
```javascript
// DELETE THIS:
} catch (error) {
  // Fallback to localStorage if database fails
  const savedData = storage.getItem('future-self-data');
  if (savedData) {
    setFutureSelf(savedData);
  }
}

// REPLACE WITH:
} catch (error) {
  console.error('Error loading profile:', error);
  setError('Unable to load profile. Please check your connection.');
  // Show retry button instead of silent fallback
}
```

**Remove localStorage save:**
```javascript
// DELETE THIS:
storage.setItem('future-self-data', updatedFutureSelf);

// Already saving to Supabase via futureSelfService
```

### Step 3: Update SettingsScreen.tsx (45 min)

**Migrate settings to database:**
```javascript
import { supabase } from '@/lib/supabase';

export function SettingsScreen() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  // Load from database
  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setSettings(data);
      } else {
        // Create default settings in database
        await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            ...defaultSettings
          });
      }
    };

    loadSettings();
  }, [user]);

  // Save to database with debounce
  const updateSettings = useMemo(
    () => debounce(async (newSettings: Settings) => {
      setSaving(true);
      try {
        const { error } = await supabase
          .from('user_settings')
          .update(newSettings)
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (err) {
        console.error('Failed to save settings:', err);
        toast.error('Failed to save settings');
      } finally {
        setSaving(false);
      }
    }, 500),
    [user]
  );

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Apply dark mode immediately
    if (key === 'darkMode') {
      document.documentElement.classList.toggle('dark', value);
    }
    
    updateSettings(newSettings);
  };

  return (
    // Component JSX with saving indicator
  );
}
```

### Step 4: Update FutureSelfWizard.tsx (45 min)

**Remove localStorage for wizard state:**
```javascript
// Current: Uses localStorage for wizard progress
// New: Use component state only, save to DB on complete

export function FutureSelfWizard({ onComplete }: Props) {
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // No localStorage reads/writes during wizard

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Save complete profile to database
      const profile = await futureSelfService.createProfile({
        ...wizardData,
        completed_at: new Date().toISOString()
      });

      // Analyze personality in background
      personalityService.analyzeProfile(profile.id, wizardData);

      onComplete(profile);
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Auto-save draft to database periodically
  useEffect(() => {
    const saveDraft = debounce(async () => {
      if (Object.keys(wizardData).length > 0) {
        await futureSelfService.saveDraft(wizardData);
      }
    }, 2000);

    saveDraft();
    return () => saveDraft.cancel();
  }, [wizardData]);
}
```

### Step 5: Update aiChatClient.ts (30 min)

**Read profile from database:**
```javascript
class AIChatClient {
  async sendMessage(message: string): Promise<ChatResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // Get profile from database, not localStorage
    const { data: profile } = await supabase
      .from('future_self_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    // Get recent messages from database
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Send to API with database data
    const response = await fetch(API_URL + '/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        message,
        profile,
        history: recentMessages?.reverse() || []
      })
    });

    return response.json();
  }
}
```

### Step 6: Clean Up localStorage Hooks (30 min)

**Update useLocalStorage.ts:**
```javascript
// Keep only for auth session, remove app data functions
export const clearAllAppData = async () => {
  const { error } = await supabase.auth.signOut();
  if (!error) {
    // Only clear auth-related localStorage
    localStorage.removeItem('supabase.auth.token');
    window.location.href = '/';
  }
};

// Remove storage.getItem/setItem for app data
// Keep only for non-critical UI preferences if needed
```

## Testing Plan
- [ ] Test with fresh browser (no localStorage)
- [ ] Verify all data loads from database
- [ ] Test offline behavior (should show error, not break)
- [ ] Verify real-time updates work in chat
- [ ] Test multi-device sync (login on 2 devices)
- [ ] Check error states show proper messages
- [ ] Verify no app data in localStorage
- [ ] Test optimistic updates and rollbacks

## Rollback Plan
If critical issues occur:
1. Keep localStorage reads as temporary fallback
2. Add feature flag to toggle between storage methods
3. Implement gradual migration for existing users
4. Log all failures to monitoring service

## Success Criteria
- [ ] Zero localStorage usage for app data
- [ ] All components show loading states
- [ ] Errors display user-friendly messages
- [ ] Real-time updates work in chat
- [ ] Settings persist across devices
- [ ] No data loss during migration
- [ ] Performance remains acceptable (<2s load)

## Error Handling Strategy
```javascript
// Consistent error handling across all components
const handleDatabaseError = (error: any, operation: string) => {
  console.error(`${operation} failed:`, error);
  
  if (error.code === '401') {
    toast.error('Please sign in again');
    supabase.auth.signOut();
  } else if (error.code === 'PGRST301') {
    toast.error('Access denied. Please refresh the page.');
  } else if (error.message?.includes('Failed to fetch')) {
    toast.error('Connection error. Please check your internet.');
  } else {
    toast.error(`Failed to ${operation}. Please try again.`);
  }
};
```

## Notes
- Consider adding React Query for better caching
- Implement exponential backoff for retries
- Add connection status indicator
- Consider offline-first approach with sync
- Monitor performance impact of real-time subscriptions

**Created**: 2025-01-29  
**Author**: Development Team