import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';
import { getDeviceId } from './deviceId';

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  daily_step_goal: number;
  tier: 'basic' | 'pro';
  onboarding_completed: boolean;
  onboarding_target?: 'self' | 'spouse' | 'child' | 'friend' | null;
  is_guest: boolean;
  device_id: string | null;
  total_points?: number;
  created_at: string;
  updated_at: string;
}

export interface TeamInvitation {
  id: string;
  sender_id: string;
  recipient_email: string;
  recipient_id: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message: string | null;
  invited_at: string;
  responded_at: string | null;
  expires_at: string;
  // Joined data
  sender_name?: string;
  sender_email?: string;
  sender_avatar?: string;
  recipient_name?: string;
  recipient_avatar?: string;
}

export interface TeamMember {
  id: string;
  member_id: string;
  custom_name: string | null;
  relationship: string | null;
  notes: string | null;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  tier: 'basic' | 'pro';
  added_at: string;
  active_challenges_count: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  points: number;
  sort_order: number;
  unlocked_at: string | null;
  unlocked: boolean;
}

export interface ChallengeAssignment {
  id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  recipient_id?: string;
  recipient_name?: string | null;
  recipient_avatar?: string | null;
  admin_challenge_id: string;
  challenge_title: string;
  challenge_goal_steps: number;
  challenge_image_url: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  sent_at: string;
  responded_at: string | null;
  user_challenge_id?: string | null;
  current_steps?: number;
  user_challenge_status?: string | null;
  user_challenge_started_at?: string | null;
  user_challenge_completed_at?: string | null;
}

/**
 * AuthService - Wrapper dla Supabase Auth
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
   * Sign in with OTP (6-digit code)
   */
  async signInWithOTP(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });

      if (error) throw error;

      console.log('🔢 [Auth] OTP sent to:', email);
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
              tier: 'basic', // New authenticated users start on basic
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

      const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor;

      // On native (Capacitor), always redirect back via custom scheme.
      // On web, use the hosted callback page.
      const redirectTo = isNative
        ? 'movee://auth/callback'
        : 'https://movee.one/auth/callback';

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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear guest cache but keep device_id
      this.clearGuestUser();

      // Clear localStorage (remove old unclaimed challenges and other app data)
      localStorage.removeItem('unclaimedChallenges');
      // Note: We keep device_id for guest user re-identification

      console.log('👋 [Auth] Signed out');
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
              tier: 'basic',
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

/**
 * TeamService - Zarządzanie teamem i zaproszeniami
 */
class TeamService {
  private static instance: TeamService;

  static getInstance(): TeamService {
    if (!TeamService.instance) {
      TeamService.instance = new TeamService();
    }
    return TeamService.instance;
  }

  /**
   * Send team invitation
   */
  async sendInvitation(recipientEmail: string, message?: string): Promise<{ error: Error | null }> {
    try {
      // Get current user profile (works for both authenticated and guest users)
      const profile = await authService.getUserProfile();
      if (!profile) throw new Error('Not authenticated');

      // Guest users cannot send invitations
      if (profile.is_guest) {
        throw new Error('Guest users cannot send team invitations. Please sign up first.');
      }

      // Check if user is inviting themselves
      if (recipientEmail.toLowerCase() === profile.email?.toLowerCase()) {
        throw new Error('You cannot invite yourself');
      }

      // Get recipient_id if they're already registered
      const { data: recipient } = await supabase
        .from('users')
        .select('id')
        .eq('email', recipientEmail)
        .maybeSingle();

      // Check if invitation already exists (by email OR recipient_id if known)
      let existingQuery = supabase
        .from('team_invitations')
        .select('id, status')
        .eq('sender_id', profile.id)
        .eq('status', 'pending');

      if (recipient?.id) {
        // User is registered - check by recipient_id
        existingQuery = existingQuery.eq('recipient_id', recipient.id);
      } else {
        // User not registered - check by email
        existingQuery = existingQuery.eq('recipient_email', recipientEmail.toLowerCase());
      }

      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        throw new Error('Invitation already sent to this email');
      }

      // Check if recipient is already in team (if registered)
      if (recipient?.id) {
        const { data: existingMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('user_id', profile.id)
          .eq('member_id', recipient.id)
          .maybeSingle();

        if (existingMember) {
          throw new Error('This user is already in your team');
        }
      }

      // Insert invitation
      const { error } = await supabase
        .from('team_invitations')
        .insert({
          sender_id: profile.id,
          recipient_email: recipientEmail.toLowerCase(),
          recipient_id: recipient?.id || null,
          message: message || null,
        });

      if (error) throw error;

      console.log('✉️ [Team] Invitation sent to:', recipientEmail);
      
      // TODO: Send email notification via Supabase Edge Function
      
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Send invitation error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Get my sent invitations
   */
  async getSentInvitations(): Promise<TeamInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('my_sent_invitations')
        .select('*');

      if (error) throw error;

      return data as TeamInvitation[];
    } catch (error) {
      console.error('❌ [Team] Get sent invitations error:', error);
      return [];
    }
  }

