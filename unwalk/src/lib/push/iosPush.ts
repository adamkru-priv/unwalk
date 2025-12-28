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
  const profile = await authService.getUserProfile();
  if (!profile?.id) return;

  const payload = {
    user_id: profile.id,
    platform: 'ios' as const,
    token,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('device_push_tokens')
    .upsert(payload, { onConflict: 'token' });

  if (error) throw error;
}

async function registerTokenViaEdgeFunction(token: string, opts?: { forceAuth?: boolean }) {
  const deviceId = getDeviceId();

  // If caller wants to ensure the request is authenticated, attach the current access token.
  // This avoids the function falling back to guest resolution by device_id.
  const headers: Record<string, string> = {};
  if (opts?.forceAuth) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token;
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  const { data, error } = await supabase.functions.invoke('register_push_token', {
    headers,
    body: {
      token,
      platform: 'ios',
      device_id: deviceId,
    },
  });

  if (error) throw error;
  return data;
}

async function saveToken(token: string) {
  if (!token) return;
  lastReceivedApnsToken = token;

  // Coalesce concurrent calls.
  if (inFlightSave) {
    await inFlightSave;
    if (token === lastSavedToken) return;
  }

  if (token === lastSavedToken) return;

  inFlightSave = (async () => {
    await persistTokenLocally(token);

    // Try direct upsert first (works if there is an auth session). Fallback to Edge Function.
    try {
      await upsertTokenDirect(token);
      lastSavedToken = token;
      console.log('✅ [Push] Device token saved (direct)');
      return;
    } catch (e) {
      console.warn('⚠️ [Push] Direct token save failed, falling back to edge function:', e);
    }

    // If we have an authenticated session, force the edge function call to be authenticated
    // so it re-links the token to the logged-in user.
    try {
      const { data } = await supabase.auth.getSession();
      const hasSession = !!data?.session;
      await registerTokenViaEdgeFunction(token, { forceAuth: hasSession });
      lastSavedToken = token;
      console.log('✅ [Push] Device token saved (edge function)');
    } catch (e) {
      console.error('❌ [Push] Failed to save token (edge function):', e);
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

async function pollNativeFallbackToken(opts?: { attempts?: number; intervalMs?: number }) {
  const attempts = opts?.attempts ?? 10;
  const intervalMs = opts?.intervalMs ?? 1000;

  for (let i = 0; i < attempts; i++) {
    const token = await fetchNativeTokenFallback();
    if (token) {
      console.log(`✅ [Push] Native fallback token received (attempt ${i + 1}/${attempts})`);
      await saveToken(token);
      return true;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return false;
}

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

  // Only for native iOS build
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return;

  try {
    console.log('🔔 [Push] initIosPushNotifications starting');

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

    // Register with APNs.
    await PushNotifications.register();
    console.log('🔔 [Push] register() called');

    // If Capacitor fails to deliver the 'registration' event to JS (as seen in logs),
    // fall back to reading the native-saved token from UserDefaults via a custom plugin.
    void pollNativeFallbackToken({ attempts: 15, intervalMs: 1000 });

    // After a few seconds, warn only if we still can't obtain a token.
    setTimeout(() => {
      if (lastReceivedApnsToken) return;
      console.warn(
        '⚠️ [Push] No APNs token received yet via JS registration event. If you see an APNs token in native logs, the plugin event is not reaching JS.',
      );
    }, 5000);

    PushNotifications.addListener('registration', async (token: Token) => {
      console.log(`✅ [Push] registration token received (len=${token.value?.length ?? 0})`);
      await saveToken(token.value); // ← Fix: Use token.value (string) instead of token (object)
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('❌ [Push] registrationError:', err);
    });

    PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
      console.log('📩 [Push] pushNotificationReceived:', notification);
      
      // ✅ Show toast notification when app is in foreground
      // iOS by default doesn't show push notifications when app is active
      if (Capacitor.getPlatform() === 'ios' && notification.title && notification.body) {
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
