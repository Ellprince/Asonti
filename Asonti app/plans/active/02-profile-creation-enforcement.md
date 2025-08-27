# Plan 02: Profile Creation Enforcement

## Overview
**Status:** Active  
**Priority:** High  
**Duration:** 0.5 days (4 hours)  
**Dependencies:** Plan 1 (Database Migration)  
**Created:** 2025-01-27  

## Objective
Enforce mandatory Future Self profile creation before users can access the chat feature, ensuring every user has a complete profile for AI personalization.

## Context
Currently, users can bypass profile creation and access chat directly. This breaks the core value proposition where users chat with their personalized future self. We need to implement a robust onboarding flow that:
- Forces new users to complete their profile
- Prevents navigation to chat without a profile
- Provides clear visual indicators for locked features
- Maintains good UX with informative messaging

## Documentation Research Findings (2024-2025)

### Protected Routes Best Practices
- **Source:** Medium, Dev.to, Supabase Docs
- **Date:** 2024 - Current
- **Key Findings:**
  1. Use AuthProvider pattern with `onAuthStateChange` listener
  2. Single Stack navigator with conditional screens (React Navigation)
  3. Session management via `getSession()` and `onAuthStateChange()`
  4. Metadata tracking for onboarding completion status
  5. Force redirect URLs for sign-up flows

### Onboarding Flow Patterns
- **Best Practice:** Store onboarding status in user metadata
- **Recommended:** Use `publicMetadata` or database field for completion tracking
- **Pattern:** Conditional navigation based on profile completion
- **Security:** Check onboarding status server-side for true protection
- **UX:** Show clear indicators for locked/unavailable features

## Success Criteria
- [ ] New users cannot access chat without completing profile
- [ ] Existing users with no profile are redirected to profile tab
- [ ] Navigation shows locked state for unavailable features
- [ ] Clear messaging explains why features are locked
- [ ] Profile completion immediately unlocks chat
- [ ] 100% test coverage for navigation guards

## Test-Driven Development Plan

### Phase 1: Write Guard Tests (1 hour)

#### 1.1 Navigation Guard Tests
**File:** `src/guards/__tests__/profileGuard.test.ts`

```typescript
describe('ProfileGuard - Profile Completion Check', () => {
  test('should return false when no profile exists')
  test('should return true when profile is complete')
  test('should check profile completion on mount')
  test('should recheck when user changes')
  test('should handle loading states')
})

describe('ProfileGuard - Redirect Logic', () => {
  test('should redirect to profile tab when incomplete')
  test('should allow chat access when complete')
  test('should preserve attempted destination for later')
  test('should show appropriate messaging')
})
```

#### 1.2 Component Integration Tests
**File:** `src/components/__tests__/App.navigation.test.tsx`

```typescript
describe('App - Navigation Guards', () => {
  test('should disable chat tab when no profile')
  test('should show lock icon on disabled tabs')
  test('should enable chat after profile completion')
  test('should redirect from chat to profile if incomplete')
  test('should show onboarding message to new users')
})

describe('Navigation Components - Disabled States', () => {
  test('BottomNavigation should disable chat without profile')
  test('HeaderNavigation should disable chat without profile')
  test('LeftSidebar should disable chat without profile')
  test('should show tooltip explaining why disabled')
})
```

### Phase 2: Implement Profile Guard Service (1 hour)

#### 2.1 Create Guard Service
**File:** `src/services/profileGuard.ts`

```typescript
interface ProfileGuardService {
  // Profile completion checking
  async hasCompletedProfile(userId: string): Promise<boolean>
  async getProfileCompletionStatus(): Promise<{
    hasProfile: boolean
    isComplete: boolean
    missingFields: string[]
  }>
  
  // Navigation control
  canAccessChat(): boolean
  canAccessSettings(): boolean
  getLockedFeatures(): string[]
  
  // Onboarding flow
  async markOnboardingComplete(): Promise<void>
  async getOnboardingStep(): Promise<number>
  
  // Real-time updates
  subscribeToProfileChanges(callback: (complete: boolean) => void): () => void
}

class ProfileGuard {
  private profileCache: Map<string, boolean> = new Map()
  
  // Implementation with caching and real-time updates
  async hasCompletedProfile(userId: string): Promise<boolean> {
    // Check cache first
    // Query database if not cached
    // Update cache with result
    // Return completion status
  }
  
  // Subscribe to profile changes for immediate unlocking
  subscribeToProfileChanges(callback) {
    // Listen to future_self_profiles table changes
    // Call callback when profile becomes complete
  }
}
```

