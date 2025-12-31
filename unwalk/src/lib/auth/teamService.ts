import { supabase } from '../supabase';
import type { Team, TeamInvitation, TeamMember, ChallengeAssignment, TeamChallengeInvitation } from './types';
import { authService } from './authService';

/**
 * TeamService - Team management functionality
 */
export class TeamService {
  private static instance: TeamService;

  static getInstance(): TeamService {
    if (!TeamService.instance) {
      TeamService.instance = new TeamService();
    }
    return TeamService.instance;
  }

  /**
   * Create a new team
   */
  async createTeam(name: string): Promise<{ team: Team | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({ name })
        .select('*')
        .single();

      if (error) throw error;

      console.log('✅ [Team] Created team:', name);
      return { team: data as Team, error: null };
    } catch (error) {
      console.error('❌ [Team] Create team error:', error);
      return { team: null, error: error as Error };
    }
  }

  /**
   * Get user's teams
   */
  async getUserTeams(userId: string): Promise<{ teams: Team[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members!inner(user_id)
        `)
        .eq('team_members.user_id', userId);

      if (error) throw error;

      return { teams: data as Team[], error: null };
    } catch (error) {
      console.error('❌ [Team] Get teams error:', error);
      return { teams: [], error: error as Error };
    }
  }

  /**
   * Invite user to team
   */
  async inviteToTeam(teamId: string, email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.rpc('invite_user_to_team', {
        p_team_id: teamId,
        p_invited_email: email,
      });

      if (error) throw error;

      console.log('✉️ [Team] Invitation sent to:', email);
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Invite error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Get pending invitations for current user
   */
  async getPendingInvitations(email: string): Promise<{ invitations: TeamInvitation[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select(`
          *,
          teams!inner(name),
          inviter:users!team_invitations_inviter_id_fkey(display_name)
        `)
        .eq('invited_email', email)
        .eq('status', 'pending');

      if (error) throw error;

      return { invitations: data as TeamInvitation[], error: null };
    } catch (error) {
      console.error('❌ [Team] Get invitations error:', error);
      return { invitations: [], error: error as Error };
    }
  }

  /**
   * Accept team invitation
   */
  async acceptInvitation(invitationId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.rpc('accept_team_invitation', {
        p_invitation_id: invitationId,
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
   * Reject team invitation
   */
  async rejectInvitation(invitationId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'rejected' })
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
   * Leave team
   */
  async leaveTeam(teamId: string, userId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;

      console.log('👋 [Team] Left team');
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Leave team error:', error);
      return { error: error as Error };
    }
  }

  /**
   * Delete team (creator only)
   */
  async deleteTeam(teamId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      console.log('🗑️ [Team] Team deleted');
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Delete team error:', error);
      return { error: error as Error };
    }
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
      const { data: newInvitation, error: insertError } = await supabase
        .from('team_invitations')
        .insert({
          sender_id: profile.id,
          recipient_email: recipientEmail.toLowerCase(),
          recipient_id: recipient?.id || null,
          message: message || null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      console.log('✉️ [Team] Invitation sent to:', recipientEmail);
      
      // Send email notification via Resend Edge Function
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-team-invitation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            recipientEmail,
            senderName: profile.display_name || profile.email?.split('@')[0] || 'Someone',
            senderEmail: profile.email,
            message,
            invitationId: newInvitation.id,
          }),
        });

        if (!emailResponse.ok) {
          console.error('❌ [Team] Failed to send invitation email:', await emailResponse.text());
        } else {
          console.log('📧 [Team] Invitation email sent successfully');
        }
      } catch (emailError) {
        console.error('❌ [Team] Email sending error:', emailError);
      }
      
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
   * Get received team challenge invitations (NEW - for team challenges)
   */
  async getTeamChallengeInvitations(): Promise<TeamChallengeInvitation[]> {
    try {
      const user = await authService.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('team_challenge_invitations')
        .select(`
          id,
          invited_by,
          invited_user,
          challenge_id,
          status,
          invited_at,
          responded_at,
          sender:users!team_challenge_invitations_invited_by_fkey(display_name, email, avatar_url),
          challenge:admin_challenges!team_challenge_invitations_challenge_id_fkey(title, icon, goal_steps, time_limit_hours)
        `)
        .eq('invited_user', user.id)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (error) throw error;

      // Transform data
      const invitations = (data || []).map((item: any) => ({
        id: item.id,
        invited_by: item.invited_by,
        invited_user: item.invited_user,
        challenge_id: item.challenge_id,
        status: item.status,
        invited_at: item.invited_at,
        responded_at: item.responded_at,
        sender_name: item.sender?.display_name || null,
        sender_email: item.sender?.email || null,
        sender_avatar: item.sender?.avatar_url || null,
        challenge_title: item.challenge?.title || 'Unknown Challenge',
        challenge_icon: item.challenge?.icon || '🎯',
        challenge_goal_steps: item.challenge?.goal_steps || 0,
        challenge_time_limit_hours: item.challenge?.time_limit_hours || 0,
      }));

      return invitations as TeamChallengeInvitation[];
    } catch (error) {
      console.error('❌ [Team] Get team challenge invitations error:', error);
      return [];
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
   * Cancel team challenge invitation (sender only)
   * Deletes the team challenge invitation
   */
  async cancelTeamChallengeInvitation(invitationId: string): Promise<{ error: Error | null }> {
    try {
      const user = await authService.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete invitation - only sender can cancel
      const { error } = await supabase
        .from('team_challenge_invitations')
        .delete()
        .eq('id', invitationId)
        .eq('invited_by', user.id) // Security: only sender can cancel
        .eq('status', 'pending'); // Can only cancel pending invitations

      if (error) throw error;

      console.log('🗑️ [Team] Team challenge invitation cancelled');
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Cancel team challenge invitation error:', error);
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
   * Also updates the user's display_name in users table if custom_name is provided
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

      // 🎯 NEW: Get member_id from team_members to update their display_name
      const { data: teamMember, error: fetchError } = await supabase
        .from('team_members')
        .select('member_id')
        .eq('id', teamMemberId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!teamMember) throw new Error('Team member not found');

      // Update team_members table (custom_name, relationship, notes)
      const { error } = await supabase
        .from('team_members')
        .update(updates)
        .eq('id', teamMemberId)
        .eq('user_id', user.id);

      if (error) throw error;

      // 🎯 NEW: If custom_name is provided, also update users.display_name
      if (updates.custom_name && updates.custom_name.trim()) {
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ display_name: updates.custom_name.trim() })
          .eq('id', teamMember.member_id);

        if (userUpdateError) {
          console.error('⚠️ [Team] Failed to update user display_name:', userUpdateError);
          // Don't throw - team_members update succeeded, this is just a nice-to-have
        } else {
          console.log('✅ [Team] Updated user display_name:', updates.custom_name);
        }
      }

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
        .eq('recipient_id', user.id)
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
        .eq('recipient_id', user.id)
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

      // If challenge already has user_challenge_id, it was already started
      if (assignment.user_challenge_id) {
        console.log('✅ [Team] Challenge already started, skipping creation');
        return { error: null };
      }

      // Check if user already has ANY other DIFFERENT active challenge
      const { data: activeChallenge } = await supabase
        .from('user_challenges')
        .select('id, admin_challenge_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (activeChallenge && activeChallenge.admin_challenge_id !== assignment.admin_challenge_id) {
        throw new Error('You already have an active challenge. Complete or pause it first before starting a new one.');
      }

      // Cast all IDs explicitly as text to avoid UUID casting errors
      const deviceId = profile.device_id || crypto.randomUUID();
      
      console.log('🔍 [Team] Creating user_challenge with:', {
        user_id: user.id,
        device_id: deviceId,
        admin_challenge_id: assignment.admin_challenge_id,
        assigned_by: assignment.sender_id,
      });

      // Create user_challenge (start the challenge)
      const { data: userChallenge, error: createError } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          device_id: deviceId,
          admin_challenge_id: assignment.admin_challenge_id,
          current_steps: 0,
          status: 'active',
          started_at: new Date().toISOString(),
          assigned_by: assignment.sender_id,
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ [Team] Create user_challenge error:', createError);
        throw createError;
      }

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
        .eq('status', 'pending');

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
        .is('user_challenge_id', null);

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

export const teamService = TeamService.getInstance();
