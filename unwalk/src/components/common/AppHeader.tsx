import { useChallengeStore } from '../../stores/useChallengeStore';
import { useToastStore } from '../../stores/useToastStore';
import { useState, useEffect, useCallback } from 'react';
import { teamService, type TeamInvitation } from '../../lib/auth';
import { getUnclaimedChallenges } from '../../lib/api';
import type { UserChallenge } from '../../types';

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
  
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const userProfile = useChallengeStore((s) => s.userProfile);

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

      // Total notification count
      const total = pending.length + unclaimed.length + pendingChallenges;
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

  const handleNotificationClick = async () => {
    const addToast = useToastStore.getState().addToast;
    
    // Show toast based on what notifications user has
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

  // Check if user is guest
  const isGuest = userProfile?.is_guest || false;

  // Calculate XP and level progress
  const calculateXPForLevel = (lvl: number) => {
    if (lvl <= 1) return 0;
    return Math.floor(100 * (Math.pow(1.5, lvl - 1) - 1) / 0.5);
  };

  const getLevelEmoji = (lvl: number) => {
    if (lvl < 10) return '🌱';
    if (lvl < 20) return '🗺️';
    if (lvl < 30) return '⚔️';
    if (lvl < 40) return '🏆';
    return '👑';
  };

  const calculateTotalXPProgress = (currentXP: number, currentLevel: number): number => {
    if (currentLevel >= 50) return 100;
    const nextLevelXP = calculateXPForLevel(currentLevel + 1);
    return Math.min(100, Math.max(0, (currentXP / nextLevelXP) * 100));
  };

  const xp = userProfile?.xp || 0;
  const level = userProfile?.level || 1;
  const progress = calculateTotalXPProgress(xp, level);
  const nextLevelXP = calculateXPForLevel(level + 1);

  // Determine account type display
  const getAccountTypeBadge = () => {
    if (isGuest) {
      return (
        <span className="text-gray-400 dark:text-gray-500 text-sm font-light tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
          Guest
        </span>
      );
    }

    return (
      <span className="text-amber-500 dark:text-amber-400 text-sm font-light tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
        Pro
      </span>
    );
  };

  return (
    <header className="bg-gray-50/80 dark:bg-[#0B101B]/80 backdrop-blur-md sticky top-0 z-20 px-6 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-gray-200 dark:border-transparent transition-all duration-300">
      <div className="flex items-center justify-between">
        {/* Left side - Logo */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              MOVEE
              {/* Show account type badge for all users */}
              {getAccountTypeBadge()}
              {title && <span className="text-gray-500 dark:text-white/60 text-lg">• {title}</span>}
            </h1>
            {subtitle && (
              <p className="text-gray-600 dark:text-white/70 text-sm mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right side - XP/Level, Daily Challenge, Notifications */}
        <div className="flex items-center gap-3">
          {/* XP & Level Progress - Click to view Daily Challenge */}
          {!isGuest && (
            <button
              onClick={() => setCurrentScreen('badges')}
              className="flex items-center gap-2 bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/10 rounded-full px-3 py-1.5 relative group hover:bg-gray-50 dark:hover:bg-[#1A1F2E] transition-all active:scale-95 cursor-pointer"
              title={`Level ${level} • ${xp.toLocaleString()} / ${nextLevelXP.toLocaleString()} XP to reach Level ${level + 1}\n\nClick to view daily challenge & quests`}
            >
              <span className="text-base">{getLevelEmoji(level)}</span>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{level}</span>
                  <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <span className="text-[9px] text-gray-500 dark:text-white/50 font-medium">
                  {xp.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
                </span>
              </div>

              {/* Subtle arrow hint */}
              <svg
                className="w-3 h-3 text-gray-400 dark:text-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Notifications Button - Real data */}
          {!isGuest && notificationCount > 0 && (
            <button
              onClick={handleNotificationClick}
              className="relative text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors"
              title={`${pendingChallengesCount} challenges, ${receivedInvitations.length} invitations, ${unclaimedChallenges.length} rewards`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Red badge with notification count */}
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