### Phase 3: Update App.tsx Navigation (1 hour)

#### 3.1 App Component Tests
**File:** `src/__tests__/App.profile-enforcement.test.tsx`

```typescript
describe('App - Profile Enforcement', () => {
  test('should check profile on mount')
  test('should set initial tab to profile if incomplete')
  test('should prevent tab change to chat if incomplete')
  test('should show completion message')
  test('should unlock chat immediately after completion')
})
```

#### 3.2 App Implementation Updates
**File:** `src/App.tsx`

```typescript
// Add profile completion check
const [profileComplete, setProfileComplete] = useState(false)
const [checkingProfile, setCheckingProfile] = useState(true)

useEffect(() => {
  checkProfileCompletion()
  const unsubscribe = profileGuard.subscribeToProfileChanges(setProfileComplete)
  return () => unsubscribe()
}, [user])

// Conditional tab rendering based on profile
const handleTabChange = (tab: string) => {
  if (tab === 'chat' && !profileComplete) {
    showMessage('Please complete your profile first')
    setActiveTab('profile')
    return
  }
  setActiveTab(tab)
}
```

### Phase 4: Update Navigation Components (1 hour)

#### 4.1 Bottom Navigation Updates
**File:** `src/components/BottomNavigation.tsx`

```typescript
interface NavItemProps {
  disabled?: boolean
  locked?: boolean
  tooltip?: string
}

// Show lock icon and tooltip for disabled items
<NavItem
  icon={<MessageCircle />}
  label="Chat"
  disabled={!profileComplete}
  locked={!profileComplete}
  tooltip={!profileComplete ? "Complete your profile to start chatting" : undefined}
/>
```

#### 4.2 Visual Indicators
- Add lock icon overlay for disabled tabs
- Show tooltip on hover/tap explaining why locked
- Use muted colors for disabled state
- Add badge showing "Setup Required"

### Phase 5: User Messaging (30 minutes)

#### 5.1 Onboarding Messages
**File:** `src/components/OnboardingMessage.tsx`

```typescript
describe('OnboardingMessage', () => {
  test('should show for users without profile')
  test('should hide for users with profile')
  test('should link to profile creation')
  test('should be dismissible but reappear')
})

const OnboardingMessage = () => (
  <Alert>
    <Sparkles className="h-4 w-4" />
    <AlertTitle>Welcome to Asonti!</AlertTitle>
    <AlertDescription>
      Create your Future Self profile to start chatting with your AI mentor.
      <Button onClick={goToProfile}>Create Profile</Button>
    </AlertDescription>
  </Alert>
)
```

### Phase 6: End-to-End Tests (30 minutes)

**File:** `e2e/profileEnforcement.spec.ts`

```typescript
describe('Profile Creation Enforcement E2E', () => {
  test('new user flow - forced to create profile')
  test('cannot navigate to chat without profile')
  test('profile completion immediately unlocks chat')
  test('visual indicators show locked state')
  test('messaging guides user to complete profile')
})
```

## Implementation Order

1. **Hour 1:** Write all guard and navigation tests
2. **Hour 2:** Implement ProfileGuard service
3. **Hour 3:** Update App.tsx and navigation components
4. **Hour 4:** Add visual indicators and messaging

## Technical Specifications

### Database Query for Profile Check
```sql
SELECT 
  EXISTS(
    SELECT 1 FROM future_self_profiles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND attributes IS NOT NULL
    AND hope IS NOT NULL
    AND fear IS NOT NULL
  ) as has_complete_profile;
```

