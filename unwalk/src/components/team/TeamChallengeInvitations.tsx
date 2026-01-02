import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getInitials, getColorFromName } from './utils';

interface TeamChallengeInvitation {
  id: string;
  active_challenge_id: string;
  challenge_role: string;
  challenge_status: string;
  invited_to_challenge_at: string;
  responded_at?: string; // 🎯 NEW: When user accepted/rejected
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

      // 🎯 NEW: Load ALL invitations (invited, accepted, rejected) - not just 'invited'
      const { data: teamMembersData, error: tmError } = await supabase
        .from('team_members')
        .select('id, active_challenge_id, challenge_role, challenge_status, invited_to_challenge_at, updated_at, user_id')
        .eq('member_id', user.id)
        .in('challenge_status', ['invited', 'accepted', 'rejected'])
        .order('updated_at', { ascending: false }); // Most recent first

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
      const challengeIds = [...new Set(teamMembersData.map(tm => tm.active_challenge_id).filter(Boolean))];

      // Fetch hosts data
      const { data: hostsData } = await supabase
        .from('users')
        .select('id, display_name, nickname, avatar_url')
        .in('id', hostIds);

      // Fetch challenges data (some might be null for rejected invitations)
      const { data: challengesData } = challengeIds.length > 0 ? await supabase
        .from('admin_challenges')
        .select('id, title, description, goal_steps, time_limit_hours, points, image_url')
        .in('id', challengeIds) : { data: [] };

      // Create lookup maps
      const hostsMap = new Map(hostsData?.map(h => [h.id, h]) || []);
      const challengesMap = new Map(challengesData?.map(c => [c.id, c]) || []);

      // Combine data
      const combined = teamMembersData.map(tm => {
        const host = hostsMap.get(tm.user_id);
        const challenge = tm.active_challenge_id ? challengesMap.get(tm.active_challenge_id) : null;
        
        return {
          id: tm.id,
          active_challenge_id: tm.active_challenge_id,
          challenge_role: tm.challenge_role,
          challenge_status: tm.challenge_status,
          invited_to_challenge_at: tm.invited_to_challenge_at,
          responded_at: tm.updated_at, // When status changed
          user_id: tm.user_id,
          host: {
            display_name: host?.nickname || host?.display_name || 'Unknown',
            avatar_url: host?.avatar_url
          },
          challenge: challenge ? {
            id: challenge.id,
            title: challenge.title,
            description: challenge.description || '',
            goal_steps: challenge.goal_steps,
            time_limit_hours: challenge.time_limit_hours,
            points: challenge.points,
            image_url: challenge.image_url || null
          } : {
            id: '',
            title: 'Challenge Removed',
            description: '',
            goal_steps: 0,
            time_limit_hours: 0,
            points: 0,
            image_url: null
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

      console.log('[TeamChallengeInvitations] Accepting invitation:', invitation.id, 'for challenge:', invitation.active_challenge_id);

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
      } else {
        // 2. Create user_challenge for this user (if doesn't exist yet)
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

        if (challengeError) {
          console.error('Failed to create user_challenge:', challengeError);
          throw challengeError;
        }
        
        console.log('✅ Created user_challenge for member');
      }
      
      // 🎯 CRITICAL FIX: Update ALL team_members records for this user + challenge
      // This handles cases where there might be duplicate records
      console.log('[TeamChallengeInvitations] Updating team_members - user:', user.id, 'challenge:', invitation.active_challenge_id);
      
      const { data: updatedRecords, error: updateError } = await supabase
        .from('team_members')
        .update({ challenge_status: 'accepted' })
        .eq('member_id', user.id)
        .eq('active_challenge_id', invitation.active_challenge_id)
        .eq('challenge_status', 'invited')
        .select();

      if (updateError) {
        console.error('❌ Failed to update team_members:', updateError);
        console.error('❌ Error details:', JSON.stringify(updateError, null, 2));
        throw updateError;
      }

      console.log(`✅ Updated ${updatedRecords?.length || 0} team_members records to accepted`);
      console.log('✅ Updated records:', JSON.stringify(updatedRecords, null, 2));
      
      if (!updatedRecords || updatedRecords.length === 0) {
        console.warn('⚠️ No records were updated! Possible RLS policy issue');
        console.warn('⚠️ Expected to update record for member_id:', user.id, 'challenge:', invitation.active_challenge_id);
      }

      // 🎯 FIX: Remove from local state immediately
      setInvitations(prev => prev.filter(inv => inv.active_challenge_id !== invitation.active_challenge_id));
      
      // Reload to make sure we have fresh data
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

  // 🎯 Separate pending from responded invitations
  const pendingInvitations = invitations.filter(inv => inv.challenge_status === 'invited');
  const respondedInvitations = invitations.filter(inv => ['accepted', 'rejected'].includes(inv.challenge_status));

  return (
    <section className="mb-6">
      {/* Minimalistyczny nagłówek */}
      <h2 className="text-sm font-bold text-white/50 mb-3 px-1 uppercase tracking-wider">
        Team Challenge Invitations
      </h2>
      
      <div className="space-y-3">
        {/* 🎯 PENDING invitations - compact without image */}
        {pendingInvitations.map((invitation) => (
          <div
            key={invitation.id}
            className="bg-[#151A25] border-2 border-orange-500/30 rounded-2xl p-4 hover:border-orange-500/50 transition-all"
          >
            {/* Title + Host + Stats */}
            <div className="mb-4">
              <h3 className="font-black text-white text-lg mb-2">
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

        {/* 🎯 RESPONDED invitations - compact version with status badge (NO IMAGE) */}
        {respondedInvitations.map((invitation) => {
          const isAccepted = invitation.challenge_status === 'accepted';
          return (
            <div
              key={invitation.id}
              className={`bg-[#151A25] border rounded-xl p-3 ${
                isAccepted 
                  ? 'border-green-500/20 bg-green-500/5' 
                  : 'border-red-500/20 bg-red-500/5'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Title + Status */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-white/70 text-sm truncate">
                      {invitation.challenge.title}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                      isAccepted 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {isAccepted ? '✓ Accepted' : '✗ Declined'}
                    </span>
                  </div>
                  <div className="text-xs text-white/40">
                    from {invitation.host.display_name}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
