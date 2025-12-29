import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { getDeviceId } from '../../../lib/deviceId';
import { getActiveUserChallenge } from '../../../lib/api';
import type { UserChallenge } from '../../../types';
import { useChallengeStore } from '../../../stores/useChallengeStore';

/**
 * Hook for managing home screen data loading
 * Handles: active challenge, unclaimed challenges, team challenges
 */
export function useHomeData() {
  const [unclaimedChallenges, setUnclaimedChallenges] = useState<UserChallenge[]>([]);
  const [teamChallenge, setTeamChallenge] = useState<UserChallenge | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);

  const loadActiveChallenge = async () => {
    try {
      const activeChallenge = await getActiveUserChallenge();
      
      // 🎯 FIX: Don't load team challenges as active solo challenge
      if (activeChallenge && activeChallenge.admin_challenge?.is_team_challenge) {
        console.log('⏭️ [useHomeData] Skipping team challenge from solo slot:', activeChallenge.admin_challenge?.title);
        setActiveChallenge(null);
        return;
      }
      
      if (activeChallenge) {
        setActiveChallenge(activeChallenge);
        console.log('✅ [useHomeData] Loaded active solo challenge:', activeChallenge.admin_challenge?.title);
      }
    } catch (err) {
      console.error('Failed to load active challenge:', err);
    }
  };

  const loadUnclaimedChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const deviceId = getDeviceId();
      
      if (!user) {
        console.log('No authenticated user');
        return;
      }
      
      const { data, error } = await supabase
        .from('user_challenges')
        .select(`
          *,
          admin_challenge:admin_challenges(*)
        `)
        .eq('status', 'active')
        .or(`user_id.eq.${user.id},device_id.eq.${deviceId}`)
        .order('started_at', { ascending: false });
      
      if (error) {
        console.error('Failed to load challenges:', error);
        return;
      }
      
      const completed = (data || []).filter(challenge => {
        const goalSteps = challenge.admin_challenge?.goal_steps || 0;
        const currentSteps = challenge.current_steps || 0;
        return currentSteps >= goalSteps && goalSteps > 0;
      });
      
      setUnclaimedChallenges(completed);
      console.log('✅ [useHomeData] Loaded unclaimed challenges (at 100%):', completed.length);
    } catch (err) {
      console.error('Failed to load unclaimed challenges:', err);
    }
  };

  const loadTeamChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 🎯 FIX: Load ALL active challenges, then filter by admin_challenge.is_team_challenge
      const { data: userChallenges, error } = await supabase
        .from('user_challenges')
        .select(`
          *,
          admin_challenge:admin_challenges(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) {
        console.error('Failed to load team challenge:', error);
        return;
      }

      // Filter for team challenges (is_team_challenge flag is on admin_challenge)
      const activeTeamChallenge = (userChallenges || []).find(
        challenge => challenge.admin_challenge?.is_team_challenge === true
      );

      if (!activeTeamChallenge) {
        setTeamChallenge(null);
        setTeamMembers([]);
        console.log('👥 [useHomeData] No active team challenge');
        return;
      }

      // Load team members for this challenge
      const { data: invitations } = await supabase
        .from('team_challenge_invitations')
        .select(`
          invited_user:users!invited_user(id, display_name, avatar_url),
          status
        `)
        .eq('challenge_id', activeTeamChallenge.admin_challenge_id)
        .eq('invited_by', user.id)
        .eq('status', 'accepted');

      // 🎯 FIX: Calculate contribution percentage based on TEAM TOTAL, not goal
      const mySteps = activeTeamChallenge.current_steps;
      const otherMembersSteps = (invitations || []).map(() => 0); // TODO: Load actual steps
      const totalTeamSteps = mySteps + otherMembersSteps.reduce((sum, s) => sum + s, 0);
      
      // Calculate team members with their steps and contribution percentage
      const members = [
        {
          id: user.id,
          name: 'You',
          steps: mySteps,
          percentage: totalTeamSteps > 0 ? Math.round((mySteps / totalTeamSteps) * 100) : 0
        },
        ...(invitations || []).map((inv: any, index: number) => ({
          id: inv.invited_user.id,
          name: inv.invited_user.display_name,
          avatar: inv.invited_user.avatar_url,
          steps: otherMembersSteps[index], // TODO: Load actual steps from their user_challenge
          percentage: totalTeamSteps > 0 ? Math.round((otherMembersSteps[index] / totalTeamSteps) * 100) : 0
        }))
      ];

      setTeamChallenge(activeTeamChallenge);
      setTeamMembers(members);
      console.log('✅ [useHomeData] Loaded team challenge:', activeTeamChallenge.admin_challenge?.title, '- Members:', members.length);
    } catch (err) {
      console.error('Failed to load team challenges:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadActiveChallenge(),
      loadUnclaimedChallenges(),
      loadTeamChallenges()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  return {
    unclaimedChallenges,
    teamChallenge,
    teamMembers,
    loading,
    loadActiveChallenge,
    loadUnclaimedChallenges,
    loadTeamChallenges,
    reloadAll: loadAllData
  };
}
