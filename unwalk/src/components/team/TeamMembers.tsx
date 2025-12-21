import { teamService, type TeamMember, type TeamInvitation, type UserProfile } from '../../lib/auth';
import { TeamSlots } from './TeamSlots';
import { ReceivedInvitationsSlots } from './ReceivedInvitationsSlots';
import { useState, useEffect, useRef } from 'react';

interface TeamMembersProps {
  teamMembers: TeamMember[];
  receivedInvitations: TeamInvitation[];
  sentInvitations: TeamInvitation[];
  userProfile: UserProfile | null;
  onMemberSelect: (member: TeamMember) => void;
  onInviteClick: () => void;
  onRefresh: () => void;
}

export function TeamMembers({
  teamMembers,
  receivedInvitations,
  sentInvitations,
  userProfile,
  onMemberSelect,
  onInviteClick,
  onRefresh,
}: TeamMembersProps) {
  const [acceptedTeamsCount, setAcceptedTeamsCount] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load accepted teams count (how many teams user is already a member of)
  useEffect(() => {
    const loadTeamStats = async () => {
      // For now, we'll use teamMembers.length as a proxy
      // In future, we should track which teams the user has joined
      if (isMounted.current) {
        setAcceptedTeamsCount(teamMembers.length);
      }
    };
    loadTeamStats();
  }, [teamMembers]);

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const { error } = await teamService.acceptInvitation(invitationId);
      if (error) throw error;
      if (isMounted.current) onRefresh();
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      alert('Failed to accept invitation. Please try again.');
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      const { error } = await teamService.rejectInvitation(invitationId);
      if (error) throw error;
      if (isMounted.current) onRefresh();
    } catch (err) {
      console.error('Failed to reject invitation:', err);
      alert('Failed to reject invitation. Please try again.');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Cancel this invitation?')) return;

    try {
      const { error } = await teamService.cancelInvitation(invitationId);
      if (error) throw error;
      if (isMounted.current) onRefresh();
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
      alert('Failed to cancel invitation. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* RECEIVED INVITATIONS with 5-team limit */}
      <ReceivedInvitationsSlots
        receivedInvitations={receivedInvitations}
        acceptedTeamsCount={acceptedTeamsCount}
        onAccept={handleAcceptInvitation}
        onReject={handleRejectInvitation}
      />

      {/* TEAM SLOTS - Your team roster */}
      <TeamSlots
        teamMembers={teamMembers}
        userProfile={userProfile}
        onInviteClick={onInviteClick}
        onMemberClick={onMemberSelect}
        invitedCount={sentInvitations.filter(inv => inv.status === 'pending').length}
      />

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
