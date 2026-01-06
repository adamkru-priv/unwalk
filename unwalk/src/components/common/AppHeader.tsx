import { useChallengeStore } from '../../stores/useChallengeStore';
import { useToastStore } from '../../stores/useToastStore';
import { useState, useEffect, useCallback } from 'react';
import { teamService, type TeamInvitation } from '../../lib/auth';
import { getUnclaimedChallenges } from '../../lib/api';
import { getMyLeaderboardPosition } from '../../lib/gamification';
import type { UserChallenge } from '../../types';
import { Capacitor } from '@capacitor/core';
import { checkPushNotificationStatus } from '../../lib/push/iosPush';
import { getInitials, getColorFromName } from '../team/utils';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  onProfileClick?: () => void;
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const [receivedInvitations, setReceivedInvitations] = useState<TeamInvitation[]>([]);
  const [unclaimedChallenges, setUnclaimedChallenges] = useState<UserChallenge[]>([]);
  const [pendingChallengesCount, setPendingChallengesCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  
  // 🎯 NEW: Get active challenges from store
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const activeUserChallenges = useChallengeStore((s) => s.activeUserChallenges); // 🎯 NEW: Multiple challenges
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const userProfile = useChallengeStore((s) => s.userProfile);

  // Check if user is guest - MUST be before useEffect that uses it
  const isGuest = userProfile?.is_guest || false;

  // 🎯 NEW: Determine if challenges are solo or team (support multiple)
  const hasSoloChallenge = activeUserChallenges.some(c => !c.team_id) || (activeUserChallenge && !activeUserChallenge.team_id);
  const hasTeamChallenge = activeUserChallenges.some(c => c.team_id) || (activeUserChallenge && activeUserChallenge.team_id);

  // ✅ NEW: Check native push notification permission status
  const [pushNotifStatus, setPushNotifStatus] = useState({
    isAvailable: false,
    isGranted: false,
    isDenied: false,
    isPrompt: false,
  });

  // Check push notification status on mount (for native only)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      checkPushNotificationStatus().then(setPushNotifStatus);
    }
  }, []);

  // ✅ FIX: Listen for push notification status changes from ProfileScreen
  useEffect(() => {
    const handlePushStatusChange = (event: CustomEvent) => {
      setPushNotifStatus(event.detail);
    };

    window.addEventListener('pushNotificationStatusChanged', handlePushStatusChange as EventListener);

    return () => {
      window.removeEventListener('pushNotificationStatusChanged', handlePushStatusChange as EventListener);
    };
  }, []);

  // ✅ FIXED: Show notification bell with slash when:
  // 1. User disabled push_enabled in settings, OR
  // 2. Native permission not granted (prompt or denied)
  const pushNotificationsDisabled = 
    userProfile?.push_enabled === false || 
    (Capacitor.isNativePlatform() && pushNotifStatus.isAvailable && !pushNotifStatus.isGranted);

  const loadNotifications = useCallback(async () => {
    try {
      // Load pending team invitations
      const invitations = await teamService.getReceivedInvitations();
      const pending = invitations.filter(inv => inv.status === 'pending');
      setReceivedInvitations(pending);

      // Load unclaimed completed challenges
      const unclaimed = await getUnclaimedChallenges();
      setUnclaimedChallenges(unclaimed);

      // Load pending challenge assignments
      const pendingChallenges = await teamService.getPendingChallengesCount();
      setPendingChallengesCount(pendingChallenges);

      // 🎯 NEW: Load pending Team Challenge invitations from team_members
      const { data: { user } } = await (await import('../../lib/supabase')).supabase.auth.getUser();
      let teamChallengeInvitesCount = 0;
      if (user) {
        const { count } = await (await import('../../lib/supabase')).supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('member_id', user.id)
          .eq('challenge_status', 'invited')
          .not('active_challenge_id', 'is', null);
        
        teamChallengeInvitesCount = count || 0;
      }

      // Total notification count (including team challenge invites)
      const total = pending.length + unclaimed.length + pendingChallenges + teamChallengeInvitesCount;
      setNotificationCount(total);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(() => void loadNotifications(), 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // 🎯 NEW: Load leaderboard rank
  useEffect(() => {
    const loadRank = async () => {
      if (!isGuest) {
        try {
          const position = await getMyLeaderboardPosition();
          setLeaderboardRank(position?.my_rank || null);
        } catch (error) {
          console.error('Failed to load leaderboard rank:', error);
        }
      }
    };
    
    void loadRank();
  }, [isGuest]);

  const handleNotificationClick = async () => {
    const addToast = useToastStore.getState().addToast;
    
    if (pendingChallengesCount > 0) {
      // Get actual challenge details to show in toast
      const challenges = await teamService.getReceivedChallenges();
      if (challenges.length > 0) {
        const firstChallenge = challenges[0];
        addToast({
          message: `New Challenge from ${firstChallenge.sender_name || 'Team Member'}!`,
          type: 'info',
          duration: 3000,
        });
      }
      setCurrentScreen('team');
    } else if (receivedInvitations.length > 0) {
      const firstInvitation = receivedInvitations[0];
      addToast({
        message: `Team invite from ${firstInvitation.sender_name || firstInvitation.sender_email}!`,
        type: 'info',
        duration: 3000,
      });
      setCurrentScreen('team');
    } else if (unclaimedChallenges.length > 0) {
      addToast({
        message: `You have ${unclaimedChallenges.length} reward${unclaimedChallenges.length > 1 ? 's' : ''} to claim!`,
        type: 'success',
        duration: 3000,
      });
      setCurrentScreen('home');
    }
  };

  // 🎯 REMOVED: XP/Level calculation functions - no longer needed (moved to Profile Badges tab)

  return (
    <header className="bg-gray-50/80 dark:bg-[#0B101B]/80 backdrop-blur-md sticky top-0 z-20 px-6 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-gray-200 dark:border-transparent transition-all duration-300">
      <div className="flex items-center justify-between">
        {/* Left side - Logo */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              MOVEE
              {title && <span className="text-gray-500 dark:text-white/60 text-lg">• {title}</span>}
            </h1>
            {subtitle && (
              <p className="text-gray-600 dark:text-white/70 text-sm mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right side - Profile & Notifications */}
        <div className="flex items-center gap-3">
          {/* 🎯 NEW: Solo Challenge Badge */}
          {!isGuest && hasSoloChallenge && (
            <button
              onClick={() => {
                setCurrentScreen('home');
                // Switch carousel to slide 1 (RunnerHUD) and scroll to it
                setTimeout(() => {
                  // Trigger carousel slide change by clicking the second dot
                  const carouselDots = document.querySelectorAll('button[aria-label="Solo Challenge"]');
                  if (carouselDots.length > 0) {
                    (carouselDots[0] as HTMLButtonElement).click();
                  }
                  
                  // Then scroll to the challenge
                  setTimeout(() => {
                    const challengeElement = document.getElementById('active-challenge');
                    if (challengeElement) {
                      challengeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 300);
                }, 100);
              }}
              className="relative group"
              title="Active Solo Challenge - Click to view"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg hover:scale-105 transition-transform">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-xs font-bold">Solo</span>
              </div>
            </button>
          )}

          {/* 🎯 NEW: Team Challenge Badge */}
          {!isGuest && hasTeamChallenge && (
            <button
              onClick={() => setCurrentScreen('team')}
              className="relative group"
              title="Active Team Challenge"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 shadow-lg hover:scale-105 transition-transform">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-xs font-bold">Team</span>
              </div>
            </button>
          )}

          {/* ✅ NEW: Push Notifications Disabled Warning */}
          {!isGuest && pushNotificationsDisabled && (
            <button
              onClick={() => setCurrentScreen('profile')}
              className="relative text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
              title="Push notifications are disabled. Click to enable in settings."
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-8 h-[2px] bg-red-500 rotate-45 origin-center"></div>
              </div>
            </button>
          )}

          {/* Notifications Button */}
          {!isGuest && notificationCount > 0 && (
            <button
              onClick={handleNotificationClick}
              className="relative text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors"
              title={`${pendingChallengesCount} challenges, ${receivedInvitations.length} invitations, ${unclaimedChallenges.length} rewards`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center px-1 animate-pulse">
                <span className="text-white text-[10px] font-bold">{notificationCount}</span>
              </div>
            </button>
          )}

          {/* 🎯 NEW: Level, XP & Rank Display + Profile Avatar */}
          <button
            onClick={() => setCurrentScreen('profile')}
            className="flex items-center gap-2 hover:scale-[1.02] transition-transform"
            title="Profile & Settings"
          >
            {/* Stats */}
            {!isGuest && (
              <div className="text-right">
                <div className="text-[10px] font-bold text-gray-900 dark:text-white">
                  Lvl {userProfile?.level || 1} <span className="text-gray-500 dark:text-gray-400">({userProfile?.xp || 0} XP)</span>
                </div>
                <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                  Rank #{leaderboardRank || '—'}
                </div>
              </div>
            )}
            
            {/* Avatar */}
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-white/20 flex-shrink-0"
              style={{ backgroundColor: getColorFromName(userProfile?.display_name || userProfile?.email) }}
            >
              {getInitials(userProfile?.nickname || userProfile?.display_name || userProfile?.email)}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
