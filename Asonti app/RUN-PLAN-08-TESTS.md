# PLAN 08 COMPLETE TEST SUITE

## Prerequisites
1. Make sure the app is running: `npm run dev:all`
2. Open http://localhost:3001 in Chrome
3. Have a test account ready to login

## TEST EXECUTION INSTRUCTIONS

### Test 1: Fresh Browser (No localStorage)
1. Open Chrome Incognito Mode
2. Navigate to http://localhost:3001
3. Open DevTools Console (F12)
4. Run this command:
```javascript
// Check localStorage is empty
console.log("localStorage keys:", Object.keys(localStorage));
console.log("App data found:", Object.keys(localStorage).filter(k => !k.includes('supabase')));
```
**EXPECTED**: Only Supabase auth keys, no app data

### Test 2: Data Loading from Database
1. Login to the app
2. Open DevTools > Network tab
3. Filter by "supabase"
4. Navigate through Profile, Settings, Chat tabs
5. Look for these requests:
   - `future_self_profiles` 
   - `user_settings`
   - `chat_messages`
   
**EXPECTED**: All three types of requests should appear

### Test 3: Offline Behavior
1. Open DevTools > Network tab
2. Set throttling to "Offline"
3. Try to:
   - Send a chat message
   - Change a setting
   - Refresh the page
   
**EXPECTED**: 
- Error messages appear
- App doesn't crash
- UI remains responsive

### Test 4: Error States
1. While online, open Network tab
2. Right-click a Supabase request > "Block request domain"
3. Try various actions
   
**EXPECTED**: User-friendly error messages, not technical errors

### Test 5: Optimistic Updates (Chat)
1. Open Network tab
2. Set throttling to "Slow 3G"
3. Send a chat message
4. Watch if it appears immediately
   
**EXPECTED**: Message appears instantly, even before server confirms

### Test 6: Performance Test
1. Clear cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Open DevTools Console
4. After page loads, run:
```javascript
const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
console.log(`Page load time: ${loadTime}ms`);
console.log(loadTime < 2000 ? "✅ PASS" : "❌ FAIL");
```
**EXPECTED**: Under 2000ms (2 seconds)

### Test 7: Complete localStorage Audit
After using the app for a few minutes, run:
```javascript
const appData = Object.keys(localStorage).filter(key => 
  !key.includes('supabase') && 
  !key.includes('auth')
);
if (appData.length === 0) {
  console.log("✅ PASS: No app data in localStorage");
} else {
  console.log("❌ FAIL: Found app data:", appData);
}
```
**EXPECTED**: PASS with no app data

## TEST RESULTS RECORD

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| 1. Fresh Browser | | |
| 2. Database Loading | | |
| 3. Offline Behavior | | |
| 4. Error States | | |
| 5. Optimistic Updates | | |
| 6. Performance (<2s) | | |
| 7. localStorage Audit | | |

## FINAL VERDICT: [ ] PASS / [ ] FAIL

## Issues Found:
1. 
2. 
3. 

## Action Items:
1. 
2. 
3.