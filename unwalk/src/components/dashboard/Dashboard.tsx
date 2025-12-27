import { useChallengeStore } from '../../stores/useChallengeStore';
import { EmptyState } from './EmptyState';
import { useState, useEffect } from 'react';
import { updateChallengeProgress, getActiveUserChallenge, deleteUserChallenge } from '../../lib/api';
import { BottomNavigation } from '../common/BottomNavigation';
import { useToastStore } from '../../stores/useToastStore';
import { useHealthKit } from '../../hooks/useHealthKit';

export function Dashboard() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);
  const pauseActiveChallenge = useChallengeStore((s) => s.pauseActiveChallenge);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const clearChallenge = useChallengeStore((s) => s.clearChallenge);
  const userProfile = useChallengeStore((s) => s.userProfile); // ✅ Read from store
  const isGuest = userProfile?.is_guest || false;
  const toast = useToastStore((s) => s);

  // ✅ HealthKit integration
  const { 
    isAvailable: healthKitAvailable, 
    isAuthorized: healthKitAuthorized,
    requestPermission: requestHealthKitPermission,
    getSteps,
    isNative
  } = useHealthKit();

  // ✅ Request permission on mount if needed
  useEffect(() => {
    if (isNative && healthKitAvailable && !healthKitAuthorized) {
      requestHealthKitPermission();
    }
  }, [isNative, healthKitAvailable, healthKitAuthorized]);

  // ✅ Sync active challenge progress with HealthKit
  useEffect(() => {
    if (isNative && healthKitAuthorized && activeUserChallenge) {
      const syncChallengeProgress = async () => {
        try {
          console.log('🔄 [Dashboard] Syncing challenge progress with HealthKit...');
          const startDate = new Date(activeUserChallenge.started_at);
          const now = new Date();
          
          // Get total steps since challenge started
          const steps = await getSteps(startDate, now);
          
          // Only update if steps have increased
          if (steps > activeUserChallenge.current_steps) {
            console.log(`📈 [Dashboard] Updating challenge progress: ${activeUserChallenge.current_steps} -> ${steps}`);
            
            // Update DB
            await updateChallengeProgress(activeUserChallenge.id, steps);
            
            // Update local store
            setActiveChallenge({
              ...activeUserChallenge,
              current_steps: steps
            });
            
            // Check for completion
            if (activeUserChallenge.admin_challenge?.goal_steps && steps >= activeUserChallenge.admin_challenge.goal_steps) {
               console.log('🎉 [Dashboard] Challenge completed via HealthKit sync!');
               // Redirect to home for claim flow
               setCurrentScreen('home');
            }
          }
        } catch (error) {
          console.error('❌ [Dashboard] Failed to sync challenge progress:', error);
        }
      };

      // Sync immediately
      syncChallengeProgress();

      // And sync periodically (every 10s on dashboard for responsiveness)
      const interval = setInterval(syncChallengeProgress, 10 * 1000); 
      return () => clearInterval(interval);
    }
  }, [isNative, healthKitAuthorized, activeUserChallenge?.id, getSteps]);

  // LOAD ACTIVE CHALLENGE on mount if not in store
  useEffect(() => {
    const loadActiveChallenge = async () => {
      if (!activeUserChallenge) {
        console.log('🔄 [Dashboard] No active challenge in store, loading from DB...');
        try {
          const activeChallenge = await getActiveUserChallenge();
          if (activeChallenge) {
            setActiveChallenge(activeChallenge);
            console.log('✅ [Dashboard] Loaded active challenge:', activeChallenge.admin_challenge?.title);
          }
        } catch (err) {
          console.error('Failed to load active challenge:', err);
        }
      }
    };

    loadActiveChallenge();
  }, []);

  const handleExitChallenge = async () => {
    setShowMenu(false);
    if (!activeUserChallenge) return;
    
    if (confirm('Exit this challenge?\n\nYour progress will be lost. This cannot be undone!')) {
      try {
        // Delete challenge from database first
        await deleteUserChallenge(activeUserChallenge.id);
        
        // Then clear from store
        clearChallenge();
        toast.addToast({ message: 'Challenge exited successfully', type: 'success' });
        setCurrentScreen('home');
      } catch (error: any) {
        console.error('Failed to exit challenge:', error);
        toast.addToast({ message: error.message || 'Failed to exit challenge', type: 'error' });
      }
    }
  };

  const handlePauseChallenge = () => {
    setShowMenu(false);
    if (isGuest) {
      alert('Sign up to unlock pause & resume.');
      return;
    }
    if (!activeUserChallenge) return;
    
    if (confirm('Pause this challenge?\n\nYour progress will be saved and you can resume later.')) {
      // Pauzuj wyzwanie (zapisuje do pausedChallenges i usuwa z activeUserChallenge)
      pauseActiveChallenge(activeUserChallenge);
      alert('Challenge paused! You can resume it anytime from the Home screen.');
      setCurrentScreen('home');
    }
  };

  const handleAddSteps = async (steps: number) => {
    if (isUpdating || !activeUserChallenge) return;
    
    try {
      setIsUpdating(true);
      const goalSteps = activeUserChallenge.admin_challenge?.goal_steps || 0;
      const newSteps = Math.min(activeUserChallenge.current_steps + steps, goalSteps);
      
      const updatedChallenge = await updateChallengeProgress(activeUserChallenge.id, newSteps);
      setActiveChallenge(updatedChallenge);

      // AUTO-REDIRECT to Home when reaching 100%
      if (newSteps >= goalSteps && goalSteps > 0) {
        console.log('✅ Challenge completed at 100%! Redirecting to Home for claim...');
        
        // Redirect to home where claim UI will show
        setTimeout(() => {
          setCurrentScreen('home');
        }, 500);
      }
    } catch (error) {
      console.error('Failed to update steps:', error);
      toast.addToast({ message: 'Failed to update progress', type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate elapsed time from start (not active time)
  const calculateElapsedTime = () => {
    if (!activeUserChallenge) return { days: 0, hours: 0, minutes: 0, totalSeconds: 0 };
    
    const startedAt = new Date(activeUserChallenge.started_at);
    const now = new Date();
    const totalSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    return { days, hours, minutes, totalSeconds };
  };

  const formatElapsedTime = () => {
    const { days, hours, minutes } = calculateElapsedTime();
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Calculate time remaining if there's a time limit
  const calculateTimeRemaining = () => {
    if (!activeUserChallenge || !activeUserChallenge.admin_challenge?.time_limit_hours) {
      return null; // No time limit
    }
    
    const startedAt = new Date(activeUserChallenge.started_at);
    const timeLimitMs = activeUserChallenge.admin_challenge.time_limit_hours * 60 * 60 * 1000;
    const deadlineAt = new Date(startedAt.getTime() + timeLimitMs);
    const now = new Date();
    const remainingMs = deadlineAt.getTime() - now.getTime();
    
    if (remainingMs <= 0) {
      return { expired: true, days: 0, hours: 0, minutes: 0 };
    }
    
    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    return { expired: false, days, hours, minutes };
  };

  const formatTimeRemaining = () => {
    const timeRemaining = calculateTimeRemaining();
    
    if (!timeRemaining) {
      return 'Unlimited';
    }
    
    if (timeRemaining.expired) {
      return 'Expired';
    }
    
    if (timeRemaining.days > 0) {
      return `${timeRemaining.days}d ${timeRemaining.hours}h left`;
    } else if (timeRemaining.hours > 0) {
      return `${timeRemaining.hours}h ${timeRemaining.minutes}m left`;
    } else {
      return `${timeRemaining.minutes}m left`;
    }
  };

  const hasTimeLimit = activeUserChallenge?.admin_challenge?.time_limit_hours != null;
  const timeRemaining = calculateTimeRemaining();
  const isExpired = timeRemaining?.expired || false;

  // Calculate stats
  const progress = activeUserChallenge 
    ? Math.min((activeUserChallenge.current_steps / (activeUserChallenge.admin_challenge?.goal_steps || 1)) * 100, 100)
    : 0;
  const remaining = activeUserChallenge 
    ? Math.max((activeUserChallenge.admin_challenge?.goal_steps || 0) - activeUserChallenge.current_steps, 0)
    : 0;
  const blurAmount = Math.max(0, 30 - (progress * 0.3));

  const distanceKm = activeUserChallenge 
    ? ((activeUserChallenge.current_steps * 0.8) / 1000).toFixed(1) 
    : 0;

  if (!activeUserChallenge) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
          <button onClick={() => setCurrentScreen('home')} className="text-2xl font-bold">
            MOVEE
          </button>
        </header>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* BLURRED IMAGE AS BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={activeUserChallenge.admin_challenge?.image_url}
          alt="Challenge"
          className="w-full h-full object-cover"
          style={{ filter: `blur(${blurAmount}px)` }}
        />
        {/* LIGHTER gradient - image should be visible when revealed */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-transparent to-gray-900/80" />
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col h-screen pb-[calc(80px+env(safe-area-inset-bottom))]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 flex-shrink-0 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
          <button 
            onClick={() => setCurrentScreen('home')}
            className="text-2xl font-bold flex items-center gap-2"
          >
            MOVEE
            {/* Account type badge */}
            {isGuest ? (
              <span className="text-gray-400 text-sm font-light tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                Guest
              </span>
            ) : (
              <span className="text-amber-400 text-sm font-light tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                Pro
              </span>
            )}
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowStats(!showStats)}
              className="text-white/70 hover:text-white transition-colors"
              title={showStats ? "Hide stats" : "Show stats"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showStats ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                )}
              </svg>
            </button>
            
            {/* Settings Menu Button - hide when completed */}
            {progress < 100 && (
              <div className="relative">
                <button 
                  onClick={() => setShowMenu(!showMenu)} 
                  className="text-white/70 hover:text-white transition-colors"
                  title="Challenge options"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setShowMenu(false)}
                    />
                    
                    {/* Menu */}
                    <div className="absolute right-0 top-10 z-30 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl min-w-[200px] overflow-hidden">
                      {/* Pause */}
                      <button
                        onClick={handlePauseChallenge}
                        className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 text-white"
                      >
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <div className="font-medium">Pause</div>
                          {isGuest && (
                            <div className="text-xs text-gray-400">Sign up required</div>
                          )}
                        </div>
                      </button>

                      {/* Exit */}
                      <button
                        onClick={handleExitChallenge}
                        className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 text-red-400 border-t border-gray-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <div className="font-medium">Exit Challenge</div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* EMPTY SPACE - Let the image breathe */}
        <div className="flex-1 flex items-center justify-center">
          {!showStats && progress < 100 && (
            <div className="text-center">
              <div className="text-6xl font-bold mb-2">{Math.round(progress)}%</div>
              <div className="text-sm text-white/60">revealed</div>
            </div>
          )}
          
          {/* Success message when completed */}
          {progress >= 100 && !showStats && (
            <div className="text-center animate-fade-in">
              <div className="text-4xl font-black mb-2">Complete!</div>
              <div className="text-lg text-white/70">{activeUserChallenge.admin_challenge?.title}</div>
            </div>
          )}
        </div>

        {/* COMPACT STATS BAR - Bottom, light, minimal */}
        {showStats && (
          <div className="px-6 pb-3 space-y-3">
            {/* Challenge Title */}
            <div className="text-center">
              <h2 className="text-xl font-bold mb-1">{activeUserChallenge.admin_challenge?.title}</h2>
              {hasTimeLimit && (
                <div className={`text-sm font-medium ${isExpired ? 'text-red-400' : 'text-orange-400'}`}>
                  {formatTimeRemaining()}
                </div>
              )}
              {!hasTimeLimit && (
                <div className="text-sm text-white/50">Unlimited Time</div>
              )}
            </div>

            {/* Stats grid */}
            <div className="bg-gray-900/40 backdrop-blur-md rounded-xl p-4 border border-white/10">
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                {/* Steps */}
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{activeUserChallenge.current_steps.toLocaleString()}</div>
                  <div className="text-xs text-white/50 mt-1">steps</div>
                </div>
                {/* Remaining */}
                <div>
                  <div className="text-2xl font-bold text-white">{remaining.toLocaleString()}</div>
                  <div className="text-xs text-white/50 mt-1">to go</div>
                </div>
                {/* Distance */}
                <div>
                  <div className="text-2xl font-bold text-blue-400">{distanceKm}</div>
                  <div className="text-xs text-white/50 mt-1">km</div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mb-3 bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>

              {/* Time info row */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-purple-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formatElapsedTime()} elapsed</span>
                </div>
                <div className="text-white/50">
                  {Math.round(progress)}% complete
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TEST Simulator - Only visible when not completed AND not using HealthKit */}
        {progress < 100 && !isNative && (
          <div className="px-6 pb-3 flex-shrink-0">
            <div className="bg-blue-900/80 backdrop-blur-sm rounded-lg p-3 border border-blue-700/50">
              <p className="text-xs font-semibold text-blue-200 mb-2">Step Simulator (Web/Test Only)</p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleAddSteps(100)}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50"
                >
                  +100
                </button>
                <button
                  onClick={() => handleAddSteps(500)}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50"
                >
                  +500
                </button>
                <button
                  onClick={() => handleAddSteps(1000)}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50"
                >
                  +1K
                </button>
                <button
                  onClick={() => handleAddSteps(5000)}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50"
                >
                  +5K
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentScreen="dashboard"
      />
    </div>
  );
}
