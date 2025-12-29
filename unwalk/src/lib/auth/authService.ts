import { supabase } from '../supabase';
import type { User, Session } from '@supabase/supabase-js';
import { getDeviceId } from '../deviceId';
import type { UserProfile } from './types';

/**
 * AuthService - Wrapper dla Supabase Auth
 */
export class AuthService {
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
   * Call this on app startup
   */
  async initGuestUser(): Promise<string | null> {
    try {
      // Check if already authenticated
      const session = await this.getSession();
      if (session) {
        return null; // Already logged in
      }

      // Check if we have cached guest user ID
      if (this.guestUserId) {
        return this.guestUserId;
      }

      const deviceId = getDeviceId();
      
      // Call Supabase function to create/get guest user
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

  /**
   * Get guest user ID (from cache or localStorage)
   */
  getGuestUserId(): string | null {
    return this.guestUserId;
  }

  /**
   * Clear guest user cache (on sign out)
   */
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
   *
   * IMPORTANT: This only works if "Email OTP" is enabled in Supabase Auth settings.
   * If the project is configured for magic links, Supabase will send mail_type: magic_link.
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
      
      // ✅ FIX: After successful OTP verification, update user profile if they were a guest
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id, is_guest')
          .eq('id', data.user.id)
          .single();

        // If user exists and is marked as guest, update to real user
        if (!profileError && profile?.is_guest) {
          console.log('🔄 [Auth] Converting guest to authenticated user...');
          
          const { error: updateError } = await supabase
            .from('users')
            .update({
              is_guest: false,
              email: email,
              display_name: email.split('@')[0],
              updated_at: new Date().toISOString()
            })
            .eq('id', data.user.id);

          if (updateError) {
            console.error('❌ [Auth] Failed to update guest flag:', updateError);
          } else {
            console.log('✅ [Auth] Guest successfully converted to authenticated user');
          }
        }
        
        // If user doesn't exist in users table yet, create profile
        if (profileError && profileError.code === 'PGRST116') {
          console.log('⚠️ [Auth] Creating user profile after OTP verification...');
          
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: email,
              display_name: email.split('@')[0],
              is_guest: false,
              tier: 'pro', // New authenticated users start on pro
              daily_step_goal: 10000,
              onboarding_completed: true,
            });

          if (insertError) {
            console.error('❌ [Auth] Failed to create user profile:', insertError);
          } else {
            console.log('✅ [Auth] User profile created successfully');
          }
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
      console.log('🍎 [Auth] supabase url:', import.meta.env.VITE_SUPABASE_URL);

      // Always use the hosted callback page (custom domain). It immediately deep-links back
      // into the iOS app (movee://auth/callback...) and looks better than a supabase.co page.
      const redirectTo = 'https://movee.one/auth/callback';

      console.log('🍎 [Auth] signInWithApple redirectTo:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo,
        },
      });

      console.log('🍎 [Auth] signInWithApple result:', {
        hasData: !!data,
        url: (data as any)?.url,
        error: error ? { name: error.name, message: error.message } : null,
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
      // Use the same hosted callback page as Apple.
      const redirectTo = 'https://movee.one/auth/callback';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] Google sign-in error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Link Apple identity to the currently signed-in account.
   * Use this when the user is already logged in (e.g., via Email OTP) and wants to connect Apple.
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
      
      // 1. Sign out from Supabase (clears server session)
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 2. Clear guest cache
      this.clearGuestUser();

      // 3. Clear app storage (works on both web and iOS)
      try {
        // Check if running on native platform
        const { Capacitor } = await import('@capacitor/core');
        
        if (Capacitor.isNativePlatform()) {
          // ✅ iOS/Android: Clear Capacitor Preferences
          const { Preferences } = await import('@capacitor/preferences');
          
          console.log('📱 [Auth] Clearing Capacitor storage...');
          
          // Clear all auth-related keys
          await Preferences.remove({ key: 'unwalk-auth' });
          await Preferences.remove({ key: 'sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token' });
          await Preferences.remove({ key: 'unclaimedChallenges' });
          
          console.log('✅ [Auth] Capacitor storage cleared');
        } else {
          // ✅ Web: Clear localStorage
          console.log('🌐 [Auth] Clearing localStorage...');
          localStorage.removeItem('unclaimedChallenges');
          
          // Clear all Supabase auth keys
          const authKeys = Object.keys(localStorage).filter(key => 
            key.includes('supabase') || key.includes('auth-token') || key.includes('unwalk')
          );
          
          authKeys.forEach(key => {
            console.log('🗑️ [Auth] Removing key:', key);
            localStorage.removeItem(key);
          });
          
          console.log('✅ [Auth] localStorage cleared');
        }
      } catch (storageError) {
        console.error('⚠️ [Auth] Storage clear error:', storageError);
        // Don't throw - sign out is more important than clearing storage
      }

      console.log('👋 [Auth] Signed out successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] Sign out error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  /**
   * Get current user (authenticated or guest)
   */
  async getUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }

  /**
   * Get current user profile (extended data)
   * Returns guest profile if not authenticated
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      console.log('🔍 [Auth] getUserProfile: Starting...');

      console.log('🔍 [Auth] Getting session...');
      const sessionResponse = await supabase.auth.getSession();
      console.log('🔍 [Auth] Session response:', {
        hasData: !!sessionResponse.data,
        hasSession: !!sessionResponse.data?.session,
        userId: sessionResponse.data?.session?.user?.id,
        email: sessionResponse.data?.session?.user?.email,
      });

      const session = sessionResponse.data?.session;
      const user = session?.user || null;

      console.log('🔍 [Auth] getUserProfile: User ID:', user?.id, 'Email:', user?.email);

      // ✅ Authenticated user = we have a Supabase user id (email may be null for Apple)
      if (user?.id) {
        console.log('🔍 [Auth] Fetching authenticated user profile...');

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('❌ [Auth] Error fetching user profile:', error);
          throw error;
        }

        if (!data) {
          console.log('⚠️ [Auth] Authenticated user not in users table, creating profile...');

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

          if (insertError) {
            console.error('❌ [Auth] Failed to create user profile:', insertError);
            throw insertError;
          }

          console.log('✅ [Auth] Created user profile:', newUser.email);
          return newUser as UserProfile;
        }

        // If we have an authenticated session but profile is still marked as guest, fix it.
        if (data.is_guest) {
          console.log('🔄 [Auth] Profile is marked as guest but session is authenticated. Fixing...');
          const { data: fixed, error: fixError } = await supabase
            .from('users')
            .update({
              is_guest: false,
              email: data.email ?? user.email ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
            .select()
            .single();

          if (fixError) {
            console.error('❌ [Auth] Failed to fix guest flag:', fixError);
            return data as UserProfile;
          }

          return fixed as UserProfile;
        }

        console.log('✅ [Auth] Authenticated profile loaded:', data.email);
        return data as UserProfile;
      }

      // ✅ Guest user - get by device_id
      const deviceId = getDeviceId();
      console.log('👤 [Auth] Fetching guest profile for device:', deviceId);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('device_id', deviceId)
        .eq('is_guest', true)
        .maybeSingle();

      if (error) {
        console.error('❌ [Auth] Error fetching guest profile:', error);
        throw error;
      }

      if (!data) {
        console.log('⚠️ [Auth] Guest profile not found, creating via RPC...');

        const { data: guestId, error: rpcError } = await supabase.rpc('create_guest_user', {
          p_device_id: deviceId,
        });

        if (rpcError) {
          console.error('❌ [Auth] Error creating guest user:', rpcError);
          throw rpcError;
        }

        if (!guestId) {
          console.error('❌ [Auth] create_guest_user returned null');
          return null;
        }

        const { data: guestData, error: guestError } = await supabase
          .from('users')
          .select('*')
          .eq('id', guestId)
          .single();

        if (guestError) {
          console.error('❌ [Auth] Error fetching newly created guest:', guestError);
          throw guestError;
        }

        console.log('✅ [Auth] Guest profile created and loaded');
        this.guestUserId = guestId;
        return guestData as UserProfile;
      }

      console.log('✅ [Auth] Guest profile found');
      this.guestUserId = data.id;
      return data as UserProfile;
    } catch (error) {
      console.error('❌ [Auth] Get profile error:', error);
      console.error('❌ [Auth] Error stack:', error instanceof Error ? error.stack : 'No stack');
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

      console.log('✅ [Auth] Profile updated');
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] Update profile error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Convert guest to logged user after signup
   * Migrates all guest data to new authenticated account
   */
  async convertGuestToUser(): Promise<{ error: Error | null }> {
    try {
      const user = await this.getUser();
      if (!user || !user.email) {
        throw new Error('No authenticated user found');
      }

      const deviceId = getDeviceId();

      // Call conversion function
      const { error } = await supabase.rpc('convert_guest_to_user', {
        p_device_id: deviceId,
        p_auth_user_id: user.id,
        p_email: user.email
      });

      if (error) throw error;

      // Clear guest cache
      this.clearGuestUser();

      console.log('✅ [Auth] Guest converted to user');
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
   * Delete user account and all associated data
   * This is a permanent action that cannot be undone
   */
  async deleteAccount(): Promise<{ error: Error | null }> {
    try {
      const user = await this.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call RPC function to delete all user data
      const { error: rpcError } = await supabase.rpc('delete_user_account', {
        p_user_id: user.id
      });

      if (rpcError) throw rpcError;

      // Sign out and clear session
      await this.signOut();

      console.log('🗑️ [Auth] Account deleted');
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] Delete account error:', error);
      return { error: error as Error };
    }
  }
}

export const authService = AuthService.getInstance();
