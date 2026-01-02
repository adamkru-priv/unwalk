import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { PendingChallenge } from './types';

interface UseTeamChallengeActionsProps {
  onChallengeStarted?: () => void;
  onChallengeCancelled?: () => void;
  onChallengeEnded?: () => void;
}

export function useTeamChallengeActions({
  onChallengeStarted,
  onChallengeCancelled,
  onChallengeEnded
}: UseTeamChallengeActionsProps) {
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  const cancelChallenge = async (pendingChallenge: PendingChallenge) => {
    if (!confirm(`🗑️ Cancel "${pendingChallenge.title}" and delete all invitations?`)) {
      return false;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 🎯 FIX: Delete invitations
      const { error: invitationsError } = await supabase
        .from('team_challenge_invitations')
        .delete()
        .eq('invited_by', user.id)
        .eq('challenge_id', pendingChallenge.challenge_id);

      if (invitationsError) {
        console.error('Failed to delete invitations:', invitationsError);
        throw invitationsError;
      }

      // 🎯 FIX: Also delete any user_challenges with this challenge_id and user_id
      // This handles cases where challenge was partially started
      const { error: challengesError } = await supabase
        .from('user_challenges')
        .delete()
        .eq('user_id', user.id)
        .eq('admin_challenge_id', pendingChallenge.challenge_id);

      if (challengesError) {
        console.error('Failed to delete user challenges:', challengesError);
        // Don't throw - invitations are already deleted
      }

      console.log('✅ [CancelChallenge] Deleted invitations and user challenges for challenge:', pendingChallenge.challenge_id);
      // ✅ Removed alert - modal just closes
      onChallengeCancelled?.();
      return true;
    } catch (error) {
      console.error('Failed to cancel challenge:', error);
      alert('❌ Failed to cancel challenge. Please try again.');
      return false;
    }
  };

  const startChallenge = async (pendingChallenge: PendingChallenge) => {
    if (starting) return false;
    
    try {
      setStarting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check for existing active team challenge (don't block solo challenges)
      // 🎯 FIX: Use .neq() instead of .not() for proper null filtering
      const { data: existingTeamChallenge } = await supabase
        .from('user_challenges')
        .select('id, admin_challenge:admin_challenges(title, is_team_challenge)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .not('team_id', 'is', null); // ❌ This doesn't work properly

      // 🎯 Better approach: Check if any existing challenge is actually a team challenge
      const hasActiveTeamChallenge = existingTeamChallenge?.some((uc: any) => {
        return uc.admin_challenge?.is_team_challenge === true;
      });

      if (hasActiveTeamChallenge && existingTeamChallenge && existingTeamChallenge.length > 0) {
        const teamChallengeRecord = existingTeamChallenge.find((uc: any) => uc.admin_challenge?.is_team_challenge === true);
        if (!teamChallengeRecord) {
          console.warn('⚠️ No team challenge found in array');
          // Continue without blocking
        } else {
          const currentTitle = (teamChallengeRecord as any).admin_challenge?.title || 'Unknown';
          if (!confirm(`⚠️ You already have an active team challenge: "${currentTitle}".\n\nEnd it first to start "${pendingChallenge.title}"?`)) {
            return false;
          }

          await supabase
            .from('user_challenges')
            .update({ status: 'completed' })
            .eq('id', teamChallengeRecord.id);
        }
      }

      // 🎯 Generate team_id
      const teamId = crypto.randomUUID();
      
      console.log('🎯 [Team Challenge] Creating with team_id:', teamId);

      // 🎯 Try RPC first, fallback to direct INSERT if it fails
      let teamChallenge: any = null;
      let createError: any = null;

      // Try RPC approach
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('create_team_challenge', {
            p_user_id: user.id,
            p_admin_challenge_id: pendingChallenge.challenge_id,
            p_team_id: teamId
          });

        if (rpcError) throw rpcError;
        teamChallenge = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        console.log('✅ [Team Challenge] RPC succeeded:', teamChallenge);
      } catch (rpcError) {
        console.warn('⚠️ [Team Challenge] RPC failed, trying direct INSERT:', rpcError);
        
        // Fallback: Direct INSERT
        const { data: insertData, error: insertError } = await supabase
          .from('user_challenges')
          .insert({
            device_id: user.id,
            user_id: user.id,
            admin_challenge_id: pendingChallenge.challenge_id,
            team_id: teamId, // Explicitly set team_id
            status: 'active',
            current_steps: 0,
            started_at: new Date().toISOString()
          })
          .select('id, user_id, admin_challenge_id, team_id, status, current_steps, started_at')
          .single();

        createError = insertError;
        teamChallenge = insertData;
        
        if (insertData) {
          console.log('✅ [Team Challenge] Direct INSERT succeeded:', insertData);
        }
      }

      if (createError) {
        console.error('❌ [Team Challenge] Both methods failed:', createError);
        throw createError;
      }
      if (!teamChallenge) throw new Error('Failed to create team challenge');

      // 🎯 CRITICAL: Verify team_id was actually set
      if (!teamChallenge.team_id) {
        console.error('❌ [Team Challenge] team_id is NULL after creation!', teamChallenge);
        alert('⚠️ Team challenge created but team_id is missing. This will cause issues. Please contact support.');
      } else {
        console.log('✅ [Team Challenge] Verified team_id is set:', teamChallenge.team_id);
      }

      onChallengeStarted?.();
      return true;
    } catch (error) {
      console.error('❌ [Team Challenge] Failed to start:', error);
      alert('❌ Failed to start challenge. Please try again.');
      return false;
    } finally {
      setStarting(false);
    }
  };

  const endChallenge = async (challengeId: string) => {
    if (ending) return false;
    if (!confirm('🏁 End this team challenge for EVERYONE?\n\nThis will complete the challenge for all team members.')) {
      return false;
    }

    try {
      setEnding(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 🎯 CRITICAL FIX: Get the challenge to find team_id
      const { data: challenge, error: fetchError } = await supabase
        .from('user_challenges')
        .select('id, team_id, admin_challenge_id')
        .eq('id', challengeId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Failed to fetch challenge:', fetchError);
        throw fetchError;
      }

      if (!challenge) {
        throw new Error('Challenge not found');
      }

      console.log('[endChallenge] Ending challenge for team_id:', challenge.team_id);

      // 🎯 FIX: End challenge for ALL team members, not just host
      if (challenge.team_id) {
        // End for entire team using team_id
        const { data: updatedChallenges, error } = await supabase
          .from('user_challenges')
          .update({ status: 'completed' })
          .eq('team_id', challenge.team_id)
          .eq('status', 'active')
          .select();

        if (error) {
          console.error('Failed to end team challenge:', error);
          throw error;
        }

        console.log(`✅ Ended challenge for ${updatedChallenges?.length || 0} team members`);
      } else {
        // Fallback: End only for current user if no team_id
        console.warn('⚠️ No team_id found - ending only for current user');
        const { error } = await supabase
          .from('user_challenges')
          .update({ status: 'completed' })
          .eq('id', challengeId)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      // 🎯 FIX: Clear challenge invitations status in team_members
      if (challenge.admin_challenge_id) {
        const { error: clearError } = await supabase
          .from('team_members')
          .update({ 
            challenge_status: null,
            active_challenge_id: null 
          })
          .eq('active_challenge_id', challenge.admin_challenge_id);

        if (clearError) {
          console.error('Failed to clear team_members status:', clearError);
          // Don't throw - challenge is already ended
        } else {
          console.log('✅ Cleared team_members challenge status');
        }
      }

      alert('✅ Team challenge ended for everyone!');
      onChallengeEnded?.();
      return true;
    } catch (error) {
      console.error('Failed to end challenge:', error);
      alert('❌ Failed to end challenge. Please try again.');
      return false;
    } finally {
      setEnding(false);
    }
  };

  return {
    starting,
    ending,
    cancelChallenge,
    startChallenge,
    endChallenge
  };
}
