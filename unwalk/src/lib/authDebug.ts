import { supabase } from './supabase';
import { authService } from './auth';

/**
 * Debug helper to diagnose auth issues
 */
export async function debugAuthState() {
  console.log('🔍 [Auth Debug] Starting diagnostic...');
  
  // 1. Check Supabase session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('📋 [Auth Debug] Session:', {
    exists: !!session,
    userId: session?.user?.id,
    email: session?.user?.email,
    expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    error: sessionError
  });
  
  // 2. Check user profile
  const profile = await authService.getUserProfile();
  console.log('👤 [Auth Debug] Profile:', {
    exists: !!profile,
    userId: profile?.id,
    email: profile?.email,
    isGuest: profile?.is_guest,
    tier: profile?.tier,
    deviceId: profile?.device_id
  });
  
  // 3. Check if there's a mismatch
  if (session && profile) {
    if (session.user.id !== profile.id) {
      console.error('❌ [Auth Debug] MISMATCH: Session user ID !== Profile ID!');
    }
    if (session.user.email && profile.is_guest) {
      console.error('❌ [Auth Debug] MISMATCH: User has email but marked as guest!');
    }
  }
  
  // 4. Check database directly
  if (session?.user?.id) {
    const { data: dbProfile, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    console.log('💾 [Auth Debug] Database profile:', {
      exists: !!dbProfile,
      isGuest: dbProfile?.is_guest,
      email: dbProfile?.email,
      tier: dbProfile?.tier,
      error: dbError?.message
    });
  }
  
  console.log('✅ [Auth Debug] Diagnostic complete');
}

// Auto-run on import in dev mode
if (import.meta.env.DEV) {
  setTimeout(() => debugAuthState(), 2000);
}
