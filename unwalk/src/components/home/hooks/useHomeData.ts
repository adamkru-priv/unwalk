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
      if (activeChallenge) {
        setActiveChallenge(activeChallenge);
        console.log('✅ [useHomeData] Loaded active challenge:', activeChallenge.admin_challenge?.title);
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

      // Load active team challenge
      const { data: activeTeamChallenge, error } = await supabase
        .from('user_challenges')
        .select(`
          *,
          admin_challenge:admin_challenges(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('admin_challenge.goal_steps', 50000) // Team challenges are 50k+
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load team challenge:', error);
        return;
      }

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

      // Calculate team members with their steps
      const members = [
        {
          id: user.id,
          name: 'You',
          steps: activeTeamChallenge.current_steps,
          percentage: Math.round((activeTeamChallenge.current_steps / (activeTeamChallenge.admin_challenge?.goal_steps || 1)) * 100)
        },
        ...(invitations || []).map((inv: any) => ({
          id: inv.invited_user.id,
          name: inv.invited_user.display_name,
          avatar: inv.invited_user.avatar_url,
          steps: 0, // TODO: Load actual steps from their user_challenge
          percentage: 0
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
