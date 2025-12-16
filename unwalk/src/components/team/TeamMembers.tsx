import { teamService, type TeamMember, type TeamInvitation, type ChallengeAssignment, type UserProfile } from '../../lib/auth';
import { getInitials, getColorFromName } from './utils';
import { TeamSlots } from './TeamSlots';
import { ReceivedInvitationsSlots } from './ReceivedInvitationsSlots';
import { useState, useEffect } from 'react';

interface TeamMembersProps {
  teamMembers: TeamMember[];
  receivedInvitations: TeamInvitation[];
  receivedChallenges: ChallengeAssignment[];
  sentInvitations: TeamInvitation[];
  userProfile: UserProfile | null;
  onMemberSelect: (member: TeamMember) => void;
  onInviteClick: () => void;
  onRefresh: () => void;
}

export function TeamMembers({
  teamMembers,
  receivedInvitations,
  receivedChallenges,
  sentInvitations,
  userProfile,
  onMemberSelect,
  onInviteClick,
  onRefresh,
}: TeamMembersProps) {
  const [acceptedTeamsCount, setAcceptedTeamsCount] = useState(0);

  // Load accepted teams count (how many teams user is already a member of)
  useEffect(() => {
    const loadTeamStats = async () => {
      // For now, we'll use teamMembers.length as a proxy
      // In future, we should track which teams the user has joined
      setAcceptedTeamsCount(teamMembers.length);
    };
    loadTeamStats();
  }, [teamMembers]);

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const { error } = await teamService.acceptInvitation(invitationId);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      alert('Failed to accept invitation. Please try again.');
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      const { error } = await teamService.rejectInvitation(invitationId);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Failed to reject invitation:', err);
      alert('Failed to reject invitation. Please try again.');
    }
  };

  const handleAcceptChallenge = async (assignmentId: string) => {
    try {
      const { error } = await teamService.acceptChallengeAssignment(assignmentId);
      if (error) throw error;
      onRefresh();
      window.location.reload();
    } catch (err) {
      console.error('Failed to accept challenge:', err);
      alert('Failed to accept challenge. You might already have an active challenge.');
    }
  };

  const handleRejectChallenge = async (assignmentId: string) => {
    try {
      const { error } = await teamService.rejectChallengeAssignment(assignmentId);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Failed to reject challenge:', err);
      alert('Failed to reject challenge. Please try again.');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Cancel this invitation?')) return;

    try {
      const { error } = await teamService.cancelInvitation(invitationId);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
      alert('Failed to cancel invitation. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* TEAM SLOTS - Your team roster */}
      <TeamSlots
        teamMembers={teamMembers}
        userProfile={userProfile}
        onInviteClick={onInviteClick}
        onMemberClick={onMemberSelect}
        invitedCount={sentInvitations.filter(inv => inv.status === 'pending').length}
      />

      {/* RECEIVED INVITATIONS with 5-team limit */}
      <ReceivedInvitationsSlots
        receivedInvitations={receivedInvitations}
        acceptedTeamsCount={acceptedTeamsCount}
        onAccept={handleAcceptInvitation}
        onReject={handleRejectInvitation}
      />

      {/* RECEIVED CHALLENGES (PENDING ONLY) */}
      {receivedChallenges.length > 0 && (
        <section>
          <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-3xl p-5">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>🎯</span>
              <span>Challenges for You</span>
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {receivedChallenges.length}
              </span>
            </h2>
            
            <div className="space-y-3">
              {receivedChallenges.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
                >
                  <div className="relative aspect-[3/2]">
                    <img
                      src={assignment.challenge_image_url}
                      alt={assignment.challenge_title}
                      className="w-full h-full object-cover transition-all duration-500"
                      style={{ filter: 'blur(20px)' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-3">
                      <div className="text-white flex-1">
                        <div className="text-sm font-bold mb-1 drop-shadow-lg">{assignment.challenge_title}</div>
                        <div className="text-xs text-white/70">
                          {(assignment.challenge_goal_steps / 1000).toFixed(0)}k steps
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: getColorFromName(assignment.sender_name) }}
                      >
                        {getInitials(assignment.sender_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white/60">From</div>
                        <div className="font-bold text-white text-sm truncate">
                          {assignment.sender_name || 'Team Member'}
                        </div>
                      </div>
                    </div>

                    {assignment.message && (
                      <p className="text-xs text-white/70 italic mb-3 bg-white/5 rounded-lg p-2">
                        "{assignment.message}"
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptChallenge(assignment.id)}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2.5 rounded-xl font-bold text-sm transition-all"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectChallenge(assignment.id)}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-medium text-sm transition-all"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SENT INVITATIONS - moved to bottom, simplified */}
      {sentInvitations.filter(inv => inv.status === 'pending').length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-white/60 mb-3 px-1 uppercase tracking-wider">
            Pending Invites
          </h2>
          <div className="space-y-2">
            {sentInvitations.filter(inv => inv.status === 'pending').map((invitation) => (
              <div
                key={invitation.id}
                className="bg-[#151A25] border border-white/5 rounded-2xl p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm truncate">
                    {invitation.recipient_email}
                  </div>
                  <div className="text-xs text-white/50">
                    Sent {new Date(invitation.invited_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleCancelInvitation(invitation.id)}
                  className="text-red-400 hover:text-red-300 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
