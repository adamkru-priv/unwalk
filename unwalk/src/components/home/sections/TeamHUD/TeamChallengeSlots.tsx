import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  steps: number;
  percentage: number;
  isCurrentUser?: boolean;
  isHost?: boolean; // 🎯 NEW: Flag to identify the host
}

interface PendingInvitation {
  id: string;
  invited_user: string;
  display_name: string;
  avatar_url?: string;
}

interface TeamChallengeSlotsProps {
  members: TeamMember[];
  challengeId?: string;
  maxMembers?: number;
  onInviteClick?: () => void;
  onRemoveMember?: (memberId: string, memberName: string) => void;
  onCancelInvitation?: (invitationId: string) => void;
  isHost?: boolean; // 🎯 NEW: Is current user the host?
}

export function TeamChallengeSlots({ members, challengeId, maxMembers = 5, onInviteClick, onRemoveMember, onCancelInvitation, isHost }: TeamChallengeSlotsProps) {
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);

  const loadPendingInvitations = async () => {
    if (!challengeId) {
      console.log('[TeamChallengeSlots] No challengeId - skipping load');
      setPendingInvitations([]);
      return;
    }

    console.log('[TeamChallengeSlots] Loading pending invitations for challenge:', challengeId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 🎯 NEW: Read from team_members instead of team_challenge_invitations
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          member_id,
          challenge_status,
          invited_user:users!member_id(display_name, nickname, avatar_url)
        `)
        .eq('user_id', user.id) // You are the host
        .eq('active_challenge_id', challengeId) // For this specific challenge
        .eq('challenge_status', 'invited'); // Only pending invitations

      if (error) {
        console.error('[TeamChallengeSlots] Failed to load pending invitations:', error);
        setPendingInvitations([]);
        return;
      }

      const invitations = (data || []).map((inv: any) => ({
        id: inv.id,
        invited_user: inv.member_id,
        // ✅ Use nickname if available, otherwise display_name
        display_name: inv.invited_user?.nickname || inv.invited_user?.display_name || 'Unknown',
        avatar_url: inv.invited_user?.avatar_url
      }));

      console.log('[TeamChallengeSlots] Loaded pending invitations:', invitations.length, invitations);
      setPendingInvitations(invitations);
    } catch (error) {
      console.error('[TeamChallengeSlots] Error loading invitations:', error);
      setPendingInvitations([]);
    }
  };

  // 🎯 FIX: Reload whenever challengeId OR members change
  useEffect(() => {
    console.log('[TeamChallengeSlots] useEffect triggered - reloading invitations');
    loadPendingInvitations();
  }, [challengeId, members.length]); // Reload when members count changes (after sending invitation)

  // 🎯 NEW: Sort members - host always first, then by steps descending
  const sortedMembers = [...members].sort((a, b) => {
    // Host always comes first
    if (a.isHost && !b.isHost) return -1;
    if (!a.isHost && b.isHost) return 1;
    // Then sort by steps (highest first)
    return b.steps - a.steps;
  });

  // 🎯 Combine members + pending invitations into one array for grid
  const totalSlots = sortedMembers.length + pendingInvitations.length;
  const emptySlots = Math.max(0, (maxMembers + 1) - totalSlots);

  return (
    <div className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-4 tracking-wide">
        Team Members ({totalSlots}/{maxMembers + 1})
      </div>
      
      {/* Grid 3x2 - wszyscy członkowie + zaproszenia */}
      <div className="grid grid-cols-3 gap-3">
        {/* Active members */}
        {sortedMembers.map((member) => (
          <div key={member.id} className="flex flex-col items-center group">
            {/* Krzesło z awatarem */}
            <div className="relative mb-2">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border-2 ${
                member.isHost
                  ? 'border-yellow-400 dark:border-yellow-500 bg-gradient-to-br from-yellow-400 to-orange-500'
                  : member.isCurrentUser 
                  ? 'border-white dark:border-gray-800 bg-gradient-to-br from-blue-500 to-purple-600' 
                  : 'border-white dark:border-gray-800 bg-gradient-to-br from-orange-400 to-pink-500'
              }`}>
                {member.avatar ? (
                  <img 
                    src={member.avatar} 
                    alt={member.name} 
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  <span className="text-white font-black text-lg">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* Przycisk usuwania - tylko host może usuwać innych (nie siebie) */}
              {isHost && !member.isCurrentUser && onRemoveMember && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveMember(member.id, member.name);
                  }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg z-10"
                  title={`Remove ${member.name}`}
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Nazwa z rolą */}
            <div className={`text-xs font-semibold text-center truncate w-full mb-0.5 ${
              member.isHost
                ? 'text-yellow-600 dark:text-yellow-400'
                : member.isCurrentUser 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {member.name}
              {member.isHost && member.isCurrentUser && ' (You, Host)'}
              {member.isHost && !member.isCurrentUser && ' (Host)'}
              {!member.isHost && member.isCurrentUser && ' (You)'}
            </div>
            
            {/* Procent wkładu */}
            <div className={`text-xs font-bold ${
              member.isHost
                ? 'text-yellow-600 dark:text-yellow-400'
                : member.isCurrentUser 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              {member.percentage}%
            </div>
          </div>
        ))}

        {/* Pending invitations - pokazujemy jako krzesła (tylko host widzi X) */}
        {pendingInvitations.map((invitation) => (
          <div key={`pending-${invitation.id}`} className="flex flex-col items-center group">
            <div className="relative mb-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border-2 border-dashed border-yellow-400 dark:border-yellow-600 bg-yellow-100 dark:bg-yellow-900/20">
                {invitation.avatar_url ? (
                  <img 
                    src={invitation.avatar_url} 
                    alt={invitation.display_name} 
                    className="w-full h-full rounded-2xl object-cover opacity-60"
                  />
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400 font-black text-lg">
                    {invitation.display_name.charAt(0).toUpperCase()}
                  </span>
                )}
                {/* Pending icon */}
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs">
                  ⏳
                </div>
              </div>
              
              {/* Przycisk anulowania zaproszenia - tylko dla hosta */}
              {isHost && onCancelInvitation && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[TeamChallengeSlots] Cancel invitation clicked for:', invitation.display_name, invitation.id);
                    if (confirm(`Cancel invitation for ${invitation.display_name}?`)) {
                      console.log('[TeamChallengeSlots] Confirmed - calling onCancelInvitation');
                      onCancelInvitation(invitation.id);
                    }
                  }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg z-10"
                  title={`Cancel invitation for ${invitation.display_name}`}
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="text-xs font-semibold text-center truncate w-full mb-0.5 text-yellow-600 dark:text-yellow-400">
              {invitation.display_name}
            </div>
            <div className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
              Pending
            </div>
          </div>
        ))}

        {/* Wolne krzesła */}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <div key={`empty-${index}`} className="flex flex-col items-center">
            <button
              onClick={onInviteClick}
              disabled={!onInviteClick}
              className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center mb-2 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors disabled:cursor-default disabled:hover:bg-gray-200 dark:disabled:hover:bg-gray-800 group"
            >
              {onInviteClick ? (
                <svg 
                  className="w-6 h-6 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              ) : (
                <span className="text-2xl">👥</span>
              )}
            </button>
            <div className="text-xs text-gray-400 dark:text-gray-600 text-center">
              {onInviteClick ? 'Invite' : 'Empty'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
