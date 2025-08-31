# Plan 08 Testing Checklist

## Test 1: Fresh Browser (No localStorage)
- [ ] Open Chrome Incognito mode
- [ ] Navigate to http://localhost:3001
- [ ] Should load without errors
- [ ] Check DevTools > Application > localStorage (should be empty except auth)
- [ ] Login and verify app works

## Test 2: Verify Database Loading
- [ ] After login, check Network tab for Supabase requests
- [ ] Profile tab should load data from database
- [ ] Settings should load from database
- [ ] Chat messages should persist after refresh

## Test 3: Offline Behavior
- [ ] Open DevTools > Network > Set to "Offline"
- [ ] Try to send a chat message
- [ ] Should show error message (not break)
- [ ] Try to save settings
- [ ] Should show connection error

## Test 4: Multi-Device Sync
- [ ] Open app in regular browser
- [ ] Open app in incognito with same login
- [ ] Change a setting in one
- [ ] Should NOT sync (Replication not available)

## Test 5: Error States
- [ ] Disconnect internet briefly
- [ ] Try various actions
- [ ] Each should show user-friendly error

## Test 6: Optimistic Updates
- [ ] Send chat message
- [ ] Should appear immediately
- [ ] If fails, should rollback

## Test 7: Performance
- [ ] Clear cache and hard reload
- [ ] Time from login to fully loaded
- [ ] Should be under 2 seconds

## Test 8: localStorage Audit
Run in console:
```javascript
Object.keys(localStorage).forEach(key => {
  if (!key.includes('supabase') && !key.includes('auth')) {
    console.log('Found app data in localStorage:', key);
  }
});
```
Should return nothing.

## ACTUAL RESULTS:
(To be filled after testing)

Test 1: ___________
Test 2: ___________
Test 3: ___________
Test 4: ___________
Test 5: ___________
Test 6: ___________
Test 7: ___________
Test 8: ___________