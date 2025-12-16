import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'unwalk-auth',
  },
  global: {
    headers: {
      'x-client-info': 'unwalk-web',
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
