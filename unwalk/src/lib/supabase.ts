import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Custom storage adapter for Capacitor (iOS/Android)
const capacitorStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: capacitorStorage as any, // Use Capacitor storage on native platforms
    storageKey: 'unwalk-auth',
  },
  global: {
    headers: {
      'x-client-info': Capacitor.isNativePlatform() ? 'unwalk-ios' : 'unwalk-web',
    },
  },
});

// Debug: Log session changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔐 [Supabase] Auth event:', event);
  console.log('🔐 [Supabase] Session exists:', !!session);
  console.log('🔐 [Supabase] User ID:', session?.user?.id);
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('✅ [Supabase] Token refreshed successfully');
  }
  
  if (event === 'SIGNED_OUT') {
    console.log('👋 [Supabase] User signed out');
  }
  
  if (!session && event !== 'SIGNED_OUT' && event !== 'INITIAL_SESSION') {
    console.error('❌ [Supabase] Session lost! Event:', event);
  }
});

// Force session refresh when app resumes (iOS fix)
if (Capacitor.isNativePlatform()) {
  const { App } = await import('@capacitor/app');
  
  App.addListener('appStateChange', async ({ isActive }) => {
    if (isActive) {
      console.log('📱 [Supabase] App resumed, checking session...');
      
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ [Supabase] Failed to get session on resume:', error);
          return;
        }
        
        if (data.session) {
          // Check if token is about to expire (less than 5 minutes left)
          const expiresAt = data.session.expires_at || 0;
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = expiresAt - now;
          
          if (timeUntilExpiry < 300) { // Less than 5 minutes
            console.log('🔄 [Supabase] Token expiring soon, refreshing...');
            const { error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('❌ [Supabase] Failed to refresh session:', refreshError);
            } else {
              console.log('✅ [Supabase] Session refreshed on app resume');
            }
          } else {
            console.log('✅ [Supabase] Session valid, time until expiry:', timeUntilExpiry, 'seconds');
          }
        } else {
          console.log('⚠️ [Supabase] No session found on app resume');
        }
      } catch (err) {
        console.error('❌ [Supabase] Error checking session on resume:', err);
      }
    }
  });
  
  console.log('✅ [Supabase] iOS app state listener registered');
}
