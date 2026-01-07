import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { Session } from '@supabase/supabase-js';
import { getDeviceId } from './deviceId';

/**
 * Sync user session data to native UserDefaults
 * This allows Swift plugins (like HealthKit) to access user data for background sync
 */
export async function syncSessionToNative(session: Session | null): Promise<void> {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    if (!session?.user?.id || !session?.access_token) {
      console.log('⚠️ [NativeSession] No session to sync');
      await clearNativeSession();
      return;
    }

    const userId = session.user.id;
    const accessToken = session.access_token;
    const deviceId = getDeviceId();

    // Get Supabase credentials from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Save to native UserDefaults via Capacitor Preferences
    // HealthKit reads these with "CapacitorStorage." prefix
    await Promise.all([
      Preferences.set({ key: 'user_id', value: userId }),
      Preferences.set({ key: 'access_token', value: accessToken }),
      Preferences.set({ key: 'device_id', value: deviceId }),
      Preferences.set({ key: 'supabase_url', value: supabaseUrl }),
      Preferences.set({ key: 'supabase_anon_key', value: supabaseAnonKey }),
    ]);

    console.log('✅ [NativeSession] Synced to native storage:', {
      userId,
      deviceId,
      hasToken: !!accessToken,
      hasSupabaseConfig: !!(supabaseUrl && supabaseAnonKey),
    });
  } catch (error) {
    console.error('❌ [NativeSession] Failed to sync session:', error);
  }
}

/**
 * Clear user session data from native UserDefaults
 */
export async function clearNativeSession(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await Promise.all([
      Preferences.remove({ key: 'user_id' }),
      Preferences.remove({ key: 'access_token' }),
      Preferences.remove({ key: 'device_id' }),
      Preferences.remove({ key: 'supabase_url' }),
      Preferences.remove({ key: 'supabase_anon_key' }),
    ]);

    console.log('🧹 [NativeSession] Cleared native storage');
  } catch (error) {
    console.error('❌ [NativeSession] Failed to clear session:', error);
  }
}

/**
 * Check if native session is available
 */
export async function hasNativeSession(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const { value: userId } = await Preferences.get({ key: 'user_id' });
    const { value: accessToken } = await Preferences.get({ key: 'access_token' });
    
    return !!(userId && accessToken);
  } catch {
    return false;
  }
}
