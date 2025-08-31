// Test script to verify Supabase data loading
// Run this in the browser console after logging in

async function testSupabaseLoading() {
    console.log("=== TESTING SUPABASE DATA LOADING ===\n");
    
    const tests = {
        profileLoading: false,
        settingsLoading: false,
        messagesLoading: false,
        errors: []
    };
    
    // Test 1: Check if profile loads from Supabase
    try {
        const profileRequests = performance.getEntriesByType("resource")
            .filter(r => r.name.includes('future_self_profiles'));
        
        if (profileRequests.length > 0) {
            console.log("✅ Profile data requested from Supabase");
            tests.profileLoading = true;
        } else {
            console.log("❌ No profile requests to Supabase found");
        }
    } catch (e) {
        tests.errors.push(`Profile test error: ${e.message}`);
    }
    
    // Test 2: Check if settings load from Supabase
    try {
        const settingsRequests = performance.getEntriesByType("resource")
            .filter(r => r.name.includes('user_settings'));
        
        if (settingsRequests.length > 0) {
            console.log("✅ Settings data requested from Supabase");
            tests.settingsLoading = true;
        } else {
            console.log("❌ No settings requests to Supabase found");
        }
    } catch (e) {
        tests.errors.push(`Settings test error: ${e.message}`);
    }
    
    // Test 3: Check if messages load from Supabase
    try {
        const messageRequests = performance.getEntriesByType("resource")
            .filter(r => r.name.includes('chat_messages'));
        
        if (messageRequests.length > 0) {
            console.log("✅ Chat messages requested from Supabase");
            tests.messagesLoading = true;
        } else {
            console.log("❌ No message requests to Supabase found");
        }
    } catch (e) {
        tests.errors.push(`Messages test error: ${e.message}`);
    }
    
    // Test 4: Check localStorage for app data
    const appDataInLocalStorage = Object.keys(localStorage)
        .filter(key => !key.includes('supabase') && !key.includes('auth'));
    
    if (appDataInLocalStorage.length === 0) {
        console.log("✅ No app data in localStorage");
    } else {
        console.log("❌ Found app data in localStorage:", appDataInLocalStorage);
        tests.errors.push(`App data in localStorage: ${appDataInLocalStorage.join(', ')}`);
    }
    
    // Summary
    console.log("\n=== TEST SUMMARY ===");
    const passed = tests.profileLoading && tests.settingsLoading && tests.messagesLoading && tests.errors.length === 0;
    
    if (passed) {
        console.log("✅ ALL TESTS PASSED - Data loading from Supabase correctly!");
    } else {
        console.log("❌ TESTS FAILED:");
        if (!tests.profileLoading) console.log("  - Profile not loading from Supabase");
        if (!tests.settingsLoading) console.log("  - Settings not loading from Supabase");
        if (!tests.messagesLoading) console.log("  - Messages not loading from Supabase");
        tests.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    return tests;
}

// Run the test
testSupabaseLoading();