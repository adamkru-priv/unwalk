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
// 🎯 NEW: Import TeamHUD component from home sections
import { TeamHUD } from '../home/sections/TeamHUD';
import type { UserChallenge } from '../../types';
// 🎯 NEW: Import modals for Team Challenge selection
import { SelectTeamChallengeModal } from '../home/modals/SelectTeamChallengeModal';
import { InviteMoreToTeamChallengeModal } from '../home/modals/InviteMoreToTeamChallengeModal';

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
  const userProfile = useChallengeStore((s) => s.userProfile);
  const assignTarget = useChallengeStore((s) => s.assignTarget);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<TeamInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<TeamInvitation[]>([]);
  const [sentChallengeHistory, setSentChallengeHistory] = useState<ChallengeAssignment[]>([]);
  const [receivedChallengeHistory, setReceivedChallengeHistory] = useState<ChallengeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  // 🎯 UPDATED: Changed tabs from 'challenge' | 'team' | 'inbox' to 'challenge' | 'team' | 'activity'
  const [activeTab, setActiveTab] = useState<'challenge' | 'team' | 'activity'>('challenge');
  
  // 🎯 NEW: Track Team Challenge invitations counts
  const [sentTeamChallengeCount, setSentTeamChallengeCount] = useState(0);
  const [receivedTeamChallengeCount, setReceivedTeamChallengeCount] = useState(0);

  // 🎯 NEW: Team Challenge data (moved from HomeScreen)
  const [teamChallenge, setTeamChallenge] = useState<UserChallenge | null>(null);
  const [teamChallengeMembers, setTeamChallengeMembers] = useState<Array<{
    id: string;
    name: string;
    avatar?: string;
    steps: number;
    percentage: number;
    isCurrentUser?: boolean;
    isHost?: boolean;
  }>>([]);
  const [showTeamSelectModal, setShowTeamSelectModal] = useState(false);
  const [showInviteMoreModal, setShowInviteMoreModal] = useState(false);
  const [inviteMoreData, setInviteMoreData] = useState<{
    challengeId: string;
    challengeTitle: string;
    alreadyInvitedUserIds: string[];
  } | null>(null);

  // ✅ Reload data when userProfile changes (e.g. after auth init)
  useEffect(() => {
    if (userProfile?.id) {
      loadTeamData();
    }
  }, [userProfile?.id]);

  // When coming from Home quick-assign, open member details automatically
  useEffect(() => {
    if (!assignTarget?.id || loading) return;

    const isMember = teamMembers.some((m) => m.member_id === assignTarget.id);
    if (!isMember) {
      console.log('⚠️ [TeamScreen] Assign target is not a team member, resetting');
      useChallengeStore.setState({ assignTarget: null });
    }
  }, [assignTarget?.id, loading, teamMembers]);

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

      // 🎯 NEW: 5. Load active Team Challenge (moved from HomeScreen)
      try {
        await loadTeamChallenge();
      } catch (e) {
        console.error('❌ [TeamScreen] Failed to load team challenge:', e);
      }
      
      console.log('✅ [TeamScreen] All team data loaded successfully');
    } catch (error) {
      console.error('❌ [TeamScreen] Critical error loading team data:', error);
    } finally {
      setLoading(false);
      console.log('✅ [TeamScreen] Loading complete');
    }
  };

  // 🎯 NEW: Load team challenge (from useHomeData hook logic)
  const loadTeamChallenge = async () => {
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[TeamScreen] No authenticated user');
        setTeamChallenge(null);
        setTeamChallengeMembers([]);
        return;
      }

      console.log('[TeamScreen] Loading team challenge...');

      // 🎯 FIX: Use explicit foreign key column name instead of relationship
      const { data: teamChallengeData, error: teamChallengeError } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .not('team_id', 'is', null)
        .single();

      if (teamChallengeError) {
        if (teamChallengeError.code !== 'PGRST116') {
          console.error('[TeamScreen] Error loading team challenge:', teamChallengeError);
        }
        setTeamChallenge(null);
        setTeamChallengeMembers([]);
        return;
      }

      // 🎯 FIX: Load admin_challenge separately
      if (teamChallengeData?.admin_challenge_id) {
        const { data: adminChallenge } = await supabase
          .from('admin_challenges')
          .select('*')
          .eq('id', teamChallengeData.admin_challenge_id)
          .single();
        
        teamChallengeData.admin_challenge = adminChallenge;
      }

      setTeamChallenge(teamChallengeData as UserChallenge);

      // Load team members for this challenge
      if (teamChallengeData?.team_id) {
        const { data: membersData, error: membersError } = await supabase
          .from('user_challenges')
          .select('id, user_id, current_steps, started_at')
          .eq('team_id', teamChallengeData.team_id)
          .eq('status', 'active')
          .order('started_at', { ascending: true });

        if (membersError) {
          console.error('[TeamScreen] Error loading team members:', membersError);
          setTeamChallengeMembers([]);
          return;
        }

        // 🎯 FIX: Load user details separately for each member
        const membersWithUsers = await Promise.all(
          membersData.map(async (m: any) => {
            const { data: userData } = await supabase
              .from('users')
              .select('id, display_name, nickname, avatar_url')
              .eq('id', m.user_id)
              .single();
            
            return {
              ...m,
              users: userData
            };
          })
        );

        const goalSteps = teamChallengeData.admin_challenge?.goal_steps || 1;
        
        // 🎯 FIX: First member (earliest started_at) is the host
        const hostUserId = membersWithUsers?.[0]?.user_id;
        
        const formattedMembers = membersWithUsers.map((m: any) => ({
          id: m.id,
          name: m.users?.nickname || m.users?.display_name || 'Unknown',
          avatar: m.users?.avatar_url,
          steps: m.current_steps || 0,
          percentage: Math.round(((m.current_steps || 0) / goalSteps) * 100),
          isCurrentUser: m.user_id === user.id,
          isHost: m.user_id === hostUserId
        }));

        setTeamChallengeMembers(formattedMembers);
        console.log('[TeamScreen] Team challenge loaded with', formattedMembers.length, 'members');
        console.log('[TeamScreen] Host user_id:', hostUserId);
        console.log('[TeamScreen] Members:', formattedMembers);
      }
    } catch (error) {
      console.error('[TeamScreen] Error loading team challenge:', error);
      setTeamChallenge(null);
      setTeamChallengeMembers([]);
    }
  };

  // 🎯 NEW: Handlers for Team Challenge
  const handleTeamClick = () => {
    setShowTeamSelectModal(true);
  };

  const handleInviteMoreClick = (challengeId: string, challengeTitle: string, alreadyInvitedUserIds: string[]) => {
    setInviteMoreData({ challengeId, challengeTitle, alreadyInvitedUserIds });
    setShowInviteMoreModal(true);
  };

  const handleChallengeStarted = async () => {
    console.log('🔄 Challenge started - refreshing team data...');
    await loadTeamData();
  };

  const handleChallengeCancelled = async () => {
    console.log('🔄 Challenge cancelled - refreshing team data...');
    await loadTeamData();
  };

  const handleChallengeEnded = async () => {
    console.log('🔄 Challenge ended - refreshing team data...');
    await loadTeamData();
  };

  const handleTeamRefresh = async () => {
    console.log('🔄 [TeamScreen] Manual refresh triggered...');
    await loadTeamData();
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
  if (loading || !userProfile) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0B101B] text-gray-900 dark:text-white pb-20 font-sans">
        <AppHeader />
        <main className="px-4 py-4">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-gray-500 dark:text-white/50 text-sm mt-3">Loading team...</p>
          </div>
        </main>
        <BottomNavigation currentScreen="team" />
      </div>
    );
  }

  // Main team list view
  return (
    <div className="min-h-screen bg-white dark:bg-[#0B101B] text-gray-900 dark:text-white pb-20 font-sans">
      <AppHeader />

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        userProfile={userProfile}
        onInviteSent={loadTeamData}
      />

      {/* 🎯 NEW: Team Challenge Selection Modal */}
      <SelectTeamChallengeModal
        isOpen={showTeamSelectModal}
        onClose={() => setShowTeamSelectModal(false)}
        onSuccess={async () => {
          await loadTeamData();
          setShowTeamSelectModal(false);
        }}
      />

      {/* 🎯 NEW: Invite More to Team Challenge Modal */}
      {inviteMoreData && (
        <InviteMoreToTeamChallengeModal
          isOpen={showInviteMoreModal}
          onClose={() => setShowInviteMoreModal(false)}
          onSuccess={async () => {
            await loadTeamData();
            setShowInviteMoreModal(false);
          }}
          challengeId={inviteMoreData.challengeId}
          challengeTitle={inviteMoreData.challengeTitle}
          alreadyInvitedUserIds={inviteMoreData.alreadyInvitedUserIds}
        />
      )}

      <main className="px-4 py-4 space-y-4">
        
        {/* TABS NAVIGATION */}
        <div className="bg-gray-100 dark:bg-[#151A25] border border-gray-200 dark:border-white/10 rounded-2xl p-1 grid grid-cols-3 gap-1">
          <button
            onClick={() => setActiveTab('challenge')}
            className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'challenge'
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/80'
            }`}
          >
            Challenge
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'team'
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/80'
            }`}
          >
            Team
            {/* 🎯 REMOVED: No badge on Team tab */}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all relative ${
              activeTab === 'activity'
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/80'
            }`}
          >
            Activity
            {/* 🎯 UPDATED: Total count of all pending items (sent + received) */}
            {(() => {
              const totalPending = 
                sentChallengeHistory.filter(c => c.status === 'pending').length +
                receivedChallengeHistory.filter(c => c.status === 'pending').length +
                sentTeamChallengeCount +
                receivedTeamChallengeCount;
              
              return totalPending > 0 ? (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                  {totalPending}
                </span>
              ) : null;
            })()}
          </button>
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'challenge' && (
          <>
            {/* 🎯 Team Challenge HUD in Challenge tab */}
            <TeamHUD
              teamChallenge={teamChallenge}
              teamMembers={teamChallengeMembers}
              onClick={handleTeamClick}
              onInviteMoreClick={handleInviteMoreClick}
              onChallengeStarted={handleChallengeStarted}
              onChallengeCancelled={handleChallengeCancelled}
              onChallengeEnded={handleChallengeEnded}
              onRefresh={handleTeamRefresh}
            />
          </>
        )}

        {activeTab === 'team' && (
          <>
            {/* 🎯 Team Members List */}
            <TeamMembers
              teamMembers={teamMembers}
              receivedInvitations={receivedInvitations}
              sentInvitations={sentInvitations}
              userProfile={userProfile}
              onMemberSelect={setSelectedMember}
              onInviteClick={handleInviteClick}
              onRefresh={loadTeamData}
            />
          </>
        )}

        {activeTab === 'activity' && (
          <>
            {/* 🎯 INBOX: Combined Sent + Received */}
            
            {/* Received Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                📥 Received
              </h3>
              <TeamChallengeInvitations onRefresh={loadTeamData} />
              <ReceivedChallenges
                challenges={receivedChallengeHistory}
                onRefresh={loadTeamData}
              />
            </div>

            {/* Sent Section */}
            <div className="space-y-3 mt-6">
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                📤 Sent
              </h3>
              <SentTeamChallengeInvitations onRefresh={loadTeamData} />
              <SentChallenges
                challenges={sentChallengeHistory}
                onRefresh={loadTeamData}
              />
            </div>
          </>
        )}
      </main>

      <BottomNavigation currentScreen="team" />
    </div>
  );
}