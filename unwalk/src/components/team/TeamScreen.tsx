import { useState, useEffect } from 'react';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { teamService, authService, type TeamMember as ApiTeamMember, type TeamInvitation, type UserProfile } from '../../lib/auth';
import { useChallengeStore } from '../../stores/useChallengeStore';

export function TeamScreen() {
  const setCurrentScreen = useChallengeStore((state) => state.setCurrentScreen);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<ApiTeamMember[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<TeamInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<ApiTeamMember | null>(null);

  useEffect(() => {
    loadUserAndTeamData();
  }, []);

  const loadUserAndTeamData = async () => {
    setLoading(true);
    try {
      const [profile, members, received, sent] = await Promise.all([
        authService.getUserProfile(),
        teamService.getTeamMembers(),
        teamService.getReceivedInvitations(),
        teamService.getSentInvitations(),
      ]);

      console.log('🔍 [TeamScreen] User profile loaded:', profile);
      console.log('🔍 [TeamScreen] Is guest?', profile?.is_guest);

      setUserProfile(profile);
      setTeamMembers(members);
      setReceivedInvitations(received.filter(inv => inv.status === 'pending'));
      setSentInvitations(sent);
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamData = async () => {
    setLoading(true);
    try {
      const [members, received, sent] = await Promise.all([
        teamService.getTeamMembers(),
        teamService.getReceivedInvitations(),
        teamService.getSentInvitations(),
      ]);

      setTeamMembers(members);
      setReceivedInvitations(received.filter(inv => inv.status === 'pending'));
      setSentInvitations(sent);
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteLoading(true);

    try {
      const { error } = await teamService.sendInvitation(inviteEmail, inviteMessage || undefined);
      
      if (error) throw error;

      // Success! Close modal and refresh
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteMessage('');
      await loadTeamData();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const { error } = await teamService.acceptInvitation(invitationId);
      if (error) throw error;

      // Refresh data
      await loadTeamData();
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      alert('Failed to accept invitation. Please try again.');
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      const { error } = await teamService.rejectInvitation(invitationId);
      if (error) throw error;

      // Refresh data
      await loadTeamData();
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

      // Immediately remove from state for instant UI update
      setSentInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      // Also refresh data from backend
      await loadTeamData();
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
      alert('Failed to cancel invitation. Please try again.');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from your team?`)) return;

    try {
      const { error } = await teamService.removeMember(memberId);
      if (error) throw error;

      // Refresh data
      await loadTeamData();
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert('Failed to remove team member. Please try again.');
    }
  };

  const handleInviteClick = () => {
    if (userProfile?.is_guest) {
      // Show guest restriction message
      setInviteError('You need to sign up to invite team members');
      setShowInviteModal(true);
    } else {
      setInviteError(null);
      setShowInviteModal(true);
    }
  };

  // Get initials from name
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate color from name
  const getColorFromName = (name: string | null | undefined) => {
    if (!name) return '#3B82F6';
    
    const colors = [
      '#3B82F6', // blue
      '#F59E0B', // amber
      '#10B981', // green
      '#EC4899', // pink
      '#8B5CF6', // purple
      '#EF4444', // red
      '#06B6D4', // cyan
      '#F97316', // orange
    ];
    
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // If member selected, show detail view
  if (selectedMember) {
    return (
      <div className="min-h-screen bg-[#0B101B] text-white pb-24 font-sans">
        <AppHeader showBackButton />
        
        <main className="px-5 pt-6 pb-6 max-w-md mx-auto space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setSelectedMember(null)}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-bold">Back to Team</span>
          </button>

          {/* Member Profile */}
          <section className="bg-[#151A25] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-4 mb-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: getColorFromName(selectedMember.display_name) }}
              >
                {getInitials(selectedMember.display_name)}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-1">
                  {selectedMember.display_name || selectedMember.email}
                </h2>
                <div className="text-xs text-white/60">{selectedMember.email}</div>
              </div>
              <button
                onClick={() => handleRemoveMember(selectedMember.member_id, selectedMember.display_name || 'this member')}
                className="text-red-400 hover:text-red-300 text-sm font-bold"
              >
                Remove
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0B101B] rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-white">{selectedMember.active_challenges_count}</div>
                <div className="text-xs text-white/50 mt-0.5">Active</div>
              </div>
              <div className="bg-[#0B101B] rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-blue-400">{selectedMember.tier === 'pro' ? 'PRO' : 'Basic'}</div>
                <div className="text-xs text-white/50 mt-0.5">Tier</div>
              </div>
            </div>
          </section>

          {/* Send Challenge Button */}
          <button 
            onClick={() => {
              // Zapisz wybranego członka do store i przejdź do Challenges
              useChallengeStore.getState().setAssignTarget({
                id: selectedMember.member_id,
                name: selectedMember.display_name || selectedMember.email,
                email: selectedMember.email
              });
              setCurrentScreen('library');
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold text-sm transition-all"
          >
            Send Challenge to {selectedMember.display_name || 'Member'}
          </button>

          {/* TODO: Show shared challenges */}
          <div className="text-center text-white/50 text-sm py-8">
            Challenge history coming soon...
          </div>
        </main>

        <BottomNavigation currentScreen="team" />
      </div>
    );
  }

  // Main team list view
  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-24 font-sans">
      <AppHeader />

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5" onClick={() => setShowInviteModal(false)}>
          <div 
            className="bg-[#151A25] rounded-3xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-4">Invite to Team</h2>
            
            {userProfile?.is_guest ? (
              // Guest user - show sign up prompt
              <div className="space-y-4">
                <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4">
                  <div className="text-4xl mb-3 text-center">🔐</div>
                  <h3 className="font-bold text-white text-center mb-2">Sign Up Required</h3>
                  <p className="text-sm text-white/70 text-center mb-4">
                    Create an account to invite friends and family to your team. Your progress will be saved!
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setCurrentScreen('profile');
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all"
                  >
                    Sign Up Now
                  </button>
                </div>
              </div>
            ) : (
              // Logged in user - show invite form
              <form onSubmit={handleSendInvitation} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-white/70 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="friend@example.com"
                    className="w-full px-4 py-3 rounded-xl border-2 border-white/10 bg-[#0B101B] text-white focus:border-blue-500 focus:outline-none transition-colors"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white/70 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Let's walk together!"
                    className="w-full px-4 py-3 rounded-xl border-2 border-white/10 bg-[#0B101B] text-white focus:border-blue-500 focus:outline-none transition-colors resize-none"
                    rows={3}
                  />
                </div>

                {inviteError && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-sm text-red-400">
                    {inviteError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                    {inviteLoading ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <main className="px-5 pt-6 pb-6 max-w-md mx-auto space-y-6">
        {/* Hero Header */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-white mb-1">Your Team</h1>
          <p className="text-sm text-white/50">Challenge friends & family</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-white/50 text-sm mt-3">Loading team...</p>
          </div>
        ) : (
          <>
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

            {/* TEAM MEMBERS */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">
                  Team ({teamMembers.length})
                </h2>
                {/* Hide Invite button for guests */}
                {!userProfile?.is_guest && (
                  <button
                    onClick={handleInviteClick}
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
                // Beautiful empty state
                <div className="relative overflow-hidden">
                  {/* Gradient background card */}
                  <div className="bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-pink-900/30 border border-white/10 rounded-3xl p-8 text-center relative">
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
                    
                    {/* Content */}
                    <div className="relative z-10">
                      {/* Animated illustration */}
                      <div className="mb-6 relative inline-block">
                        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
                          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        {/* Pulse animation */}
                        <div className="absolute inset-0 w-24 h-24 mx-auto bg-blue-500/30 rounded-full animate-ping"></div>
                      </div>

                      {/* Title */}
                      <h3 className="text-2xl font-black text-white mb-3">
                        Build Your Team
                      </h3>
                      
                      {/* Description */}
                      <p className="text-white/70 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
                        {userProfile?.is_guest 
                          ? 'Create an account to invite friends and family. Walk together, stay motivated!'
                          : 'Invite friends and family to start your walking journey together. Stay motivated as a team!'
                        }
                      </p>

                      {/* Features list */}
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-6 text-left max-w-xs mx-auto">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span className="text-white/80 text-sm">Send challenges to friends</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <span className="text-white/80 text-sm">Compare progress & stats</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <span className="text-white/80 text-sm">Stay motivated together</span>
                          </div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      {userProfile?.is_guest ? (
                        <button
                          onClick={() => setCurrentScreen('profile')}
                          className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white px-8 py-3.5 rounded-2xl font-black text-sm transition-all shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transform"
                        >
                          Sign Up to Build Team →
                        </button>
                      ) : (
                        <button
                          onClick={handleInviteClick}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3.5 rounded-2xl font-black text-sm transition-all shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transform inline-flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Send First Invite
                        </button>
                      )}

                      {/* Helper text */}
                      <p className="text-white/40 text-xs mt-4">
                        It's more fun together! 🚶‍♀️🚶‍♂️
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // Team members grid
                <div className="grid grid-cols-2 gap-3">
                  {teamMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className="bg-[#151A25] border border-white/5 hover:bg-[#1A1F2E] hover:border-white/10 rounded-2xl p-4 transition-all text-left"
                    >
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-2"
                        style={{ backgroundColor: getColorFromName(member.display_name) }}
                      >
                        {getInitials(member.display_name)}
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-white text-sm mb-2 truncate">
                          {member.display_name || member.email.split('@')[0]}
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-xs text-white/50">
                            {member.active_challenges_count} active
                          </div>
                          {member.tier === 'pro' && (
                            <div className="inline-block bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded">
                              PRO
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* SENT INVITATIONS */}
            {sentInvitations.filter(inv => inv.status === 'pending').length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-white/60 mb-3 px-1 uppercase tracking-wider">
                  Pending Invites ({sentInvitations.filter(inv => inv.status === 'pending').length})
                </h2>
                
                <div className="space-y-2">
                  {sentInvitations
                    .filter(inv => inv.status === 'pending')
                    .map((invitation) => (
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
          </>
        )}
      </main>

      <BottomNavigation currentScreen="team" />
    </div>
  );
}