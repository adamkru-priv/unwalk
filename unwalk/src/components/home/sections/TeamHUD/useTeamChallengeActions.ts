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

      const { error } = await supabase
        .from('team_challenge_invitations')
        .delete()
        .eq('invited_by', user.id)
        .eq('challenge_id', pendingChallenge.challenge_id);

      if (error) throw error;

      alert('✅ Challenge cancelled');
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

      // Check for existing active challenge
      const { data: existingChallenge } = await supabase
        .from('user_challenges')
        .select('id, admin_challenge:admin_challenges(title)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (existingChallenge) {
        const challengeData = existingChallenge.admin_challenge as any;
        const currentTitle = challengeData?.title || 'Unknown';
        if (!confirm(`⚠️ You already have an active challenge: "${currentTitle}".\n\nEnd it first to start "${pendingChallenge.title}"?`)) {
          return false;
        }

        await supabase
          .from('user_challenges')
          .update({ status: 'completed' })
          .eq('id', existingChallenge.id);
      }

      // Create new team challenge
      const { error } = await supabase
        .from('user_challenges')
        .insert({
          device_id: user.id,
          user_id: user.id,
          admin_challenge_id: pendingChallenge.challenge_id,
          status: 'active'
        });

      if (error) throw error;

      onChallengeStarted?.();
      return true;
    } catch (error) {
      console.error('Failed to start challenge:', error);
      alert('❌ Failed to start challenge. Please try again.');
      return false;
    } finally {
      setStarting(false);
    }
  };

  const endChallenge = async (challengeId: string) => {
    if (ending) return false;
    if (!confirm('🏁 Are you sure you want to end this team challenge?')) {
      return false;
    }

    try {
      setEnding(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_challenges')
        .update({ status: 'completed' })
        .eq('id', challengeId)
        .eq('user_id', user.id);

      if (error) throw error;

      alert('✅ Challenge ended!');
      onChallengeEnded?.();
      return true;
    } catch (error) {
      console.error('Failed to end challenge:', error);
      alert('❌ Failed to end challenge');
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
