import { supabase } from './supabase';

/**
 * Auth Heartbeat - keeps session alive by refreshing token periodically
 * This is a backup mechanism in case auto-refresh fails
 */

let heartbeatInterval: number | null = null;
let lastCheck: number = 0;

const CHECK_INTERVAL = 120000; // 2 minutes (120 seconds)
const REFRESH_BEFORE_EXPIRY = 300; // Refresh 5 minutes before expiry

async function checkAndRefreshSession() {
  try {
    const now = Math.floor(Date.now() / 1000);
    
    // Prevent multiple simultaneous checks
    if (now - lastCheck < 60) {
      console.log('⏭️ [Heartbeat] Skipping check (too soon)');
      return;
    }
    
    lastCheck = now;
    
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ [Heartbeat] Failed to get session:', error);
      return;
    }
    
    if (!session) {
      console.log('👤 [Heartbeat] No active session');
      return;
    }
    
    const expiresAt = session.expires_at || 0;
    const timeToExpiry = expiresAt - now;
    
    console.log(`💓 [Heartbeat] Session check - expires in ${timeToExpiry}s`);
    
    // If session expires in less than 5 minutes, refresh it
    if (timeToExpiry < REFRESH_BEFORE_EXPIRY) {
      console.log('🔄 [Heartbeat] Token expiring soon, refreshing...');
      
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('❌ [Heartbeat] Failed to refresh session:', refreshError);
        return;
      }
      
      if (refreshData.session) {
        console.log('✅ [Heartbeat] Session refreshed successfully');
        console.log(`✅ [Heartbeat] New expiry: ${refreshData.session.expires_at}`);
      }
    } else {
      console.log(`✅ [Heartbeat] Session healthy (${Math.floor(timeToExpiry / 60)}m remaining)`);
    }
  } catch (error) {
    console.error('❌ [Heartbeat] Unexpected error:', error);
  }
}

/**
 * Start the heartbeat - checks session every 2 minutes
 */
export function startAuthHeartbeat() {
  if (heartbeatInterval) {
    console.log('⚠️ [Heartbeat] Already running');
    return;
  }
  
  console.log('💓 [Heartbeat] Starting auth heartbeat (2 min interval)');
  
  // Run first check immediately
  checkAndRefreshSession();
  
  // Then run every 2 minutes
  heartbeatInterval = setInterval(checkAndRefreshSession, CHECK_INTERVAL);
}

/**
 * Stop the heartbeat
 */
export function stopAuthHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('🛑 [Heartbeat] Stopped');
  }
}

// Auto-start in browser
if (typeof window !== 'undefined') {
  // Wait a bit for app to initialize
  setTimeout(startAuthHeartbeat, 5000);
}
