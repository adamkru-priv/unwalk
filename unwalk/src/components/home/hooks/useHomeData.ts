import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { getDeviceId } from '../../../lib/deviceId';
import { getActiveUserChallenge, getActiveTeamChallenge } from '../../../lib/api'; // 🎯 FIX: Import new function
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
      // 🎯 FIX: This now returns ONLY solo challenges (team_id IS NULL)
      const activeChallenge = await getActiveUserChallenge();
      
      if (activeChallenge) {
        setActiveChallenge(activeChallenge);
        console.log('✅ [useHomeData] Loaded active SOLO challenge:', activeChallenge.admin_challenge?.title);
      } else {
        setActiveChallenge(null);
        console.log('ℹ️ [useHomeData] No active SOLO challenge');
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
        .order('started_at', { ascending: false});
      
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
      if (!user) {
        setTeamChallenge(null);
        setTeamMembers([]);
        return;
      }

      // 🎯 FIX: Use new getActiveTeamChallenge() function
      const activeTeamChallenge = await getActiveTeamChallenge();

      if (!activeTeamChallenge) {
        setTeamChallenge(null);
        setTeamMembers([]);
        console.log('👥 [useHomeData] No active team challenge');
        return;
      }

      // 🎯 FIX: Get team_id to find other team members
      const teamId = activeTeamChallenge.team_id || activeTeamChallenge.id;
      
      // Load ALL user challenges with this team_id (including the current user's)
      const { data: teamChallenges, error: teamError } = await supabase
        .from('user_challenges')
        .select(`
          *,
          user:users(id, display_name, avatar_url)
        `)
        .eq('team_id', teamId)
        .eq('status', 'active');

      if (teamError) {
        console.error('Failed to load team members:', teamError);
      }

      // Calculate total team steps and member contributions
      const totalTeamSteps = (teamChallenges || []).reduce((sum, tc) => sum + (tc.current_steps || 0), 0);
      
      const members = (teamChallenges || []).map((tc: any) => {
        const isMe = tc.user_id === user.id;
        return {
          id: tc.user_id,
          name: isMe ? 'You' : tc.user?.display_name || 'Unknown',
          avatar: tc.user?.avatar_url,
          steps: tc.current_steps || 0,
          percentage: totalTeamSteps > 0 ? Math.round((tc.current_steps / totalTeamSteps) * 100) : 0
        };
      });

      setTeamChallenge(activeTeamChallenge);
      setTeamMembers(members);
      console.log('✅ [useHomeData] Loaded team challenge:', activeTeamChallenge.admin_challenge?.title, '- Members:', members.length, '- Total steps:', totalTeamSteps);
    } catch (err) {
      console.error('Failed to load team challenges:', err);
      setTeamChallenge(null);
      setTeamMembers([]);
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
