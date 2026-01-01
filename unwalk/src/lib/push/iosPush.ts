import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  PushNotifications,
  type PushNotificationSchema,
  type Token,
  type ActionPerformed,
} from '@capacitor/push-notifications';
import { Toast } from '@capacitor/toast';
import { supabase } from '../supabase';
import { authService } from '../auth';
import { getDeviceId } from '../deviceId';

let initialized = false;
let lastSavedToken: string | null = null;
let lastReceivedApnsToken: string | null = null;
let inFlightSave: Promise<void> | null = null;

const TOKEN_STORAGE_KEY = 'apns_device_token';

// ✅ Helper function to add timeout to any promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${errorMsg}`)), timeoutMs)
    )
  ]);
}

// Official Capacitor JS proxy for the native plugin (jsName = "ApnsToken").
// Prefer the already-registered native plugin instance (Capacitor.Plugins.ApnsToken)
// which is populated when the plugin is registered via `packageClassList` on iOS.
const ApnsTokenFallback = registerPlugin<{ getToken: () => Promise<{ token?: string | null }> }>('ApnsToken');

function getApnsTokenPlugin(): { getToken: () => Promise<{ token?: string | null }> } {
  const capAny = Capacitor as any;
  const fromPlugins = capAny?.Plugins?.ApnsToken;
  if (fromPlugins?.getToken) return fromPlugins;
  return ApnsTokenFallback;
}

async function persistTokenLocally(token: string) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

async function upsertTokenDirect(token: string) {
  // Uses RLS (requires auth.uid()); may fail for guests if they have no auth session.
  const profile = await withTimeout(
    authService.getUserProfile(),
    5000,
    'getUserProfile took too long'
  );
  
  if (!profile?.id) return;

  // ✅ Detect platform dynamically
  const platform = Capacitor.getPlatform() as 'ios' | 'android';

  // ✅ FIX: APNs requires lowercase hex tokens
  const normalizedToken = token.toLowerCase();

  const payload = {
    user_id: profile.id,
    platform,
    token: normalizedToken,
    updated_at: new Date().toISOString(),
  };

  // ✅ Wrap Supabase query in timeout
  const result = await withTimeout(
    Promise.resolve(
      supabase
        .from('device_push_tokens')
        .upsert(payload, { onConflict: 'token' })
    ),
    8000,
    'Supabase upsert to device_push_tokens took too long'
  );

  if (result.error) throw result.error;
}

async function registerTokenViaEdgeFunction(token: string, opts?: { forceAuth?: boolean }) {
  const deviceId = getDeviceId();
  
  // ✅ Detect platform dynamically
  const platform = Capacitor.getPlatform() as 'ios' | 'android';

  // If caller wants to ensure the request is authenticated, attach the current access token.
  // This avoids the function falling back to guest resolution by device_id.
  const headers: Record<string, string> = {};
  if (opts?.forceAuth) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token;
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  const { data, error } = await withTimeout(
    supabase.functions.invoke('register_push_token', {
      headers,
      body: {
        token,
        platform,
        device_id: deviceId,
      },
    }),
    10000,
    'Edge function register_push_token took too long'
  );

  if (error) throw error;
  return data;
}

