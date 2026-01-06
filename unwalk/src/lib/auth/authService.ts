import { supabase } from '../supabase';
import type { User, Session } from '@supabase/supabase-js';
import { getDeviceId } from '../deviceId';
import type { UserProfile } from './types';
import { clearNativeSession } from '../nativeSession';

/**
 * AuthService - Authentication & User Profile Management
 * Handles sign in/out, OAuth, guest users, and profile operations
 */
class AuthService {
  private static instance: AuthService;
  private guestUserId: string | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize guest user (create in DB if not exists)
   */
  async initGuestUser(): Promise<string | null> {
    try {
      const session = await this.getSession();
      if (session) return null;

      if (this.guestUserId) return this.guestUserId;

      const deviceId = getDeviceId();
      const { data, error } = await supabase.rpc('create_guest_user', {
        p_device_id: deviceId
      });

      if (error) throw error;

      this.guestUserId = data as string;
      console.log('✅ [Auth] Guest user initialized:', this.guestUserId);
      
      return this.guestUserId;
    } catch (error) {
      console.error('❌ [Auth] Init guest user error:', error);
      return null;
    }
  }

  getGuestUserId(): string | null {
    return this.guestUserId;
  }

  clearGuestUser(): void {
    this.guestUserId = null;
  }

  /**
   * Sign in with Magic Link (email link)
   */
  async signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      console.log('✉️ [Auth] Magic link sent to:', email);
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] Magic link error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Sign in with OTP (email code)
   */
  async signInWithOTP(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;
      console.log('🔢 [Auth] OTP requested for:', email);
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] OTP error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(email: string, token: string): Promise<{ session: Session | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;
      console.log('✅ [Auth] OTP verified for:', email);
      
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id, is_guest')
          .eq('id', data.user.id)
          .single();

        if (!profileError && profile?.is_guest) {
          console.log('🔄 [Auth] Converting guest to authenticated user...');
          
          await supabase
            .from('users')
            .update({
              is_guest: false,
              email: email,
              display_name: email.split('@')[0],
              updated_at: new Date().toISOString()
            })
            .eq('id', data.user.id);
        }
        
        if (profileError && profileError.code === 'PGRST116') {
          console.log('⚠️ [Auth] Creating user profile after OTP verification...');
          
          await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: email,
              display_name: email.split('@')[0],
              is_guest: false,
              tier: 'pro',
              daily_step_goal: 10000,
              onboarding_completed: true,
            });
        }
      }
      
      return { session: data.session, error: null };
    } catch (error) {
      console.error('❌ [Auth] OTP verification error:', error);
      return { session: null, error: error as Error };
    }
  }

  /**
   * Sign in with Apple (OAuth)
   */
  async signInWithApple(): Promise<{ error: Error | null }> {
    try {
      console.log('🍎 [Auth] signInWithApple: starting');

      let isNative = false;
      try {
        const { Capacitor } = await import('@capacitor/core');
        isNative = Capacitor.isNativePlatform();
      } catch {
        isNative = false;
      }

      const redirectTo = isNative 
        ? 'https://movee.one/auth/callback'
        : window.location.origin + '/app/';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] Apple sign-in error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Sign in with Google (OAuth)
   */
  async signInWithGoogle(): Promise<{ error: Error | null }> {
    try {
      let isNative = false;
      try {
        const { Capacitor } = await import('@capacitor/core');
        isNative = Capacitor.isNativePlatform();
      } catch {
        isNative = false;
      }

      const redirectTo = isNative 
        ? 'https://movee.one/auth/callback'
        : window.location.origin + '/app/';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] Google sign-in error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Link Apple identity to current account
   */
  async linkApple(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.linkIdentity({ provider: 'apple' });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] Apple link error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ error: Error | null }> {
    try {
      console.log('🚪 [Auth] Starting sign out...');
      
      this.clearGuestUser();

      // Clear native session data for Swift plugins
      await clearNativeSession();

      try {
        const { Capacitor } = await import('@capacitor/core');
        
        if (Capacitor.isNativePlatform()) {
          const { Preferences } = await import('@capacitor/preferences');
          
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || '';
          
          const keysToRemove = [
            'unwalk-auth',
            `sb-${projectRef}-auth-token`,
            'unclaimedChallenges',
            'push_device_token',
            'apns_device_token',
          ];
          
          await Promise.all(
            keysToRemove.map(async (key) => {
              try {
                await Preferences.remove({ key });
              } catch (e) {
                console.warn('⚠️ [Auth] Failed to remove key:', key, e);
              }
            })
          );
          
          await Preferences.clear();
        } else {
          localStorage.removeItem('unclaimedChallenges');
          localStorage.removeItem('push_device_token');
          localStorage.removeItem('apns_device_token');
          
          const authKeys = Object.keys(localStorage).filter(key => 
            key.includes('supabase') || key.includes('auth-token') || key.includes('unwalk') || key.includes('sb-')
          );
          
          authKeys.forEach(key => localStorage.removeItem(key));
        }
      } catch (storageError) {
        console.error('⚠️ [Auth] Storage clear error:', storageError);
        throw new Error('Failed to clear local storage: ' + (storageError as Error).message);
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      console.log('👋 [Auth] Signed out successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] Sign out error:', error);
      return { error: error as Error };
    }
  }

  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  async getUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }

  /**
   * Get current user profile
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const sessionResponse = await supabase.auth.getSession();
      const session = sessionResponse.data?.session;
      const user = session?.user || null;

      if (user?.id) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          const email = user.email || null;
          const displayName = email ? email.split('@')[0] : 'User';

          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email,
              display_name: displayName,
              is_guest: false,
              tier: 'pro',
              daily_step_goal: 10000,
              onboarding_completed: true,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          return newUser as UserProfile;
        }

        if (data.is_guest) {
          const { data: fixed } = await supabase
            .from('users')
            .update({
              is_guest: false,
              email: data.email ?? user.email ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
            .select()
            .single();

          return (fixed || data) as UserProfile;
        }

        return data as UserProfile;
      }

      // Guest user
      const deviceId = getDeviceId();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('device_id', deviceId)
        .eq('is_guest', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: guestId, error: rpcError } = await supabase.rpc('create_guest_user', {
          p_device_id: deviceId,
        });

        if (rpcError) throw rpcError;
        if (!guestId) return null;

        const { data: guestData, error: guestError } = await supabase
          .from('users')
          .select('*')
          .eq('id', guestId)
          .single();

        if (guestError) throw guestError;

        this.guestUserId = guestId;
        return guestData as UserProfile;
      }

      this.guestUserId = data.id;
      return data as UserProfile;
    } catch (error) {
      console.error('❌ [Auth] Get profile error:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<{ error: Error | null }> {
    try {
      const user = await this.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] Update profile error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Convert guest to authenticated user
   */
  async convertGuestToUser(): Promise<{ error: Error | null }> {
    try {
      const user = await this.getUser();
      if (!user || !user.email) {
        throw new Error('No authenticated user found');
      }

      const deviceId = getDeviceId();

      const { error } = await supabase.rpc('convert_guest_to_user', {
        p_device_id: deviceId,
        p_auth_user_id: user.id,
        p_email: user.email
      });

      if (error) throw error;

      this.clearGuestUser();
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] Convert guest error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<{ error: Error | null }> {
    try {
      const user = await this.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: rpcError } = await supabase.rpc('delete_user_account', {
        p_user_id: user.id
      });

      if (rpcError) throw rpcError;

      await this.signOut();
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] Delete account error:', error);
      return { error: error as Error };
    }
  }
}

export const authService = AuthService.getInstance();
