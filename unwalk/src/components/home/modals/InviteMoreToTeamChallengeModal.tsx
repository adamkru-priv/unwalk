import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface TeamMemberOption {
  id: string;
  display_name: string;
  avatar_url?: string;
}

interface InviteMoreToTeamChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  challengeId: string;
  challengeTitle: string;
  alreadyInvitedUserIds: string[]; // IDs of users already invited
}

export function InviteMoreToTeamChallengeModal({
  isOpen,
  onClose,
  onSuccess,
  challengeId,
  challengeTitle,
  alreadyInvitedUserIds
}: InviteMoreToTeamChallengeModalProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAvailableTeamMembers();
    }
  }, [isOpen, alreadyInvitedUserIds]);

  const loadAvailableTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[InviteMoreModal] Loading team members for user:', user.id);
      console.log('[InviteMoreModal] Already invited:', alreadyInvitedUserIds);

      // 🎯 FIX: Get all team members EXCLUDING those with rejected/cancelled invitations for THIS challenge
      // We want to show:
      // 1. Team members who have NEVER been invited to this challenge
      // 2. Team members who were removed from this challenge (challenge_status=rejected AND active_challenge_id=null)
      
      // First, get members who are currently invited/accepted to THIS challenge
      const { data: currentChallengeMembers, error: challengeError } = await supabase
        .from('team_members')
        .select('member_id')
        .eq('user_id', user.id)
        .eq('active_challenge_id', challengeId)
        .in('challenge_status', ['invited', 'accepted']);

      if (challengeError) throw challengeError;

      const excludedMemberIds = (currentChallengeMembers || []).map(m => m.member_id);
      console.log('[InviteMoreModal] Members currently in this challenge:', excludedMemberIds);

      // Now get ALL team members (general team, not challenge-specific)
      const { data, error } = await supabase
        .from('team_members')
        .select('member_id, member:users!member_id(id, display_name, nickname, avatar_url)')
        .eq('user_id', user.id)
        .neq('member_id', user.id);

      if (error) throw error;

      console.log('[InviteMoreModal] Raw data from team_members:', data);

      const members = (data || [])
        .filter((m: any) => {
          console.log('[InviteMoreModal] Processing member:', m);
          return m.member;
        })
        .filter((m: any) => !excludedMemberIds.includes(m.member.id)) // 🎯 Filter out currently invited/accepted
        .map((m: any) => ({
          id: m.member.id,
          display_name: m.member.nickname || m.member.display_name || 'Unknown',
          avatar_url: m.member.avatar_url
        }));

      console.log('[InviteMoreModal] Available members to invite:', members);
      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      // 🎯 FIX: max 5 additional invites (6 total including host)
      const maxAdditional = 5 - alreadyInvitedUserIds.length;
      if (newSelected.size < maxAdditional) {
        newSelected.add(friendId);
      }
    }
    setSelectedFriends(newSelected);
  };

  const handleSendInvitations = async () => {
    if (selectedFriends.size === 0) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 🎯 NEW: UPSERT instead of UPDATE - create team_members if they don't exist
      const updates = Array.from(selectedFriends).map(memberId => ({
        user_id: user.id,
        member_id: memberId,
        active_challenge_id: challengeId,
        challenge_role: 'member',
        challenge_status: 'invited',
        invited_to_challenge_at: new Date().toISOString()
      }));

      // UPSERT team_members records (insert if not exists, update if exists)
      const { error: upsertError } = await supabase
        .from('team_members')
        .upsert(updates, {
          onConflict: 'user_id,member_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('Failed to upsert team_members:', upsertError);
        throw upsertError;
      }

      console.log('✅ Updated team_members with challenge invitations');

      // @ts-ignore - Used for future feature
      const friendCount = selectedFriends.size;
      
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to send invitations:', error);
      alert('Failed to send invitations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFriends(new Set());
    onClose();
  };

  if (!isOpen) return null;

  const maxAdditional = 5 - alreadyInvitedUserIds.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#151A25] rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Invite More Friends
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {challengeTitle}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[55vh]">
          {/* Challenge Summary */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-gray-800 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                <span className="font-bold text-gray-900 dark:text-white">{maxAdditional}</span> spots left
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                Already invited: <span className="font-bold text-gray-900 dark:text-white">{alreadyInvitedUserIds.length}</span>
              </span>
            </div>
          </div>

          {/* Friends List */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
              Select Friends ({selectedFriends.size}/{maxAdditional})
            </p>
            
            {teamMembers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-2 font-semibold">
                  {alreadyInvitedUserIds.length >= 5 
                    ? 'Team is full'
                    : 'No more friends available'
                  }
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {alreadyInvitedUserIds.length >= 5 
                    ? 'Maximum 6 members (including you)'
                    : 'Add friends in Team tab to invite them'
                  }
                </p>
              </div>
            ) : (
              teamMembers.map((member) => {
                const isSelected = selectedFriends.has(member.id);
                const canSelect = isSelected || selectedFriends.size < maxAdditional;
                
                return (
                  <button
                    key={member.id}
                    onClick={() => canSelect && toggleFriend(member.id)}
                    disabled={!canSelect}
                    className={`w-full p-3.5 rounded-xl flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md scale-[1.02]'
                        : canSelect
                          ? 'bg-gray-50 dark:bg-[#0B101B] hover:bg-gray-100 dark:hover:bg-gray-800/50 border border-gray-200 dark:border-gray-800'
                          : 'bg-gray-100 dark:bg-gray-900 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.display_name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-sm">{member.display_name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    {/* Name */}
                    <span className="flex-1 text-left font-semibold text-sm">
                      {member.display_name}
                    </span>

                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'border-white bg-white/20'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0B101B]">
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-300 dark:hover:bg-gray-700 active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSendInvitations}
              disabled={loading || selectedFriends.size === 0}
              className={`flex-1 px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
                loading || selectedFriends.size === 0
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg active:scale-[0.98]'
              }`}
            >
              {loading ? 'Sending...' : selectedFriends.size > 0 ? `Send ${selectedFriends.size} Invitation${selectedFriends.size !== 1 ? 's' : ''}` : 'Select Friends'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