async function saveToken(token: string) {
  console.log('🔔 [Push] saveToken called with token:', {
    hasToken: !!token,
    tokenLength: token?.length,
    tokenPreview: token?.substring(0, 20) + '...',
  });

  if (!token) {
    console.error('❌ [Push] saveToken called with empty token!');
    return;
  }
  
  lastReceivedApnsToken = token;

  // Coalesce concurrent calls.
  if (inFlightSave) {
    console.log('⏳ [Push] Another save in progress, waiting...');
    await inFlightSave;
    if (token === lastSavedToken) {
      console.log('✅ [Push] Token already saved, skipping');
      return;
    }
  }

  if (token === lastSavedToken) {
    console.log('✅ [Push] Token already saved previously, skipping');
    return;
  }

  console.log('🚀 [Push] Starting token save process...');

  inFlightSave = (async () => {
    await persistTokenLocally(token);
    console.log('💾 [Push] Token persisted to localStorage');

    // Try direct upsert first (works if there is an auth session). Fallback to Edge Function.
    try {
      console.log('🔄 [Push] Attempting direct upsert to device_push_tokens...');
      const profile = await authService.getUserProfile();
      console.log('👤 [Push] Got user profile:', {
        hasProfile: !!profile,
        userId: profile?.id,
        email: profile?.email,
        isGuest: profile?.is_guest,
      });

      await upsertTokenDirect(token);
      lastSavedToken = token;
      console.log('✅ [Push] Device token saved (direct) - SUCCESS!');
      return;
    } catch (e) {
      console.error('⚠️ [Push] Direct token save failed:', e);
      console.error('⚠️ [Push] Error details:', {
        message: (e as any)?.message,
        code: (e as any)?.code,
        details: (e as any)?.details,
      });
      console.log('🔄 [Push] Falling back to edge function...');
    }

    // If we have an authenticated session, force the edge function call to be authenticated
    // so it re-links the token to the logged-in user.
    try {
      const { data } = await supabase.auth.getSession();
      const hasSession = !!data?.session;
      console.log('🔐 [Push] Session status:', {
        hasSession,
        userId: data?.session?.user?.id,
      });

      console.log('🌐 [Push] Calling edge function register_push_token...');
      await registerTokenViaEdgeFunction(token, { forceAuth: hasSession });
      lastSavedToken = token;
      console.log('✅ [Push] Device token saved (edge function) - SUCCESS!');
    } catch (e) {
      console.error('❌ [Push] Failed to save token (edge function):', e);
      console.error('❌ [Push] Error details:', {
        message: (e as any)?.message,
        code: (e as any)?.code,
        details: (e as any)?.details,
        stack: (e as any)?.stack,
      });
    }
  })();

  try {
    await inFlightSave;
  } finally {
    inFlightSave = null;
  }
}

async function fetchNativeTokenFallback(): Promise<string | null> {
  try {
    const cap = (globalThis as any).Capacitor as any;
    const pluginKeys = Object.keys(cap?.Plugins ?? {});

    console.log('🔔 [Push] ApnsToken plugin available:', true, {
      isNative: Capacitor.isNativePlatform(),
      platform: Capacitor.getPlatform(),
      capacitorPluginsKeys: pluginKeys,
    });

    const apnsPlugin = getApnsTokenPlugin();
    const res = await apnsPlugin.getToken();
    const token = (res?.token as string | null | undefined) ?? null;

    console.log('🔔 [Push] ApnsToken.getToken result:', {
      hasToken: !!token,
      len: token?.length ?? 0,
    });

    return token && token.length > 0 ? token : null;
  } catch (e: any) {
    // Always log raw error once for diagnosis.
    console.warn('⚠️ [Push] ApnsToken.getToken failed (raw):', {
      message: e?.message,
      code: e?.code,
      data: e?.data,
      error: e,
    });

    const msg = String(e?.message ?? e ?? '');
    // Capacitor throws METHOD_NOT_IMPLEMENTED when the native side isn't registered.
    if (msg.includes('not implemented') || msg.includes('METHOD_NOT_IMPLEMENTED')) {
      console.log('🔔 [Push] ApnsToken.getToken not available');
      return null;
    }

    console.warn('⚠️ [Push] Native token fallback failed:', e);
    return null;
  }
}

// Removed pollNativeFallbackToken - no longer needed as we rely on 'registration' event

/**
 * Re-register push token from localStorage or native storage.
 * Call this on app resume or when you suspect the token may have been invalidated.
 */
export async function reregisterPushToken(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return;

  console.log('🔔 [Push] reregisterPushToken called');

  try {
    // Try to get token from localStorage first
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      console.log('🔔 [Push] Found stored token in localStorage, re-registering...');
      await saveToken(storedToken);
      return;
    }

    // Fallback: try to fetch from native storage
    const nativeToken = await fetchNativeTokenFallback();
    if (nativeToken) {
      console.log('🔔 [Push] Found token in native storage, re-registering...');
      await saveToken(nativeToken);
      return;
    }

    console.warn('⚠️ [Push] No token found to re-register');
  } catch (e) {
    console.error('❌ [Push] reregisterPushToken failed:', e);
  }
}

