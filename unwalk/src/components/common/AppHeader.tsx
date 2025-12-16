import { useChallengeStore } from '../../stores/useChallengeStore';
import { useToastStore } from '../../stores/useToastStore';
import { useState, useEffect } from 'react';
import { authService, teamService, type UserProfile, type TeamInvitation } from '../../lib/auth';
import { getUnclaimedChallenges } from '../../lib/api';

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  subtitle?: string;
  onProfileClick?: () => void;
}

export function AppHeader({ title, showBackButton = false, subtitle }: AppHeaderProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [receivedInvitations, setReceivedInvitations] = useState<TeamInvitation[]>([]);
  const [unclaimedChallenges, setUnclaimedChallenges] = useState<any[]>([]);
  const [pendingChallengesCount, setPendingChallengesCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const setUserTierInStore = useChallengeStore((s) => s.setUserTier);

  useEffect(() => {
    loadUserProfile();
    loadNotifications();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUserProfile = async () => {
    const profile = await authService.getUserProfile();
    setUserProfile(profile);
    
    // Sync tier to store
    if (profile?.tier) {
      setUserTierInStore(profile.tier);
      console.log('🔄 [AppHeader] Synced tier to store:', profile.tier);
    }
  };

  const loadNotifications = async () => {
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
  };

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
  const userTier = userProfile?.tier || 'basic';

  return (
    <header className="bg-gray-50/80 dark:bg-[#0B101B]/80 backdrop-blur-md sticky top-0 z-20 px-6 py-4 border-b border-gray-200 dark:border-transparent">
      <div className="flex items-center justify-between">
        {/* Left side - Back button or Logo */}
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={() => setCurrentScreen('home')}
              className="text-gray-600 dark:text-white/80 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="Back to home"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400 inline-block" style={{ transform: 'scaleX(-1)' }}>🚶</span>
              MOVEE
              {/* Only show Pro badge if NOT guest and tier is pro */}
              {!isGuest && userTier === 'pro' && (
                <span className="text-amber-600 dark:text-amber-400 text-sm font-light italic tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                  Pro
                </span>
              )}
              {title && <span className="text-gray-500 dark:text-white/60 text-lg">• {title}</span>}
            </h1>
            {subtitle && (
              <p className="text-gray-600 dark:text-white/70 text-sm mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right side - Notifications, Active Challenge & Profile */}
        <div className="flex items-center gap-3">
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

          {/* Active Challenge Indicator */}
          {activeUserChallenge && (
            <button
              onClick={() => setCurrentScreen('dashboard')}
              className="relative text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors group"
              title="Active challenge in progress"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => setCurrentScreen('profile')}
            className="relative text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
