import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getInitials, getColorFromName } from './utils';

interface TeamChallengeInvitation {
  id: string;
  active_challenge_id: string;
  challenge_role: string;
  challenge_status: string;
  invited_to_challenge_at: string;
  user_id: string; // Host who invited
  host: {
    display_name: string;
    avatar_url?: string;
  };
  challenge: {
    id: string;
    title: string;
    description: string;
    goal_steps: number;
    time_limit_hours: number;
    points: number;
    image_url?: string;
  };
}

interface TeamChallengeInvitationsProps {
  onRefresh: () => void;
}

export function TeamChallengeInvitations({ onRefresh }: TeamChallengeInvitationsProps) {
  const [invitations, setInvitations] = useState<TeamChallengeInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Load team challenge invitations
  const loadInvitations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[TeamChallengeInvitations] Loading for user:', user.id);

      // 🎯 FIX: Simplified query - get data and join manually
      const { data: teamMembersData, error: tmError } = await supabase
        .from('team_members')
        .select('id, active_challenge_id, challenge_role, challenge_status, invited_to_challenge_at, user_id')
        .eq('member_id', user.id)
        .eq('challenge_status', 'invited')
        .not('active_challenge_id', 'is', null);

      if (tmError) {
        console.error('[TeamChallengeInvitations] Error:', tmError);
        throw tmError;
      }

      if (!teamMembersData || teamMembersData.length === 0) {
        console.log('[TeamChallengeInvitations] No invitations found');
        setInvitations([]);
        return;
      }

      // Get unique host IDs and challenge IDs
      const hostIds = [...new Set(teamMembersData.map(tm => tm.user_id))];
      const challengeIds = [...new Set(teamMembersData.map(tm => tm.active_challenge_id))];

      // Fetch hosts data
      const { data: hostsData } = await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .in('id', hostIds);

      // Fetch challenges data
      const { data: challengesData } = await supabase
        .from('admin_challenges')
        .select('id, title, description, goal_steps, time_limit_hours, points, image_url')
        .in('id', challengeIds);

      // Create lookup maps
      const hostsMap = new Map(hostsData?.map(h => [h.id, h]) || []);
      const challengesMap = new Map(challengesData?.map(c => [c.id, c]) || []);

      // Combine data
      const combined = teamMembersData.map(tm => {
        const host = hostsMap.get(tm.user_id);
        const challenge = challengesMap.get(tm.active_challenge_id);
        
        return {
          id: tm.id,
          active_challenge_id: tm.active_challenge_id,
          challenge_role: tm.challenge_role,
          challenge_status: tm.challenge_status,
          invited_to_challenge_at: tm.invited_to_challenge_at,
          user_id: tm.user_id,
          host: {
            display_name: host?.display_name || 'Unknown',
            avatar_url: host?.avatar_url
          },
          challenge: {
            id: challenge?.id || '',
            title: challenge?.title || 'Unknown Challenge',
            description: challenge?.description || '',
            goal_steps: challenge?.goal_steps || 0,
            time_limit_hours: challenge?.time_limit_hours || 0,
            points: challenge?.points || 0,
            image_url: challenge?.image_url || null
          }
        };
      });

      console.log('[TeamChallengeInvitations] Loaded invitations:', combined);
      setInvitations(combined);
    } catch (error) {
      console.error('Failed to load team challenge invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Accept team challenge invitation
  const handleAccept = async (invitation: TeamChallengeInvitation) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 🎯 FIX: Check if user already has this challenge active
      const { data: existingChallenge } = await supabase
        .from('user_challenges')
        .select('id, status, team_id')
        .eq('user_id', user.id)
        .eq('admin_challenge_id', invitation.active_challenge_id)
        .eq('status', 'active')
        .maybeSingle();

      // Find the team_id from host's user_challenge
      const { data: hostChallenge } = await supabase
        .from('user_challenges')
        .select('team_id')
        .eq('user_id', invitation.user_id)
        .eq('admin_challenge_id', invitation.active_challenge_id)
        .eq('status', 'active')
        .maybeSingle();

      const teamId = hostChallenge?.team_id || crypto.randomUUID();

      if (existingChallenge) {
        console.log('⚠️ User already has this challenge active');
        
        // 🎯 FIX: Update team_id to match host's team
        if (existingChallenge.team_id !== teamId) {
          console.log(`🔄 Updating team_id from ${existingChallenge.team_id} to ${teamId}`);
          const { error: updateTeamError } = await supabase
            .from('user_challenges')
            .update({ team_id: teamId })
            .eq('id', existingChallenge.id);

          if (updateTeamError) {
            console.error('Failed to update team_id:', updateTeamError);
          }
        }
        
        // Update team_members to accepted
        const { error: updateError } = await supabase
          .from('team_members')
          .update({ challenge_status: 'accepted' })
          .eq('id', invitation.id);

        if (updateError) throw updateError;

        console.log('✅ Updated team_members status to accepted');
        
        // 🎯 FIX: Remove from local state immediately
        setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
        
        await loadInvitations();
        onRefresh();
        return;
      }

      // 1. Update team_members to mark as accepted
      const { error: updateError } = await supabase
        .from('team_members')
        .update({ challenge_status: 'accepted' })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      // 2. Create user_challenge for this user
      const { getDeviceId } = await import('../../lib/deviceId');
      const deviceId = getDeviceId();

      const { error: challengeError } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          device_id: deviceId,
          admin_challenge_id: invitation.active_challenge_id,
          team_id: teamId,
          status: 'active',
          current_steps: 0,
          started_at: new Date().toISOString(),
          last_resumed_at: new Date().toISOString()
        });

      if (challengeError) throw challengeError;

      console.log('✅ Accepted team challenge invitation and created user_challenge');
      
      // 🎯 FIX: Remove from local state immediately
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      
      await loadInvitations();
      onRefresh();
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      alert('Failed to accept invitation. Please try again.');
    }
  };

  // Reject team challenge invitation
  const handleReject = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ 
          challenge_status: 'rejected',
          active_challenge_id: null 
        })
        .eq('id', invitationId);

      if (error) throw error;

      console.log('✅ Rejected team challenge invitation');
      
      // 🎯 FIX: Remove from local state immediately
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      await loadInvitations();
      onRefresh();
    } catch (error) {
      console.error('Failed to reject invitation:', error);
      alert('Failed to reject invitation. Please try again.');
    }
  };

  // Load on mount
  useEffect(() => {
    loadInvitations();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-white/50">Loading invitations...</div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return null; // Don't show anything if no invitations
  }

  return (
    <section className="mb-6">
      {/* Minimalistyczny nagłówek */}
      <h2 className="text-sm font-bold text-white/50 mb-3 px-1 uppercase tracking-wider">
        Team Challenge Invitations
      </h2>
      
      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="bg-[#151A25] border-2 border-orange-500/30 rounded-2xl p-4 hover:border-orange-500/50 transition-all"
          >
            {/* Single row: Image + Info + Stats */}
            <div className="flex items-center gap-4 mb-4">
              {/* Challenge Image - compact */}
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-500 to-pink-500 ring-2 ring-orange-500/20">
                {invitation.challenge.image_url ? (
                  <img
                    src={invitation.challenge.image_url}
                    alt={invitation.challenge.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    🎯
                  </div>
                )}
              </div>

              {/* Title + Host + Stats - all in one row */}
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-white text-lg mb-2 truncate">
                  {invitation.challenge.title}
                </h3>
                
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Host */}
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: getColorFromName(invitation.host.display_name) }}
                    >
                      {invitation.host.avatar_url ? (
                        <img 
                          src={invitation.host.avatar_url} 
                          alt={invitation.host.display_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        getInitials(invitation.host.display_name)
                      )}
                    </div>
                    <span className="text-sm text-white/60">
                      {invitation.host.display_name}
                    </span>
                  </div>

                  {/* Stats - inline, no boxes */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/50">🎯</span>
                      <span className="font-bold text-white">{(invitation.challenge.goal_steps / 1000).toFixed(0)}k</span>
                      <span className="text-white/40">steps</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/50">⏱️</span>
                      <span className="font-bold text-white">{invitation.challenge.time_limit_hours}h</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-orange-400">💎</span>
                      <span className="font-bold text-orange-400">+{invitation.challenge.points}</span>
                      <span className="text-white/40">XP</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons - bottom */}
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(invitation)}
                className="flex-1 bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700 text-white py-3 rounded-xl font-bold text-sm transition-all"
              >
                Accept & Join
              </button>
              <button
                onClick={() => handleReject(invitation.id)}
                className="px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white py-3 rounded-xl font-bold text-sm transition-all"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