export async function initIosPushNotifications(): Promise<void> {
  // ✅ FIX: Always try to re-register token on app start, even if already initialized
  // This handles the case where the app was killed and restarted
  if (initialized) {
    console.log('🔔 [Push] Already initialized, re-registering token...');
    void reregisterPushToken();
    return;
  }
  
  initialized = true;

  // ✅ FIXED: Support both iOS and Android
  const platform = Capacitor.getPlatform();
  
  // Only for native platforms (iOS or Android)
  if (!Capacitor.isNativePlatform()) {
    console.log('ℹ️ [Push] Not a native platform, skipping push notifications');
    return;
  }

  try {
    console.log(`🔔 [Push] Initializing push notifications for ${platform}`);

    // ✅ CRITICAL: Add registration listener BEFORE calling register()
    // This ensures we catch the token when it arrives (especially important for Android!)
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('✅ [Push] ⭐️ REGISTRATION EVENT RECEIVED ⭐️');
      console.log('✅ [Push] Token received:', {
        platform,
        hasToken: !!token,
        hasValue: !!token.value,
        length: token.value?.length,
        preview: token.value?.substring(0, 30) + '...'
      });
      
      if (token.value) {
        await saveToken(token.value);
      } else {
        console.error('❌ [Push] Token object received but token.value is empty!', token);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('❌ [Push] registrationError:', err);
    });

    PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
      console.log('📩 [Push] pushNotificationReceived:', notification);
      
      // ✅ Show toast notification when app is in foreground
      // iOS by default doesn't show push notifications when app is active
      if (notification.title && notification.body) {
        console.log('🔔 [Push] Foreground notification received:', {
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
        
        // Show a toast notification to the user
        try {
          await Toast.show({
            text: `${notification.title}\n${notification.body}`,
            duration: 'long',
            position: 'top',
          });
        } catch (e) {
          console.warn('⚠️ [Push] Failed to show toast:', e);
        }
      }
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('➡️ [Push] pushNotificationActionPerformed:', action);
    });

    const permStatus = await PushNotifications.checkPermissions();
    console.log('🔔 [Push] permission status:', permStatus);

    if (permStatus.receive !== 'granted') {
      const req = await PushNotifications.requestPermissions();
      console.log('🔔 [Push] permission request result:', req);
      if (req.receive !== 'granted') {
        console.log('ℹ️ [Push] Permission not granted');
        return;
      }
    }

    // Register with APNs/FCM.
    console.log('🔔 [Push] Calling PushNotifications.register()...');
    await PushNotifications.register();
    console.log('🔔 [Push] PushNotifications.register() completed');

    // ✅ ANDROID FIX: Manually trigger re-check for token (race condition fix)
    // Android FCM generates token very fast, often before JS listener is ready
    // We call register() again after a small delay to ensure listener catches it
    if (platform === 'android') {
      console.log('🔔 [Push] Android detected - will re-register in 1 second to catch token...');
      
      setTimeout(async () => {
        try {
          console.log('🔔 [Push] Android: Calling register() again to trigger event...');
          await PushNotifications.register();
          console.log('🔔 [Push] Android: Second register() call completed');
        } catch (e) {
          console.warn('⚠️ [Push] Android: Second register() call failed:', e);
        }
      }, 1000);
    }

    console.log('🔔 [Push] Waiting for registration event from native...');

    // After 5 seconds, warn if we still don't have a token
    setTimeout(() => {
      if (lastReceivedApnsToken) {
        console.log('✅ [Push] Token successfully received and saved!');
      } else {
        console.error('❌ [Push] NO TOKEN RECEIVED after 5 seconds!');
        console.error('❌ [Push] This means the registration event is not reaching JavaScript.');
        console.error('❌ [Push] Check Xcode logs for APNs token - if it exists there, the bridge is broken.');
      }
    }, 5000);

    // Re-link token on auth changes (guest -> auth, etc.)
    supabase.auth.onAuthStateChange(async (event) => {
      console.log('🔔 [Push] auth state changed:', event);
      const token = lastSavedToken || localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) return;

      // On SIGNED_IN, prefer the Edge Function path after a short delay.
      // This guarantees the request is authenticated and the token is re-linked from guest -> user.
      if (event === 'SIGNED_IN') {
        setTimeout(() => {
          void (async () => {
            try {
              console.log('🔔 [Push] Re-linking token after SIGNED_IN...');
              await registerTokenViaEdgeFunction(token, { forceAuth: true });
              lastSavedToken = token;
              console.log('✅ [Push] Device token re-linked after SIGNED_IN (edge function)');
            } catch (e) {
              console.error('❌ [Push] Failed to re-link token after SIGNED_IN (edge function):', e);
              console.error('❌ [Push] Error details:', {
                message: (e as any)?.message,
                context: (e as any)?.context,
                stack: (e as any)?.stack,
              });
              // Fallback to the normal flow
              await saveToken(token);
            }
          })();
        }, 1500);
        return;
      }

      // After INITIAL_SESSION the session may not be immediately available.
      // Retry shortly to ensure the token is linked to the authenticated user (not the guest).
      if (event === 'INITIAL_SESSION') {
        setTimeout(() => {
          void saveToken(token);
        }, 1500);
        return;
      }

      await saveToken(token);
    });
  } catch (e) {
    console.error('❌ [Push] init failed:', e);
  }
}
