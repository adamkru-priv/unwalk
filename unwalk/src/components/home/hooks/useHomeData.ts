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
      console.log('🔄 [useHomeData] Loading active challenge...');
      // 🎯 FIX: This now returns ONLY solo challenges (team_id IS NULL)
      const activeChallenge = await getActiveUserChallenge();
      
      if (activeChallenge) {
        console.log('✅ [useHomeData] Loaded active SOLO challenge:', {
          title: activeChallenge.admin_challenge?.title,
          id: activeChallenge.id,
          current_steps: activeChallenge.current_steps,
          goal_steps: activeChallenge.admin_challenge?.goal_steps
        });
        setActiveChallenge(activeChallenge);
      } else {
        setActiveChallenge(null);
        console.log('ℹ️ [useHomeData] No active SOLO challenge');
      }
    } catch (err) {
      console.error('❌ [useHomeData] Failed to load active challenge:', err);
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
      const challengeId = activeTeamChallenge.admin_challenge_id;
      
      // 🎯 FIX: Load team challenges WITHOUT nested user select (to avoid ambiguous reference)
      const { data: teamChallenges, error: teamError } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'active');

      if (teamError) {
        console.error('Failed to load team members:', teamError);
        setTeamChallenge(null);
        setTeamMembers([]);
        return;
      }

      // 🎯 NEW: Also load pending/accepted invitations for this challenge
      const { data: invitations, error: invError } = await supabase
        .from('team_challenge_invitations')
        .select('invited_user, status')
        .eq('challenge_id', challengeId)
        .in('status', ['pending', 'accepted']);

      if (invError) {
        console.error('Failed to load team invitations:', invError);
      }

      // 🎯 NEW: Fetch user details separately for all team members + invited users
      const challengeUserIds = [...new Set((teamChallenges || []).map(tc => tc.user_id).filter(Boolean))];
      const invitedUserIds = [...new Set((invitations || []).map(inv => inv.invited_user).filter(Boolean))];
      const allUserIds = [...new Set([...challengeUserIds, ...invitedUserIds])];

      const { data: usersData } = await supabase
        .from('users')
        .select('id, display_name, nickname, avatar_url')
        .in('id', allUserIds);

      // Create user lookup map
      const userMap = new Map(usersData?.map(u => [u.id, u]) || []);

      // 🎯 NEW: Determine who is the host (first user who started the challenge)
      const sortedByStartTime = [...(teamChallenges || [])].sort((a, b) => 
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
      );
      const hostUserId = sortedByStartTime[0]?.user_id;

      console.log('[useHomeData] Host user ID (first to start):', hostUserId);

      // Calculate total team steps (only from active user_challenges)
      const totalTeamSteps = (teamChallenges || []).reduce((sum, tc) => sum + (tc.current_steps || 0), 0);
      
      // Members with active user_challenges
      const activeMembers = (teamChallenges || []).map((tc: any) => {
        const isMe = tc.user_id === user.id;
        const memberIsHost = tc.user_id === hostUserId;
        const userData = userMap.get(tc.user_id);
        // ✅ Use nickname for everyone (including current user)
        const displayName = userData?.nickname || userData?.display_name || 'Unknown';
        
        return {
          id: tc.id, // 🎯 FIX: Use user_challenges.id (primary key) instead of user_id
          userId: tc.user_id, // 🎯 NEW: Also include user_id for reference
          name: displayName,
          avatar: userData?.avatar_url,
          steps: tc.current_steps || 0,
          percentage: totalTeamSteps > 0 ? Math.round((tc.current_steps / totalTeamSteps) * 100) : 0,
          isCurrentUser: isMe,
          isHost: memberIsHost, // ✅ Flag to identify the host
        };
      });

      // 🎯 FIX: Don't add pending invitations to teamMembers - they should be shown separately
      // Invited members are handled by TeamChallengeSlots component separately

      setTeamChallenge(activeTeamChallenge);
      setTeamMembers(activeMembers); // Only active members
      console.log('✅ [useHomeData] Loaded team challenge:', activeTeamChallenge.admin_challenge?.title, '- Active members:', activeMembers.length, '- Pending invitations:', (invitations || []).length, '- Total steps:', totalTeamSteps);
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
