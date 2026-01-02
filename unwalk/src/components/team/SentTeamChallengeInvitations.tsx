import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getInitials, getColorFromName } from './utils';

interface SentTeamChallengeInvitation {
  id: string;
  member_id: string;
  challenge_status: string;
  active_challenge_id: string;
  invited_to_challenge_at: string;
  responded_at?: string; // 🎯 NEW: When member accepted/rejected
  member: {
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

interface SentTeamChallengeInvitationsProps {
  onRefresh: () => void;
}

export function SentTeamChallengeInvitations({ onRefresh }: SentTeamChallengeInvitationsProps) {
  const [invitations, setInvitations] = useState<SentTeamChallengeInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInvitations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[SentTeamChallengeInvitations] Loading for user:', user.id);

      // 🎯 NEW: Load ALL sent invitations (invited, accepted, rejected)
      const { data: teamMembersData, error: tmError } = await supabase
        .from('team_members')
        .select('id, member_id, challenge_status, active_challenge_id, invited_to_challenge_at, updated_at')
        .eq('user_id', user.id)
        .in('challenge_status', ['invited', 'accepted', 'rejected'])
        .order('updated_at', { ascending: false }); // Most recent first

      if (tmError) {
        console.error('[SentTeamChallengeInvitations] Error loading team_members:', tmError);
        throw tmError;
      }

      if (!teamMembersData || teamMembersData.length === 0) {
        console.log('[SentTeamChallengeInvitations] No invitations found');
        setInvitations([]);
        return;
      }

      // Get unique member IDs and challenge IDs
      const memberIds = [...new Set(teamMembersData.map(tm => tm.member_id))];
      const challengeIds = [...new Set(teamMembersData.map(tm => tm.active_challenge_id).filter(Boolean))];

      // Fetch members data
      const { data: membersData } = await supabase
        .from('users')
        .select('id, display_name, nickname, avatar_url')
        .in('id', memberIds);

      // Fetch challenges data (some might be null for rejected/cancelled)
      const { data: challengesData } = challengeIds.length > 0 ? await supabase
        .from('admin_challenges')
        .select('id, title, description, goal_steps, time_limit_hours, points, image_url')
        .in('id', challengeIds) : { data: [] };

      // Create lookup maps
      const membersMap = new Map(membersData?.map(m => [m.id, m]) || []);
      const challengesMap = new Map(challengesData?.map(c => [c.id, c]) || []);

      // Combine data
      const combined = teamMembersData.map(tm => {
        const member = membersMap.get(tm.member_id);
        const challenge = tm.active_challenge_id ? challengesMap.get(tm.active_challenge_id) : null;
        
        return {
          id: tm.id,
          member_id: tm.member_id,
          challenge_status: tm.challenge_status,
          active_challenge_id: tm.active_challenge_id,
          invited_to_challenge_at: tm.invited_to_challenge_at,
          responded_at: tm.updated_at,
          member: {
            display_name: member?.nickname || member?.display_name || 'Unknown',
            avatar_url: member?.avatar_url
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

      console.log('[SentTeamChallengeInvitations] Loaded invitations:', combined);
      setInvitations(combined);
    } catch (error) {
      console.error('Failed to load sent team challenge invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ 
          challenge_status: 'rejected',
          active_challenge_id: null 
        })
        .eq('id', invitationId);

      if (error) throw error;

      console.log('✅ Cancelled team challenge invitation');
      
      // 🎯 FIX: Remove from local state immediately
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      await loadInvitations();
      onRefresh();
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      alert('Failed to cancel invitation. Please try again.');
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-white/50">Loading sent invitations...</div>
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
        Sent Team Challenge Invitations
      </h2>
      
      <div className="space-y-3">
        {/* 🎯 PENDING invitations - compact without image */}
        {pendingInvitations.map((invitation) => (
          <div
            key={invitation.id}
            className="bg-[#151A25] border-2 border-blue-500/30 rounded-2xl p-4 hover:border-blue-500/50 transition-all"
          >
            {/* Title + Member + Stats */}
            <div className="mb-3">
              <h3 className="font-black text-white text-lg mb-2">
                {invitation.challenge.title}
              </h3>
              
              <div className="flex items-center gap-4 flex-wrap">
                {/* Member */}
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: getColorFromName(invitation.member.display_name) }}
                  >
                    {invitation.member.avatar_url ? (
                      <img 
                        src={invitation.member.avatar_url} 
                        alt={invitation.member.display_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(invitation.member.display_name)
                    )}
                  </div>
                  <span className="text-sm text-white/60">
                    {invitation.member.display_name}
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
                    <span className="text-blue-400">💎</span>
                    <span className="font-bold text-blue-400">+{invitation.challenge.points}</span>
                    <span className="text-white/40">XP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancel button */}
            <button
              onClick={() => {
                if (confirm(`Cancel invitation for ${invitation.member.display_name}?`)) {
                  handleCancelInvitation(invitation.id);
                }
              }}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white py-2.5 rounded-xl font-bold text-sm transition-all"
            >
              Cancel Invitation
            </button>
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
                {/* Title + Member + Status */}
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
                    to {invitation.member.display_name}
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
