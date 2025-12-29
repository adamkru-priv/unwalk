import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { PendingChallenge } from './types';

export function useTeamChallenge(teamChallenge: any | null) {
  const [pendingChallenge, setPendingChallenge] = useState<PendingChallenge | null>(null);

  const loadPendingChallenge = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('team_challenge_invitations')
        .select(`
          id,
          status,
          invited_at,
          challenge_id,
          invited_user:users!invited_user(id, display_name, avatar_url),
          challenge:admin_challenges!challenge_id(id, title, goal_steps, time_limit_hours, points)
        `)
        .eq('invited_by', user.id)
        .order('invited_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setPendingChallenge(null);
        return;
      }

      const latestChallengeId = data[0].challenge_id;
      const challengeInfo = data[0].challenge as any;
      
      const challengeData: PendingChallenge = {
        challenge_id: latestChallengeId,
        title: challengeInfo.title,
        goal_steps: challengeInfo.goal_steps,
        time_limit_hours: challengeInfo.time_limit_hours,
        points: challengeInfo.points,
        invitations: [],
        acceptedCount: 0,
        pendingCount: 0,
        currentUserId: user.id
      };

      data
        .filter((inv: any) => inv.challenge_id === latestChallengeId)
        .forEach((inv: any) => {
          challengeData.invitations.push({
            id: inv.id,
            status: inv.status,
            invited_at: inv.invited_at,
            invited_user: inv.invited_user
          });

          if (inv.status === 'accepted') challengeData.acceptedCount++;
          if (inv.status === 'pending') challengeData.pendingCount++;
        });

      setPendingChallenge(challengeData);
    } catch (error) {
      console.error('Failed to load pending challenge:', error);
    }
  }, []);

  useEffect(() => {
    if (teamChallenge) {
      setPendingChallenge(null);
    } else {
      loadPendingChallenge();
    }
  }, [teamChallenge, loadPendingChallenge]);

  return { pendingChallenge, setPendingChallenge, loadPendingChallenge };
}
