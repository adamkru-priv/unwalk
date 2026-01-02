import { supabase } from '../supabase';
import { getDeviceId } from '../deviceId';
import type { TeamInvitation, TeamMember, ChallengeAssignment } from './types';
import { authService } from './authService';

/**
 * TeamService - Team & Challenge Assignment Management
 * Handles team invitations, members, and challenge assignments
 */
class TeamService {
  private static instance: TeamService;

  static getInstance(): TeamService {
    if (!TeamService.instance) {
      TeamService.instance = new TeamService();
    }
    return TeamService.instance;
  }

  // ============================================
  // TEAM INVITATIONS
  // ============================================

  /**
   * Send team invitation
   */
  async sendInvitation(recipientEmail: string, message?: string): Promise<{ error: Error | null }> {
    try {
      const profile = await authService.getUserProfile();
      if (!profile) throw new Error('Not authenticated');

      if (profile.is_guest) {
        throw new Error('Guest users cannot send team invitations. Please sign up first.');
      }

      if (recipientEmail.toLowerCase() === profile.email?.toLowerCase()) {
        throw new Error('You cannot invite yourself');
      }

      const { data: recipient } = await supabase
        .from('users')
        .select('id')
        .eq('email', recipientEmail)
        .maybeSingle();

      let existingQuery = supabase
        .from('team_invitations')
        .select('id, status')
        .eq('sender_id', profile.id)
        .eq('status', 'pending');

      if (recipient?.id) {
        existingQuery = existingQuery.eq('recipient_id', recipient.id);
      } else {
        existingQuery = existingQuery.eq('recipient_email', recipientEmail.toLowerCase());
      }

      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        throw new Error('Invitation already sent to this email');
      }

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
      
      // Send email notification
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        await fetch(`${supabaseUrl}/functions/v1/send-team-invitation`, {
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
      } catch (emailError) {
        console.error('❌ [Team] Email sending error:', emailError);
      }
      
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Send invitation error:', error);
      return { error: error as Error };
    }
  }

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
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Reject invitation error:', error);
      return { error: error as Error };
    }
  }

  async cancelInvitation(invitationId: string): Promise<{ error: Error | null }> {
    try {
      const profile = await authService.getUserProfile();
      if (!profile) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId)
        .eq('sender_id', profile.id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Cancel invitation error:', error);
      return { error: error as Error };
    }
  }

  // ============================================
  // TEAM MEMBERS
  // ============================================

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
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Remove member error:', error);
      return { error: error as Error };
    }
  }

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
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Update member personalization error:', error);
      return { error: error as Error };
    }
  }

  // ============================================
  // TEAM CHALLENGE INVITATIONS
  // ============================================

  /**
   * Cancel team challenge invitation (for team challenges, not regular team invitations)
   */
  async cancelTeamChallengeInvitation(invitationId: string): Promise<{ error: Error | null }> {
    try {
      const user = await authService.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('team_challenge_invitations')
        .delete()
        .eq('id', invitationId)
        .eq('invited_by', user.id); // Only host can cancel

      if (error) throw error;
      console.log('🗑️ [Team] Team challenge invitation cancelled');
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Cancel team challenge invitation error:', error);
      return { error: error as Error };
    }
  }

  // ============================================
  // CHALLENGE ASSIGNMENTS
  // ============================================

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
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Assign challenge error:', error);
      return { error: error as Error };
    }
  }

  async getReceivedChallenges(): Promise<ChallengeAssignment[]> {
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
          sender:sender_id(display_name, nickname, avatar_url),
          challenge:admin_challenge_id(title, goal_steps, image_url)
        `)
        .eq('recipient_id', user.id)
        .eq('status', 'pending')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      const assignments = (data || []).map((item: any) => ({
        id: item.id,
        sender_id: item.sender_id,
        sender_name: item.sender?.nickname || item.sender?.display_name || null,
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

  async acceptChallengeAssignment(assignmentId: string): Promise<{ error: Error | null }> {
    try {
      const user = await authService.getUser();
      if (!user) throw new Error('Not authenticated');

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
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Accept challenge assignment error:', error);
      return { error: error as Error };
    }
  }

  async startChallengeAssignment(assignmentId: string): Promise<{ error: Error | null }> {
    try {
      const user = await authService.getUser();
      if (!user) throw new Error('Not authenticated');

      const profile = await authService.getUserProfile();
      if (!profile) throw new Error('User profile not found');

      const { data: assignment, error: fetchError } = await supabase
        .from('challenge_assignments')
        .select('admin_challenge_id, recipient_id, sender_id, status, user_challenge_id')
        .eq('id', assignmentId)
        .eq('recipient_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!assignment) throw new Error('Assignment not found');
      if (assignment.status !== 'accepted') throw new Error('Challenge must be accepted first');

      if (assignment.user_challenge_id) {
        return { error: null };
      }

      const { data: activeChallenge } = await supabase
        .from('user_challenges')
        .select('id, admin_challenge_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (activeChallenge && activeChallenge.admin_challenge_id !== assignment.admin_challenge_id) {
        throw new Error('You already have an active challenge. Complete or pause it first before starting a new one.');
      }

      const deviceId = profile.device_id || getDeviceId();

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

      if (createError) throw createError;

      const { error: updateError } = await supabase
        .from('challenge_assignments')
        .update({
          user_challenge_id: userChallenge.id,
        })
        .eq('id', assignmentId);

      if (updateError) throw updateError;

      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Start challenge assignment error:', error);
      return { error: error as Error };
    }
  }

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
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Cancel challenge assignment error:', error);
      return { error: error as Error };
    }
  }

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
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Reject challenge assignment error:', error);
      return { error: error as Error };
    }
  }

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
      return { error: null };
    } catch (error) {
      console.error('❌ [Team] Decline challenge error:', error);
      return { error: error as Error };
    }
  }

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
          recipient:recipient_id(display_name, nickname, avatar_url),
          challenge:admin_challenge_id(title, goal_steps, image_url),
          user_challenge:user_challenge_id(current_steps, status)
        `)
        .eq('sender_id', user.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      const assignments = (data || []).map((item: any) => ({
        id: item.id,
        sender_id: item.sender_id,
        recipient_id: item.recipient_id,
        recipient_name: item.recipient?.nickname || item.recipient?.display_name || null,
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
          sender:sender_id(display_name, nickname, avatar_url),
          challenge:admin_challenge_id(title, goal_steps, image_url),
          user_challenge:user_challenge_id(current_steps, status)
        `)
        .eq('recipient_id', user.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      const assignments = (data || []).map((item: any) => ({
        id: item.id,
        sender_id: item.sender_id,
        sender_name: item.sender?.nickname || item.sender?.display_name || null,
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
