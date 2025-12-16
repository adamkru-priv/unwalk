import { useState, useEffect } from 'react';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { teamService, authService, type TeamMember, type TeamInvitation, type UserProfile, type ChallengeAssignment } from '../../lib/auth';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { TeamMembers } from './TeamMembers';
import { SentChallenges } from './SentChallenges';
import { ReceivedChallenges } from './ReceivedChallenges';
import { InviteModal } from './InviteModal';
import { MemberDetail } from './MemberDetail';

export function TeamScreen() {
  const setCurrentScreen = useChallengeStore((state) => state.setCurrentScreen);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<TeamInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<TeamInvitation[]>([]);
  const [receivedChallenges, setReceivedChallenges] = useState<ChallengeAssignment[]>([]);
  const [sentChallengeHistory, setSentChallengeHistory] = useState<ChallengeAssignment[]>([]);
  const [receivedChallengeHistory, setReceivedChallengeHistory] = useState<ChallengeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeTab, setActiveTab] = useState<'team' | 'sent' | 'received'>('team');

  useEffect(() => {
    loadUserAndTeamData();
  }, []);

  const loadUserAndTeamData = async () => {
    setLoading(true);
    try {
      console.log('🔄 [TeamScreen] Loading team data...');
      
      const [profile, members, received, sent, challenges, sentHistory, receivedHistory] = await Promise.all([
        authService.getUserProfile(),
        teamService.getTeamMembers(),
        teamService.getReceivedInvitations(),
        teamService.getSentInvitations(),
        teamService.getReceivedChallenges(),
        teamService.getSentChallengeAssignments(),
        teamService.getReceivedChallengeHistory(),
      ]);

      console.log('✅ [TeamScreen] User profile loaded:', profile);
      console.log('✅ [TeamScreen] Team members:', members.length);
      console.log('✅ [TeamScreen] Is guest?', profile?.is_guest);

      setUserProfile(profile);
      setTeamMembers(members);
      setReceivedInvitations(received.filter(inv => inv.status === 'pending'));
      setSentInvitations(sent);
      setReceivedChallenges(challenges);
      setSentChallengeHistory(sentHistory);
      setReceivedChallengeHistory(receivedHistory);
      
      console.log('✅ [TeamScreen] All team data loaded successfully');
    } catch (error) {
      console.error('❌ [TeamScreen] Failed to load team data:', error);
      // Set empty data to unblock UI
      setUserProfile(null);
      setTeamMembers([]);
      setReceivedInvitations([]);
      setSentInvitations([]);
      setReceivedChallenges([]);
      setSentChallengeHistory([]);
      setReceivedChallengeHistory([]);
    } finally {
      setLoading(false);
      console.log('✅ [TeamScreen] Loading complete');
    }
  };

  const handleInviteClick = () => {
    setShowInviteModal(true);
  };

  // If member selected, show detail view
  if (selectedMember) {
    return (
      <MemberDetail
        member={selectedMember}
        onBack={() => setSelectedMember(null)}
        onRemoved={() => {
          setSelectedMember(null);
          loadUserAndTeamData();
        }}
      />
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B101B] text-white pb-24 font-sans">
        <AppHeader />
        <main className="px-5 pt-6 pb-6 max-w-md mx-auto">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-white/50 text-sm mt-3">Loading team...</p>
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
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        userProfile={userProfile}
        onInviteSent={loadUserAndTeamData}
      />

      <main className="px-5 pt-6 pb-6 max-w-md mx-auto space-y-6">
        
        {/* Guest users see locked screen */}
        {userProfile?.is_guest ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                <div className="text-6xl">👥</div>
              </div>
              <div className="absolute -top-2 -right-2 w-16 h-16 bg-gray-900/90 backdrop-blur-md border-2 border-blue-500/50 rounded-full flex items-center justify-center shadow-2xl">
                <div className="text-2xl">🔒</div>
              </div>
            </div>

            <h2 className="text-2xl font-black text-white mb-3">
              Build Your Team
            </h2>
            
            <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-sm">
              Create a free account to invite friends and family. Walk together, share challenges, and stay motivated!
            </p>

            <div className="bg-[#151A25] border border-white/10 rounded-2xl p-5 mb-6 max-w-sm">
              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">📨</div>
                  <div>
                    <div className="text-white font-semibold text-sm mb-1">Invite Friends & Family</div>
                    <div className="text-white/50 text-xs">Send challenges and walk together</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">📊</div>
                  <div>
                    <div className="text-white font-semibold text-sm mb-1">Compare Progress</div>
                    <div className="text-white/50 text-xs">See who's winning and stay motivated</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">🎯</div>
                  <div>
                    <div className="text-white font-semibold text-sm mb-1">Team Challenges</div>
                    <div className="text-white/50 text-xs">Create group goals and achieve together</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentScreen('profile')}
              className="w-full max-w-sm bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-4 rounded-2xl font-bold text-base transition-all shadow-lg shadow-blue-500/20"
            >
              Sign Up Free
            </button>

            <p className="text-white/40 text-xs mt-4">
              Free forever • No credit card • Keep your progress
            </p>
          </div>
        ) : (
          <>
            {/* TABS NAVIGATION */}
            <div className="bg-[#151A25] border border-white/10 rounded-2xl p-1 grid grid-cols-3 gap-1">
              <button
                onClick={() => setActiveTab('team')}
                className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'team'
                    ? 'bg-blue-600 text-white'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                Team
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all relative ${
                  activeTab === 'sent'
                    ? 'bg-blue-600 text-white'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                Sent
                {sentChallengeHistory.filter(c => c.status === 'pending').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full text-xs flex items-center justify-center">
                    {sentChallengeHistory.filter(c => c.status === 'pending').length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('received')}
                className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all relative ${
                  activeTab === 'received'
                    ? 'bg-blue-600 text-white'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                Received
                {receivedChallengeHistory.filter(c => c.status === 'pending').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                    {receivedChallengeHistory.filter(c => c.status === 'pending').length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'team' && (
              <TeamMembers
                teamMembers={teamMembers}
                receivedInvitations={receivedInvitations}
                receivedChallenges={receivedChallenges}
                sentInvitations={sentInvitations}
                userProfile={userProfile}
                onMemberSelect={setSelectedMember}
                onInviteClick={handleInviteClick}
                onRefresh={loadUserAndTeamData}
              />
            )}

            {activeTab === 'sent' && (
              <SentChallenges
                challenges={sentChallengeHistory}
                onRefresh={loadUserAndTeamData}
              />
            )}

            {activeTab === 'received' && (
              <ReceivedChallenges
                challenges={receivedChallengeHistory}
                onRefresh={loadUserAndTeamData}
              />
            )}
          </>
        )}
      </main>

      <BottomNavigation currentScreen="team" />
    </div>
  );
}