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

      // Get all team members (excluding current user and already invited)
      const { data, error } = await supabase
        .from('team_members')
        .select('member_id, member:users!member_id(id, display_name, avatar_url)')
        .eq('user_id', user.id)
        .neq('member_id', user.id);

      if (error) throw error;

      const members = (data || [])
        .filter((m: any) => m.member)
        .filter((m: any) => !alreadyInvitedUserIds.includes(m.member.id)) // Filter out already invited
        .map((m: any) => ({
          id: m.member.id,
          display_name: m.member.display_name || 'Unknown',
          avatar_url: m.member.avatar_url
        }));

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
      // Check if we can add more (max 4 additional invites - total 5 including you)
      const maxAdditional = 4 - alreadyInvitedUserIds.length;
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

      // Get sender profile for email
      const { data: senderProfile } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', user.id)
        .single();

      // Get challenge details
      const { data: challenge } = await supabase
        .from('admin_challenges')
        .select('title, goal_steps, time_limit_hours')
        .eq('id', challengeId)
        .single();

      // Send invitations to selected members
      const invitations = Array.from(selectedFriends).map(memberId => ({
        invited_by: user.id,
        invited_user: memberId,
        challenge_id: challengeId,
        status: 'pending'
      }));

      const { error: inviteError } = await supabase
        .from('team_challenge_invitations')
        .upsert(invitations, {
          onConflict: 'invited_user,challenge_id,invited_by',
          ignoreDuplicates: false
        });

      if (inviteError) throw inviteError;

      // 🎯 Send email + push notification for each invitation via Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      for (const memberId of Array.from(selectedFriends)) {
        try {
          // Get recipient email
          const { data: recipient } = await supabase
            .from('users')
            .select('email, display_name')
            .eq('id', memberId)
            .single();

          if (!recipient?.email) {
            console.warn(`No email found for user ${memberId}`);
            continue;
          }

          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-team-challenge-invitation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              recipientEmail: recipient.email,
              recipientName: recipient.display_name || recipient.email.split('@')[0],
              senderName: senderProfile?.display_name || senderProfile?.email?.split('@')[0] || 'Someone',
              senderEmail: senderProfile?.email,
              challengeTitle: challenge?.title || challengeTitle,
              challengeGoalSteps: challenge?.goal_steps || 0,
              challengeTimeLimit: challenge?.time_limit_hours || 0,
              invitedUserId: memberId,
            }),
          });

          if (!emailResponse.ok) {
            console.error('❌ Failed to send invitation email:', await emailResponse.text());
          } else {
            console.log('📧 Invitation email sent to:', recipient.email);
          }
        } catch (emailError) {
          console.error('❌ Email sending error:', emailError);
        }
      }

      const friendCount = selectedFriends.size;
      alert(`✅ Sent ${friendCount} invitation${friendCount > 1 ? 's' : ''}`);

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to send invitations:', error);
      alert('❌ Failed to send invitations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFriends(new Set());
    onClose();
  };

  if (!isOpen) return null;

  const maxAdditional = 4 - alreadyInvitedUserIds.length;

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
                  {alreadyInvitedUserIds.length >= 4 
                    ? 'Team is full'
                    : 'No more friends available'
                  }
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {alreadyInvitedUserIds.length >= 4 
                    ? 'Maximum 5 members (including you)'
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