### Profile Completion Requirements
- All 24 attributes answered
- Hope and fear provided
- Values selected (current and future)
- Feelings described
- Day in life completed

### Navigation State Management
```typescript
interface NavigationState {
  profileComplete: boolean
  checkingProfile: boolean
  lockedFeatures: string[]
  redirectAfterProfile?: string
}
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users frustrated by locked features | High | Clear messaging explaining why |
| Profile check slows app load | Medium | Cache result, check async |
| Users lose work when redirected | High | Save draft state before redirect |
| False positives blocking access | High | Thorough testing of guard logic |

## Monitoring & Metrics

### Key Metrics
- Profile completion rate (target: >95%)
- Time to profile completion (target: <10 min)
- Drop-off rate at enforcement (target: <5%)
- Support tickets about access (target: <1%)

### Analytics Events
- `profile_enforcement_shown`
- `profile_enforcement_bypassed` (should be 0)
- `profile_started_from_enforcement`
- `profile_completed_from_enforcement`
- `chat_accessed_after_profile`

## Rollback Plan
1. Feature flag to disable enforcement
2. Allow bypass with warning
3. Gradual rollout by user cohort
4. Quick revert via environment variable

## Definition of Done

### Code Complete
- [ ] All guard tests passing
- [ ] Navigation components updated
- [ ] Visual indicators implemented
- [ ] Messaging in place
- [ ] E2E tests passing

### Quality Checks
- [ ] No way to bypass enforcement
- [ ] Clear UX for locked features
- [ ] Profile completion unlocks immediately
- [ ] Performance impact <100ms

### Deployment Ready
- [ ] Feature flag configured
- [ ] Analytics events firing
- [ ] Documentation updated
- [ ] Support team briefed

## Dependencies
- Plan 1 (Database Migration) must be complete ✅
- Profile data must be in Supabase
- ProfileGuard service implemented
- Navigation components support disabled state

## Notes
- This is a critical UX moment - first impression matters
- Clear communication prevents user frustration
- Consider A/B testing enforcement messaging
- Monitor completion rates closely after launch

## Documentation Sources & References

### Official Documentation
1. **React Navigation - Authentication Flows**  
   https://reactnavigation.org/docs/auth-flow/
   
2. **Supabase Auth with React**  
   https://supabase.com/docs/guides/auth/quickstarts/react
   
3. **Supabase Auth Helpers for React**  
   https://supabase.com/docs/guides/auth/auth-helpers/nextjs

### Community Guides & Best Practices
4. **Protected Routes in React Router 6 with Supabase**  
   https://medium.com/@seojeek/protected-routes-in-react-router-6-with-supabase-authentication-and-oauth-599047e08163
   
5. **React Supabase Auth Template with Protected Routes**  
   https://dev.to/mmvergara/react-supabase-auth-template-with-protected-routes-41ib
   
6. **Implementing Effective Onboarding Flow in React**  
   https://radzion.com/blog/onboarding/

### Onboarding Flow Resources
7. **Add Custom Onboarding with Clerk**  
   https://clerk.com/blog/add-onboarding-flow-for-your-application-with-clerk
   
8. **Next.js Custom Onboarding Flow**  
   https://clerk.com/docs/references/nextjs/add-onboarding-flow
   
9. **Step by Step Authentication and Onboarding in React Native**  
   https://saadbashar.com/2021/10/23/step-by-step-guide-to-authentication-and-onboarding-flow-in-react-native/

### Key Takeaways from Sources
- **Conditional Navigation:** Use single Stack with conditional screens (Source 1)
- **Metadata Tracking:** Store onboarding status in publicMetadata (Source 7)
- **Force Redirects:** Use environment variables for forced routes (Source 8)
- **Session Management:** Combine getSession() with onAuthStateChange() (Source 2)
- **Guard Pattern:** Check completion status before rendering protected content (Source 5)
- **Visual Feedback:** Show lock icons and tooltips for disabled features (Source 6)

**Last Verified:** January 27, 2025