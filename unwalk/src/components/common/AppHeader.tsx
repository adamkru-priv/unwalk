import { useChallengeStore } from '../../stores/useChallengeStore';
import { useToastStore } from '../../stores/useToastStore';
import { useState, useEffect } from 'react';
import { teamService, type TeamInvitation } from '../../lib/auth';
import { getUnclaimedChallenges } from '../../lib/api';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  onProfileClick?: () => void;
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const [receivedInvitations, setReceivedInvitations] = useState<TeamInvitation[]>([]);
  const [unclaimedChallenges, setUnclaimedChallenges] = useState<any[]>([]);
  const [pendingChallengesCount, setPendingChallengesCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const userProfile = useChallengeStore((s) => s.userProfile); // ✅ Read from store instead of loading
  const currentScreen = useChallengeStore((s) => s.currentScreen);
  const previousScreen = useChallengeStore((s) => s.previousScreen);

  useEffect(() => {
    loadNotifications();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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
      {/* Back button removed by design: header must never show a back arrow */}

      <div className="flex items-center justify-between">
        {/* Left side - Back button or Logo */}
        <div className="flex items-center gap-3">
          {/* Back button moved to overlay above */}

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400 inline-block" style={{ transform: 'scaleX(-1)' }}>🚶</span>
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
              className="relative group flex items-center"
              title="Active challenge in progress"
            >
              {(() => {
                const progress = activeUserChallenge.admin_challenge?.goal_steps 
                  ? Math.min(100, Math.round((activeUserChallenge.current_steps / activeUserChallenge.admin_challenge.goal_steps) * 100))
                  : 0;
                
                // Calculate circle progress (circumference = 2πr, for r=10: ~62.83)
                const radius = 10;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference - (progress / 100) * circumference;

                return (
                  <div className="relative w-7 h-7 flex items-center justify-center flex-shrink-0">
                    {/* Background circle */}
                    <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gray-300 dark:text-gray-700"
                      />
                      {/* Progress circle with glow */}
                      <circle
                        cx="12"
                        cy="12"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="text-blue-500 dark:text-blue-400 transition-all duration-500 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                      />
                    </svg>
                    {/* Percentage number only */}
                    <span className="relative z-10 text-[9px] font-medium text-gray-700 dark:text-white leading-none">
                      {progress}
                    </span>
                  </div>
                );
              })()}
            </button>
          )}

          {/* Profile / Close Settings Button */}
          <button
            onClick={() => {
              if (currentScreen === 'profile') {
                const target = previousScreen || 'home';
                if (target && target !== 'profile') setCurrentScreen(target);
                else setCurrentScreen('home');
                return;
              }
              setCurrentScreen('profile');
            }}
            className="relative text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-colors"
            title={currentScreen === 'profile' ? 'Close' : 'Profile & Settings'}
            aria-label={currentScreen === 'profile' ? 'Close settings' : 'Profile & Settings'}
          >
            {currentScreen === 'profile' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              (() => {
                const name = (userProfile as any)?.display_name || (userProfile as any)?.full_name || (userProfile as any)?.email || '';

                // Extract a stable suffix from common guest names like "Guest_1234".
                const suffixMatch = typeof name === 'string' ? /(guest[_-]?)(\w{3,8})/i.exec(name) : null;
                const suffix = suffixMatch?.[2]?.toUpperCase() ?? '';

                return (
                  <div className="flex items-center gap-1.5">
                    {/* Profile icon instead of avatar circle */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isGuest 
                        ? 'bg-gray-200 dark:bg-white/10' 
                        : 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-600/20'
                    }`}>
                      <svg className={`w-4 h-4 ${
                        isGuest 
                          ? 'text-gray-600 dark:text-white/60' 
                          : 'text-white'
                      }`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>

                    {/* Email/Name label - max 6 chars */}
                    {isGuest ? (
                      <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-500 dark:text-white/45">
                        {suffix ? `G-${suffix.slice(0, 3)}` : 'Guest'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-700 dark:text-white/70">
                        {(userProfile?.email?.split('@')[0] || 'Pro').slice(0, 6)}
                      </span>
                    )}
                  </div>
                );
              })()
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
