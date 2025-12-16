import { teamService, type TeamMember, type TeamInvitation, type ChallengeAssignment, type UserProfile } from '../../lib/auth';
import { getInitials, getColorFromName } from './utils';

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
      {/* RECEIVED INVITATIONS */}
      {receivedInvitations.length > 0 && (
        <section>
          <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-3xl p-5">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>📬</span>
              <span>Invitations</span>
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {receivedInvitations.length}
              </span>
            </h2>
            
            <div className="space-y-3">
              {receivedInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-3"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ backgroundColor: getColorFromName(invitation.sender_name) }}
                    >
                      {getInitials(invitation.sender_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-sm mb-1">
                        {invitation.sender_name || invitation.sender_email}
                      </h3>
                      <div className="text-xs text-blue-400 mb-1">
                        wants to team up!
                      </div>
                      {invitation.message && (
                        <p className="text-xs text-white/60 italic">
                          "{invitation.message}"
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-bold text-sm transition-all"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectInvitation(invitation.id)}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl font-medium text-sm transition-all"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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

      {/* TEAM MEMBERS */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">
            Team ({teamMembers.length})
          </h2>
          {!userProfile?.is_guest && (
            <button
              onClick={onInviteClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Invite
            </button>
          )}
        </div>

        {teamMembers.length === 0 ? (
          <div className="bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-pink-900/30 border border-white/10 rounded-3xl p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-black text-white mb-2">Build Your Team</h3>
            <p className="text-white/60 text-sm mb-6">
              Invite friends and family to start your journey together
            </p>
            {!userProfile?.is_guest && (
              <button
                onClick={onInviteClick}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Send First Invite
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers.map((member) => {
              // Get display name - priority: custom_name > display_name > email
              const displayName = member.custom_name || member.display_name || member.email.split('@')[0];
              const showRelationship = member.relationship && member.relationship.trim().length > 0;
              
              return (
                <button
                  key={member.id}
                  onClick={() => onMemberSelect(member)}
                  className="w-full bg-[#151A25] border border-white/5 hover:bg-[#1A1F2E] hover:border-blue-500/30 rounded-2xl p-4 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0 ring-2 ring-white/10 group-hover:ring-blue-500/50 transition-all"
                      style={{ backgroundColor: getColorFromName(displayName) }}
                    >
                      {getInitials(displayName)}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-white text-base truncate">
                          {displayName}
                        </h3>
                        {showRelationship && (
                          <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-500/30 flex-shrink-0">
                            {member.relationship}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs">
                        <div className="text-white/50">
                          {member.active_challenges_count} active challenge{member.active_challenges_count !== 1 ? 's' : ''}
                        </div>
                        {member.tier === 'pro' && (
                          <div className="text-amber-400 font-bold flex items-center gap-1">
                            <span>⭐</span>
                            <span>PRO</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* SENT INVITATIONS */}
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