  /**
   * Get my received invitations
   */
  async getReceivedInvitations(): Promise<TeamInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('my_received_invitations')
        .select('*');

      if (error) throw error;

      return data as TeamInvitation[];
    } catch (error) {
      console.error('❌ [Team] Get received invitations error:', error);
      return [];
    }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(invitationId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.rpc('accept_team_invitation', {
        invitation_id: invitationId,
      });

      if (error) throw error;

      console.log('✅ [Team] Invitation accepted');
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Accept invitation error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Reject invitation
   */
  async rejectInvitation(invitationId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      if (error) throw error;

      console.log('❌ [Team] Invitation rejected');
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Reject invitation error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Cancel invitation (sender)
   * Deletes the invitation instead of updating status to avoid unique constraint issues
   */
  async cancelInvitation(invitationId: string): Promise<{ error: Error | null }> {
    try {
      const profile = await authService.getUserProfile();
      if (!profile) throw new Error('Not authenticated');

      // Delete invitation (better than updating status to 'cancelled')
      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId)
        .eq('sender_id', profile.id); // Security: only sender can cancel

      if (error) throw error;

      console.log('🗑️ [Team] Invitation deleted');
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Cancel invitation error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Get my team members
   */
  async getTeamMembers(): Promise<TeamMember[]> {
    try {
      const { data, error } = await supabase
        .from('my_team')
        .select('*');

      if (error) throw error;

      return data as TeamMember[];
    } catch (error) {
      console.error('❌ [Team] Get team members error:', error);
      return [];
    }
  }

  /**
   * Remove team member
   */
  async removeMember(memberId: string): Promise<{ error: Error | null }> {
    try {
      const user = await authService.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', user.id)
        .eq('member_id', memberId);

      if (error) throw error;

      console.log('🗑️ [Team] Member removed');
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Remove member error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Update team member personalization (name, relationship, notes)
   */
  async updateMemberPersonalization(
    teamMemberId: string,
    updates: {
      custom_name?: string;
      relationship?: string;
      notes?: string;
    }
  ): Promise<{ error: Error | null }> {
    try {
      const user = await authService.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('team_members')
        .update(updates)
        .eq('id', teamMemberId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('✅ [Team] Member personalization updated');
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Update member personalization error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Assign challenge to team member
   */
  async assignChallenge(
    recipientId: string,
    challengeId: string,
    message?: string
  ): Promise<{ error: Error | null }> {
    try {
      const user = await authService.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('challenge_assignments')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          admin_challenge_id: challengeId,
          message,
        });

      if (error) throw error;

      console.log('🎯 [Team] Challenge assigned');
      
      // TODO: Send push notification
      
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Assign challenge error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Get received challenge assignments (pending)
   */
  async getReceivedChallenges(): Promise<ChallengeAssignment[]> {
    try {
      const user = await authService.getUser();
      if (!user) {
        console.log('❌ [Team] No user found for getReceivedChallenges');
        return [];
      }

      const { data, error } = await supabase
        .from('challenge_assignments')
        .select(`
          id,
          sender_id,
          recipient_id,
          admin_challenge_id,
          message,
          status,
          sent_at,
          responded_at,
          sender:sender_id(display_name, avatar_url),
          challenge:admin_challenge_id(title, goal_steps, image_url)
        `)
        .eq('recipient_id', user.id)  // ✅ FIXED: Filtr tylko dla odbiorcy!
        .eq('status', 'pending')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Transform data to match ChallengeAssignment interface
      const assignments = (data || []).map((item: any) => ({
        id: item.id,
        sender_id: item.sender_id,
        sender_name: item.sender?.display_name || null,
        sender_avatar: item.sender?.avatar_url || null,
        admin_challenge_id: item.admin_challenge_id,
        challenge_title: item.challenge?.title || 'Unknown Challenge',
        challenge_goal_steps: item.challenge?.goal_steps || 0,
        challenge_image_url: item.challenge?.image_url || '',
        message: item.message,
        status: item.status,
        sent_at: item.sent_at,
        responded_at: item.responded_at,
      }));

      return assignments as ChallengeAssignment[];
    } catch (error) {
      console.error('❌ [Team] Get received challenges error:', error);
      return [];
    }
  }

  /**
   * Get count of pending challenge assignments
   */
  async getPendingChallengesCount(): Promise<number> {
    try {
      const user = await authService.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('challenge_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)  // ✅ FIXED: Filtr tylko dla odbiorcy!
        .eq('status', 'pending');

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('❌ [Team] Get pending challenges count error:', error);
      return 0;
    }
  }

  /**
   * Accept challenge assignment (without starting it immediately)
   */
  async acceptChallengeAssignment(assignmentId: string): Promise<{ error: Error | null }> {
    try {
      const user = await authService.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update assignment status to 'accepted' (but don't create user_challenge yet)
      const { error: updateError } = await supabase
        .from('challenge_assignments')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', assignmentId)
        .eq('recipient_id', user.id)
        .eq('status', 'pending');

      if (updateError) throw updateError;

      console.log('✅ [Team] Challenge assignment accepted (not started yet)');
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Accept challenge assignment error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Start an accepted challenge assignment
   */
  async startChallengeAssignment(assignmentId: string): Promise<{ error: Error | null }> {
    try {
      const user = await authService.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user profile to get device_id
      const profile = await authService.getUserProfile();
      if (!profile) throw new Error('User profile not found');

      // Get assignment details including sender_id
      const { data: assignment, error: fetchError } = await supabase
        .from('challenge_assignments')
        .select('admin_challenge_id, recipient_id, sender_id, status, user_challenge_id')
        .eq('id', assignmentId)
        .eq('recipient_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!assignment) throw new Error('Assignment not found');
      if (assignment.status !== 'accepted') throw new Error('Challenge must be accepted first');

      // ✅ FIX: If challenge already has user_challenge_id, it was already started
      if (assignment.user_challenge_id) {
        console.log('✅ [Team] Challenge already started, skipping creation');
        return { error: null }; // Success - just redirect to dashboard
      }

      // ✅ Check if user already has ANY other DIFFERENT active challenge
      const { data: activeChallenge } = await supabase
        .from('user_challenges')
        .select('id, admin_challenge_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (activeChallenge && activeChallenge.admin_challenge_id !== assignment.admin_challenge_id) {
        throw new Error('You already have an active challenge. Complete or pause it first before starting a new one.');
      }

      // Create user_challenge (start the challenge)
      const { data: userChallenge, error: createError } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          device_id: profile.device_id || getDeviceId(),
          admin_challenge_id: assignment.admin_challenge_id,
          current_steps: 0,
          status: 'active',
          started_at: new Date().toISOString(),
          assigned_by: assignment.sender_id, // ✅ FIX: ID nadawcy, nie odbiorcy!
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update assignment with user_challenge_id
      const { error: updateError } = await supabase
        .from('challenge_assignments')
        .update({
          user_challenge_id: userChallenge.id,
        })
        .eq('id', assignmentId);

      if (updateError) throw updateError;

      console.log('✅ [Team] Challenge assignment started');
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Start challenge assignment error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Cancel challenge assignment (sender only, before it's accepted)
   */
  async cancelChallengeAssignment(assignmentId: string): Promise<{ error: Error | null }> {
    try {
      const user = await authService.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('challenge_assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('sender_id', user.id)
        .eq('status', 'pending'); // Can only cancel pending assignments

      if (error) throw error;

      console.log('🗑️ [Team] Challenge assignment cancelled');
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Cancel challenge assignment error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Reject challenge assignment
   */
  async rejectChallengeAssignment(assignmentId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('challenge_assignments')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (error) throw error;

      console.log('❌ [Team] Challenge assignment rejected');
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Reject challenge assignment error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Decline an already accepted challenge (before starting it)
   * Changes status back to 'rejected'
   */
  async declineChallenge(assignmentId: string): Promise<{ error: Error | null }> {
    try {
      const user = await authService.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('challenge_assignments')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString(),
        })
        .eq('id', assignmentId)
        .eq('recipient_id', user.id)
        .eq('status', 'accepted')
        .is('user_challenge_id', null); // Only if not started yet

      if (error) throw error;

      console.log('🗑️ [Team] Accepted challenge declined');
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Decline challenge error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Get sent challenge assignments (all statuses)
   */
  async getSentChallengeAssignments(): Promise<ChallengeAssignment[]> {
    try {
      const user = await authService.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('challenge_assignments')
        .select(`
          id,
          sender_id,
          recipient_id,
          admin_challenge_id,
          message,
          status,
          sent_at,
          responded_at,
          user_challenge_id,
          recipient:recipient_id(display_name, avatar_url),
          challenge:admin_challenge_id(title, goal_steps, image_url),
          user_challenge:user_challenge_id(current_steps, status)
        `)
        .eq('sender_id', user.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Transform data
      const assignments = (data || []).map((item: any) => ({
        id: item.id,
        sender_id: item.sender_id,
        recipient_id: item.recipient_id,
        recipient_name: item.recipient?.display_name || null,
        recipient_avatar: item.recipient?.avatar_url || null,
        admin_challenge_id: item.admin_challenge_id,
        challenge_title: item.challenge?.title || 'Unknown Challenge',
        challenge_goal_steps: item.challenge?.goal_steps || 0,
        challenge_image_url: item.challenge?.image_url || '',
        message: item.message,
        status: item.status,
        sent_at: item.sent_at,
        responded_at: item.responded_at,
        user_challenge_id: item.user_challenge_id,
        current_steps: item.user_challenge?.current_steps || 0,
        user_challenge_status: item.user_challenge?.status || null,
        user_challenge_started_at: item.user_challenge?.started_at || null,
        user_challenge_completed_at: item.user_challenge?.completed_at || null,
      }));

      return assignments as ChallengeAssignment[];
    } catch (error) {
      console.error('❌ [Team] Get sent challenges error:', error);
      return [];
    }
  }

  /**
   * Get received challenge assignments (all statuses - including active ones)
   */
  async getReceivedChallengeHistory(): Promise<ChallengeAssignment[]> {
    try {
      const user = await authService.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('challenge_assignments')
        .select(`
          id,
          sender_id,
          recipient_id,
          admin_challenge_id,
          message,
          status,
          sent_at,
          responded_at,
          user_challenge_id,
          sender:sender_id(display_name, avatar_url),
          challenge:admin_challenge_id(title, goal_steps, image_url),
          user_challenge:user_challenge_id(current_steps, status)
        `)
        .eq('recipient_id', user.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Transform data
      const assignments = (data || []).map((item: any) => ({
        id: item.id,
        sender_id: item.sender_id,
        sender_name: item.sender?.display_name || null,
        sender_avatar: item.sender?.avatar_url || null,
        admin_challenge_id: item.admin_challenge_id,
        challenge_title: item.challenge?.title || 'Unknown Challenge',
        challenge_goal_steps: item.challenge?.goal_steps || 0,
        challenge_image_url: item.challenge?.image_url || '',
        message: item.message,
        status: item.status,
        sent_at: item.sent_at,
        responded_at: item.responded_at,
        user_challenge_id: item.user_challenge_id,
        current_steps: item.user_challenge?.current_steps || 0,
        user_challenge_status: item.user_challenge?.status || null,
        user_challenge_started_at: item.user_challenge?.started_at || null,
        user_challenge_completed_at: item.user_challenge?.completed_at || null,
      }));

      return assignments as ChallengeAssignment[];
    } catch (error) {
      console.error('❌ [Team] Get received challenge history error:', error);
      return [];
    }
  }
}

/**
 * BadgesService - Zarządzanie badges i achievements
 */
class BadgesService {
  private static instance: BadgesService;

  static getInstance(): BadgesService {
    if (!BadgesService.instance) {
      BadgesService.instance = new BadgesService();
    }
    return BadgesService.instance;
  }

  /**
   * Get all badges with unlocked status for current user
   */
  async getBadges(): Promise<Badge[]> {
    try {
      const { data, error } = await supabase
        .from('my_badges')
        .select('*')
        .order('sort_order');

      if (error) throw error;

      return data as Badge[];
    } catch (error) {
      console.error('❌ [Badges] Get badges error:', error);
      return [];
    }
  }

  /**
   * Get total points from unlocked badges
   */
  async getTotalPoints(): Promise<number> {
    try {
      const badges = await this.getBadges();
      const unlockedBadges = badges.filter(b => b.unlocked);
      return unlockedBadges.reduce((sum, badge) => sum + badge.points, 0);
    } catch (error) {
      console.error('❌ [Badges] Get total points error:', error);
      return 0;
    }
  }

  /**
   * Manually trigger achievement check
   * Called after completing a challenge or updating progress
   */
  async checkAchievements(): Promise<{ newBadgesCount: number; error: Error | null }> {
    try {
      const profile = await authService.getUserProfile();
      if (!profile) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('check_and_unlock_achievements', {
        p_user_id: profile.id
      });

      if (error) throw error;

      const newBadgesCount = data as number;
      
      if (newBadgesCount > 0) {
        console.log(`🎉 [Badges] Unlocked ${newBadgesCount} new badge(s)!`);
      }

      return { newBadgesCount, error: null };
    } catch (error) {
      console.error('❌ [Badges] Check achievements error:', error);
      return { newBadgesCount: 0, error: error as Error };
    }
  }
}

// Export singletons
export const authService = AuthService.getInstance();
export const teamService = TeamService.getInstance();
export const badgesService = BadgesService.getInstance();
