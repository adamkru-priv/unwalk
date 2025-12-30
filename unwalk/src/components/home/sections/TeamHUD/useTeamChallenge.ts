import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { teamService } from '../../../../lib/auth/teamService';
import type { PendingChallenge } from './types';

export function useTeamChallenge(_teamChallenge: any | null) {
  const [pendingChallenge, setPendingChallenge] = useState<PendingChallenge | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadPendingChallenge = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔍 [useTeamChallenge] Loading pending challenges for user:', user.id);

      // 🎯 FIX: Load both sent and received pending invitations
      // 1. Invitations sent BY the user (they are the host)
      const { data: sentInvites, error: sentError } = await supabase
        .from('team_challenge_invitations')
        .select(`
          id,
          status,
          invited_at,
          challenge_id,
          invited_user,
          invited_by
        `)
        .eq('invited_by', user.id)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (sentError) throw sentError;

      // 2. Invitations received BY the user (they are invited)
      const { data: receivedInvites, error: receivedError } = await supabase
        .from('team_challenge_invitations')
        .select(`
          id,
          status,
          invited_at,
          challenge_id,
          invited_user,
          invited_by
        `)
        .eq('invited_user', user.id)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (receivedError) throw receivedError;

      console.log('📊 [useTeamChallenge] Sent invitations:', sentInvites?.length || 0);
      console.log('📊 [useTeamChallenge] Received invitations:', receivedInvites?.length || 0);

      // Prioritize received invitations (user is invited)
      const primaryInvites = receivedInvites && receivedInvites.length > 0 
        ? receivedInvites 
        : sentInvites;

      if (!primaryInvites || primaryInvites.length === 0) {
        console.log('⚠️ [useTeamChallenge] No pending invitations found');
        setPendingChallenge(null);
        return;
      }

      const isHost = primaryInvites === sentInvites;
      const latestInvite = primaryInvites[0];
      const challengeId = latestInvite.challenge_id;

      console.log('🎯 [useTeamChallenge] User is:', isHost ? 'HOST' : 'INVITED');

      // Fetch challenge details
      const { data: challengeData, error: challengeError } = await supabase
        .from('admin_challenges')
        .select('id, title, goal_steps, time_limit_hours, points')
        .eq('id', challengeId)
        .single();

      if (challengeError) {
        console.error('❌ [useTeamChallenge] Failed to load challenge details:', challengeError);
        return;
      }

      // 🎯 NEW: If user is invited, load ALL invitations for this challenge to show who else is in
      let allChallengeInvites = primaryInvites;
      if (!isHost) {
        const { data: allInvites, error: allError } = await supabase
          .from('team_challenge_invitations')
          .select(`
            id,
            status,
            invited_at,
            challenge_id,
            invited_user,
            invited_by
          `)
          .eq('challenge_id', challengeId);

        if (!allError && allInvites) {
          allChallengeInvites = allInvites;
          console.log('📊 [useTeamChallenge] All challenge invitations:', allInvites.length);
        }
      }

      // Get all unique user IDs (invited users + host)
      const userIds = new Set<string>();
      allChallengeInvites.forEach(inv => {
        userIds.add(inv.invited_user);
        userIds.add(inv.invited_by);
      });

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .in('id', Array.from(userIds));

      if (usersError) {
        console.error('⚠️ [useTeamChallenge] Failed to load user details:', usersError);
      }

      // Create user lookup map
      const userMap = new Map(usersData?.map(u => [u.id, u]) || []);

      const challengeInfo: PendingChallenge = {
        challenge_id: challengeId,
        title: challengeData.title,
        goal_steps: challengeData.goal_steps,
        time_limit_hours: challengeData.time_limit_hours || 24,
        points: challengeData.points || 0,
        invitations: [],
        acceptedCount: 0,
        pendingCount: 0,
        currentUserId: user.id,
        isHost: isHost,
        hostId: latestInvite.invited_by
      };

      // Add invitations
      allChallengeInvites.forEach((inv: any) => {
        const invitedUserData = userMap.get(inv.invited_user);
        challengeInfo.invitations.push({
          id: inv.id,
          status: inv.status,
          invited_at: inv.invited_at,
          invited_user: invitedUserData || { 
            id: inv.invited_user, 
            display_name: 'Unknown User', 
            avatar_url: null 
          }
        });

        if (inv.status === 'accepted') challengeInfo.acceptedCount++;
        if (inv.status === 'pending') challengeInfo.pendingCount++;
      });

      console.log('✅ [useTeamChallenge] Challenge data prepared:', challengeInfo);
      setPendingChallenge(challengeInfo);
    } catch (error) {
      console.error('❌ [useTeamChallenge] Failed to load pending challenge:', error);
    }
  }, []);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    try {
      setCancelling(invitationId);
      
      const { error } = await teamService.cancelTeamChallengeInvitation(invitationId);
      
      if (error) {
        console.error('❌ [TeamHUD] Cancel invitation error:', error);
        alert('Failed to cancel invitation. Please try again.');
        return false;
      }
      
      console.log('✅ [TeamHUD] Invitation cancelled');
      
      // Reload pending challenge data
      await loadPendingChallenge();
      
      return true;
    } catch (error) {
      console.error('❌ [TeamHUD] Cancel invitation error:', error);
      alert('Failed to cancel invitation. Please try again.');
      return false;
    } finally {
      setCancelling(null);
    }
  }, [loadPendingChallenge]);

  useEffect(() => {
    // 🎯 FIX: Always load pending invitations, even if there's an active challenge
    // User might have multiple team challenges (one active, one pending)
    loadPendingChallenge();
  }, [loadPendingChallenge]);

  return { pendingChallenge, setPendingChallenge, loadPendingChallenge, cancelInvitation, cancelling };
}
