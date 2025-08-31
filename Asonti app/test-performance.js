// Performance test for Plan 08
// Run in browser console after login

function testPerformance() {
    console.log("=== PERFORMANCE TEST ===\n");
    
    const metrics = {
        pageLoad: 0,
        firstContentfulPaint: 0,
        domContentLoaded: 0,
        supabaseRequests: [],
        totalLoadTime: 0,
        passed: false
    };
    
    // Get navigation timing
    const perfData = performance.getEntriesByType("navigation")[0];
    
    if (perfData) {
        metrics.pageLoad = perfData.loadEventEnd - perfData.fetchStart;
        metrics.domContentLoaded = perfData.domContentLoadedEventEnd - perfData.fetchStart;
        
        console.log(`Page Load Time: ${(metrics.pageLoad / 1000).toFixed(2)}s`);
        console.log(`DOM Content Loaded: ${(metrics.domContentLoaded / 1000).toFixed(2)}s`);
    }
    
    // Get paint timing
    const paintEntries = performance.getEntriesByType("paint");
    const fcp = paintEntries.find(entry => entry.name === "first-contentful-paint");
    
    if (fcp) {
        metrics.firstContentfulPaint = fcp.startTime;
        console.log(`First Contentful Paint: ${(metrics.firstContentfulPaint / 1000).toFixed(2)}s`);
    }
    
    // Get Supabase request timings
    const resources = performance.getEntriesByType("resource");
    const supabaseReqs = resources.filter(r => r.name.includes('supabase'));
    
    console.log(`\nSupabase Requests (${supabaseReqs.length} total):`);
    supabaseReqs.forEach(req => {
        const duration = req.responseEnd - req.startTime;
        metrics.supabaseRequests.push(duration);
        console.log(`  - ${req.name.split('/').pop()}: ${duration.toFixed(0)}ms`);
    });
    
    // Calculate total load time (until all critical resources loaded)
    const criticalResources = resources.filter(r => 
        r.name.includes('supabase') || 
        r.name.includes('.js') || 
        r.name.includes('.css')
    );
    
    const lastResourceTime = Math.max(...criticalResources.map(r => r.responseEnd || 0));
    metrics.totalLoadTime = lastResourceTime;
    
    console.log(`\n=== RESULTS ===`);
    console.log(`Total Load Time: ${(metrics.totalLoadTime / 1000).toFixed(2)}s`);
    
    // Check if under 2 seconds
    metrics.passed = metrics.totalLoadTime < 2000;
    
    if (metrics.passed) {
        console.log("✅ PASS: Load time under 2 seconds!");
    } else {
        console.log("❌ FAIL: Load time exceeds 2 seconds");
        console.log(`   Exceeded by: ${((metrics.totalLoadTime - 2000) / 1000).toFixed(2)}s`);
    }
    
    // Recommendations
    if (!metrics.passed) {
        console.log("\nRecommendations:");
        if (metrics.supabaseRequests.length > 5) {
            console.log("  - Too many Supabase requests, consider batching");
        }
        if (Math.max(...metrics.supabaseRequests) > 500) {
            console.log("  - Some Supabase requests are slow (>500ms)");
        }
        console.log("  - Consider implementing caching");
        console.log("  - Consider lazy loading non-critical data");
    }
    
    return metrics;
}

// Run test
testPerformance();