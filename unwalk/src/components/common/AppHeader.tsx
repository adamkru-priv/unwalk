import { useChallengeStore } from '../../stores/useChallengeStore';
import { useToastStore } from '../../stores/useToastStore';
import { useState, useEffect, useCallback } from 'react';
import { teamService, type TeamInvitation } from '../../lib/auth';
import { getUnclaimedChallenges } from '../../lib/api';
import { getMyLeaderboardPosition } from '../../lib/gamification';
import type { UserChallenge } from '../../types';
import { Capacitor } from '@capacitor/core';
import { checkPushNotificationStatus } from '../../lib/push/iosPush';

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

  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const activeUserChallenges = useChallengeStore((s) => s.activeUserChallenges);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const userProfile = useChallengeStore((s) => s.userProfile);

  const isGuest = userProfile?.is_guest || false;

  const hasSoloChallenge = activeUserChallenges.some(c => !c.team_id) || (activeUserChallenge && !activeUserChallenge.team_id);
  const hasTeamChallenge = activeUserChallenges.some(c => c.team_id) || (activeUserChallenge && activeUserChallenge.team_id);

  const [pushNotifStatus, setPushNotifStatus] = useState({
    isAvailable: false,
    isGranted: false,
    isDenied: false,
    isPrompt: false,
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      checkPushNotificationStatus().then(setPushNotifStatus);
    }
  }, []);

  useEffect(() => {
    const handlePushStatusChange = (event: CustomEvent) => {
      setPushNotifStatus(event.detail);
    };

    window.addEventListener('pushNotificationStatusChanged', handlePushStatusChange as EventListener);

    return () => {
      window.removeEventListener('pushNotificationStatusChanged', handlePushStatusChange as EventListener);
    };
  }, []);

  const pushNotificationsDisabled = 
    userProfile?.push_enabled === false || 
    (Capacitor.isNativePlatform() && pushNotifStatus.isAvailable && !pushNotifStatus.isGranted);

  const loadNotifications = useCallback(async () => {
    try {
      const invitations = await teamService.getReceivedInvitations();
      const pending = invitations.filter(inv => inv.status === 'pending');
      setReceivedInvitations(pending);

      const unclaimed = await getUnclaimedChallenges();
      setUnclaimedChallenges(unclaimed);

      const pendingChallenges = await teamService.getPendingChallengesCount();
      setPendingChallengesCount(pendingChallenges);

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

      const total = pending.length + unclaimed.length + pendingChallenges + teamChallengeInvitesCount;
      setNotificationCount(total);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    
    const interval = setInterval(() => void loadNotifications(), 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

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

  return (
    <header className="bg-gray-50/80 dark:bg-[#0B101B]/80 backdrop-blur-md sticky top-0 z-20 px-6 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-gray-200 dark:border-transparent transition-all duration-300">
      <div className="flex items-center justify-between">
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

        <div className="flex items-center gap-3">
          {/* Badge (Solo/Team) - po lewej */}
          {!isGuest && hasSoloChallenge && (
            <button
              onClick={() => {
                setCurrentScreen('home');
                setTimeout(() => {
                  const carouselDots = document.querySelectorAll('button[aria-label="Solo Challenge"]');
                  if (carouselDots.length > 0) {
                    (carouselDots[0] as HTMLButtonElement).click();
                  }
                  
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

          {/* Statystyka (Lvl/Rank) - zawsze po prawej, klikalny */}
          {!isGuest && (
            <button
              onClick={() => {
                setCurrentScreen('profile');
                // Wyślij event do ProfileScreen aby przełączył na zakładkę Badges
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('openBadgesTab'));
                }, 100);
              }}
              className="flex flex-col items-end gap-0.5 hover:opacity-80 transition-opacity"
              title="View your badges and achievements"
            >
              <div className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">
                Lvl {userProfile?.level || 1} • {userProfile?.xp || 0} XP
              </div>
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 leading-tight">
                Rank #{leaderboardRank || '—'}
              </div>
            </button>
          )}

          {!isGuest && pushNotificationsDisabled && (
            <button
              onClick={() => setCurrentScreen('profile')}
              className="relative text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text.white/60 transition-colors"
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

          {!isGuest && notificationCount > 0 && (
            <button
              onClick={handleNotificationClick}
              className="relative text-gray-600 dark:text.white/70 hover:text-gray-900 dark:hover:text.white transition-colors"
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
        </div>
      </div>
    </header>
  );
}
