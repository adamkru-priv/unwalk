import { useState, useEffect } from 'react';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { teamService, type TeamMember, type TeamInvitation, type ChallengeAssignment } from '../../lib/auth';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { TeamMembers } from './TeamMembers';
import { SentChallenges } from './SentChallenges';
import { SentTeamChallengeInvitations } from './SentTeamChallengeInvitations';
import { ReceivedChallenges } from './ReceivedChallenges';
import { TeamChallengeInvitations } from './TeamChallengeInvitations';
import { InviteModal } from './InviteModal';
import { MemberDetail } from './MemberDetail';

// 🔧 Helper function: Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = i === maxRetries - 1;
      
      if (isLastAttempt) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, i);
      console.log(`⏳ Retry attempt ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

export function TeamScreen() {
  const setCurrentScreen = useChallengeStore((state) => state.setCurrentScreen);
  const userProfile = useChallengeStore((s) => s.userProfile);
  const assignTarget = useChallengeStore((s) => s.assignTarget);
  const setAssignTarget = useChallengeStore((s) => s.setAssignTarget);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<TeamInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<TeamInvitation[]>([]);
  const [sentChallengeHistory, setSentChallengeHistory] = useState<ChallengeAssignment[]>([]);
  const [receivedChallengeHistory, setReceivedChallengeHistory] = useState<ChallengeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeTab, setActiveTab] = useState<'team' | 'sent' | 'received'>('team');
  
  // 🎯 NEW: Track Team Challenge invitations counts
  const [sentTeamChallengeCount, setSentTeamChallengeCount] = useState(0);
  const [receivedTeamChallengeCount, setReceivedTeamChallengeCount] = useState(0);

  // ✅ Reload data when userProfile changes (e.g. after auth init)
  useEffect(() => {
    if (userProfile?.id) {
      loadTeamData();
    }
  }, [userProfile?.id]);

  // When coming from Home quick-assign, open member details automatically
  useEffect(() => {
    if (!assignTarget?.id) return;
    if (loading) return;
    if (userProfile?.is_guest) return;

    const m = teamMembers.find((tm) => tm.member_id === assignTarget.id);
    if (m) {
      setSelectedMember(m);
      // Clear to avoid reopening on back
      setAssignTarget(null);
    }
  }, [assignTarget?.id, loading, userProfile?.is_guest, teamMembers]);

  const loadTeamData = async () => {
    setLoading(true);

    try {
      console.log('🔄 [TeamScreen] Loading team data...');
      
      // ✅ Use profile from store
      console.log('✅ [TeamScreen] Using profile from store:', { is_guest: userProfile?.is_guest });

      // ✅ SAFETY CHECK: If profile is missing (shouldn't happen if App handles isAppReady correctly, but good for safety)
      if (!userProfile) {
        console.log('⏳ [TeamScreen] No user profile yet - waiting...');
        setLoading(false); // Ensure loading is turned off
        return;
      }
      
      // ✅ If guest, skip loading team data
      if (userProfile?.is_guest) {
        console.log('👤 [TeamScreen] Guest user detected - skipping team data load');
        setTeamMembers([]);
        setReceivedInvitations([]);
        setSentInvitations([]);
        setSentChallengeHistory([]);
        setReceivedChallengeHistory([]);
        setLoading(false);
        return;
      }
      
      // 🔧 NEW: Check and refresh session before loading data
      const { supabase } = await import('../../lib/supabase');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        console.log('⚠️ [TeamScreen] No valid session, attempting refresh...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ [TeamScreen] Failed to refresh session:', refreshError);
          setLoading(false);
          return;
        }
        
        console.log('✅ [TeamScreen] Session refreshed successfully');
      }
      
      // 🔧 NEW: Load data with retry mechanism
      
      // 1. Team Members
      try {
        const members = await retryWithBackoff(() => teamService.getTeamMembers());
        setTeamMembers(members);
      } catch (e) {
        console.error('❌ [TeamScreen] Failed to load members after retries:', e);
        setTeamMembers([]);
      }

      // 2. Invitations (Parallel)
      try {
        const [received, sent] = await retryWithBackoff(() =>
          Promise.all([
            teamService.getReceivedInvitations(),
            teamService.getSentInvitations()
          ])
        );
        
        setReceivedInvitations(received.filter(inv => inv.status === 'pending'));
        setSentInvitations(sent);
      } catch (e) {
        console.error('❌ [TeamScreen] Failed to load invitations after retries:', e);
        setReceivedInvitations([]);
        setSentInvitations([]);
      }

      // 3. Challenges (Parallel)
      try {
        const [sentHistory, receivedHistory] = await retryWithBackoff(() =>
          Promise.all([
            teamService.getSentChallengeAssignments(),
            teamService.getReceivedChallengeHistory(),
          ])
        );
        
        setSentChallengeHistory(sentHistory);
        setReceivedChallengeHistory(receivedHistory);
      } catch (e) {
        console.error('❌ [TeamScreen] Failed to load challenges after retries:', e);
        setSentChallengeHistory([]);
        setReceivedChallengeHistory([]);
      }

      // 🎯 NEW: 4. Team Challenge invitations counts from team_members
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const [sentCountResult, receivedCountResult] = await retryWithBackoff(() =>
            Promise.all([
              supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('challenge_status', 'invited')
                .not('active_challenge_id', 'is', null),
              supabase
                .from('team_members')
                .select('*', { count: 'exact', head: true })
                .eq('member_id', user.id)
                .eq('challenge_status', 'invited')
                .not('active_challenge_id', 'is', null)
            ])
          );
          
          setSentTeamChallengeCount(sentCountResult.count || 0);
          setReceivedTeamChallengeCount(receivedCountResult.count || 0);
          
          console.log('✅ [TeamScreen] Team Challenge counts:', { 
            sent: sentCountResult.count, 
            received: receivedCountResult.count 
          });
        }
      } catch (e) {
        console.error('❌ [TeamScreen] Failed to load Team Challenge counts after retries:', e);
        setSentTeamChallengeCount(0);
        setReceivedTeamChallengeCount(0);
      }
      
      console.log('✅ [TeamScreen] All team data loaded successfully');
    } catch (error) {
      console.error('❌ [TeamScreen] Critical error loading team data:', error);
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
          loadTeamData();
        }}
      />
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B101B] text-white pb-24 font-sans">
        <AppHeader />
        <main className="px-5 pt-6 pb-6">
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
        onInviteSent={loadTeamData}
      />

      <main className="px-5 pt-6 pb-6 space-y-6"> {/* 🎯 REMOVED: max-w-md mx-auto for full width */}
        
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
                {/* 🎯 UPDATED: Include Team Challenge invitations + regular challenge assignments */}
                {(sentChallengeHistory.filter(c => c.status === 'pending').length + sentTeamChallengeCount) > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full text-xs flex items-center justify-center font-bold">
                    {sentChallengeHistory.filter(c => c.status === 'pending').length + sentTeamChallengeCount}
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
                {/* 🎯 UPDATED: Include Team Challenge invitations + regular challenge assignments */}
                {(receivedChallengeHistory.filter(c => c.status === 'pending').length + receivedTeamChallengeCount) > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                    {receivedChallengeHistory.filter(c => c.status === 'pending').length + receivedTeamChallengeCount}
                  </span>
                )}
              </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'team' && (
              <TeamMembers
                teamMembers={teamMembers}
                receivedInvitations={receivedInvitations}
                sentInvitations={sentInvitations}
                userProfile={userProfile}
                onMemberSelect={setSelectedMember}
                onInviteClick={handleInviteClick}
                onRefresh={loadTeamData}
              />
            )}

            {activeTab === 'sent' && (
              <>
                {/* 🎯 NEW: Sent Team Challenge Invitations */}
                <SentTeamChallengeInvitations onRefresh={loadTeamData} />
                
                {/* Regular challenge assignments */}
                <SentChallenges
                  challenges={sentChallengeHistory}
                  onRefresh={loadTeamData}
                />
              </>
            )}

            {activeTab === 'received' && (
              <>
                {/* 🎯 NEW: Team Challenge Invitations */}
                <TeamChallengeInvitations onRefresh={loadTeamData} />
                
                {/* Regular challenge assignments */}
                <ReceivedChallenges
                  challenges={receivedChallengeHistory}
                  onRefresh={loadTeamData}
                />
              </>
            )}
          </>
        )}
      </main>

      <BottomNavigation currentScreen="team" />
    </div>
  );
}