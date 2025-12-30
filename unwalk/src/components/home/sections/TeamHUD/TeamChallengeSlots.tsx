import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  steps: number;
  percentage: number;
  isCurrentUser?: boolean;
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
}

export function TeamChallengeSlots({ members, challengeId, maxMembers = 5, onInviteClick, onRemoveMember, onCancelInvitation }: TeamChallengeSlotsProps) {
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);

  const loadPendingInvitations = async () => {
    if (!challengeId) {
      console.log('[TeamChallengeSlots] No challengeId - skipping load');
      setPendingInvitations([]);
      return;
    }

    console.log('[TeamChallengeSlots] Loading pending invitations for challenge:', challengeId);

    const { data, error } = await supabase
      .from('team_challenge_invitations')
      .select(`
        id,
        invited_user,
        users!team_challenge_invitations_invited_user_fkey(display_name, avatar_url)
      `)
      .eq('challenge_id', challengeId)
      .eq('status', 'pending');

    if (error) {
      console.error('[TeamChallengeSlots] Failed to load pending invitations:', error);
      setPendingInvitations([]);
      return;
    }

    const invitations = (data || []).map((inv: any) => ({
      id: inv.id,
      invited_user: inv.invited_user,
      display_name: inv.users?.display_name || 'Unknown',
      avatar_url: inv.users?.avatar_url
    }));

    console.log('[TeamChallengeSlots] Loaded pending invitations:', invitations.length, invitations);
    setPendingInvitations(invitations);
  };

  // 🎯 FIX: Reload whenever challengeId OR members change
  useEffect(() => {
    console.log('[TeamChallengeSlots] useEffect triggered - challengeId:', challengeId, 'members:', members.length);
    loadPendingInvitations();
  }, [challengeId, members.length]); // Reload when members count changes (after sending invitation)

  const emptySlots = Math.max(0, (maxMembers + 1) - members.length - pendingInvitations.length);

  console.log('[TeamChallengeSlots] Rendering - members:', members.length, 'pending:', pendingInvitations.length, 'empty:', emptySlots);

  return (
    <div className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-4 tracking-wide">
        Team Members ({members.length + pendingInvitations.length}/{maxMembers + 1})
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {/* Active members */}
        {members.map((member) => (
          <div key={member.id} className="flex flex-col items-center group">
            <div className="relative mb-2">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800 ${
                member.isCurrentUser 
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                  : 'bg-gradient-to-br from-orange-400 to-pink-500'
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
              
              {!member.isCurrentUser && onRemoveMember && (
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
            
            <div className={`text-xs font-semibold text-center truncate w-full mb-0.5 ${
              member.isCurrentUser 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {member.name}
            </div>
            
            <div className={`text-xs font-bold ${
              member.isCurrentUser 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              {member.percentage}%
            </div>
          </div>
        ))}

        {/* Pending invitations - yellow with ⏳ */}
        {pendingInvitations.map((invitation) => (
          <div key={invitation.id} className="flex flex-col items-center group">
            <div className="relative mb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800 opacity-60">
                {invitation.avatar_url ? (
                  <img 
                    src={invitation.avatar_url} 
                    alt={invitation.display_name} 
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  <span className="text-white font-black text-lg">
                    {invitation.display_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
              <div className="absolute -top-1 -right-1 text-base animate-pulse">
                ⏳
              </div>
              
              {onCancelInvitation && (
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[TeamChallengeSlots] Cancel button clicked for:', invitation.display_name, invitation.id);
                    if (confirm(`Cancel invitation for ${invitation.display_name}?`)) {
                      console.log('[TeamChallengeSlots] User confirmed - calling onCancelInvitation');
                      await onCancelInvitation(invitation.id);
                      console.log('[TeamChallengeSlots] onCancelInvitation completed - reloading invitations');
                      await loadPendingInvitations();
                    } else {
                      console.log('[TeamChallengeSlots] User cancelled dialog');
                    }
                  }}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 hover:bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold shadow-md opacity-0 group-hover:opacity-100 transition-all active:scale-95 z-10"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 text-center truncate w-full mb-0.5">
              {invitation.display_name}
            </div>
            
            <div className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
              Pending
            </div>
          </div>
        ))}

        {/* Empty slots */}
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
