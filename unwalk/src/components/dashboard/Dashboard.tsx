import { useChallengeStore } from '../../stores/useChallengeStore';
import { EmptyState } from './EmptyState';
import { useState, useEffect } from 'react';
import { updateChallengeProgress, calculateChallengePoints } from '../../lib/api';
import { BottomNavigation } from '../common/BottomNavigation';

export function Dashboard() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [hasCheckedCompletion, setHasCheckedCompletion] = useState(false);
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);
  const pauseActiveChallenge = useChallengeStore((s) => s.pauseActiveChallenge);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const clearChallenge = useChallengeStore((s) => s.clearChallenge);
  const userTier = useChallengeStore((s) => s.userTier);
  const dailyChallenge = useChallengeStore((s) => s.getDailyChallenge());

  // AUTO-DETECT COMPLETION - Check if challenge is at 100%
  useEffect(() => {
    const checkCompletion = async () => {
      if (!activeUserChallenge || hasCheckedCompletion || showCompletionModal) return;
      
      const goalSteps = activeUserChallenge.admin_challenge?.goal_steps || 0;
      const currentSteps = activeUserChallenge.current_steps;
      
      // Check if challenge is already marked as completed_unclaimed (from previous session)
      if (activeUserChallenge.status === 'completed_unclaimed') {
        console.log('Challenge already completed, showing finish button...');
        setHasCheckedCompletion(true);
        
        // Calculate points
        const isDailyChallenge = dailyChallenge?.id === activeUserChallenge.admin_challenge_id;
        const points = calculateChallengePoints(goalSteps, isDailyChallenge);
        
        setEarnedPoints(points);
        setShowCompletionModal(true);
        return;
      }
      
      // Check if challenge is completed (100% or more) but not yet marked
      if (currentSteps >= goalSteps && goalSteps > 0 && activeUserChallenge.status === 'active') {
        console.log('Challenge detected as complete! current:', currentSteps, 'goal:', goalSteps);
        setHasCheckedCompletion(true);
        
        try {
          // Mark challenge as completed in database
          const { completeChallenge, calculateChallengePoints } = await import('../../lib/api');
          const completedChallenge = await completeChallenge(activeUserChallenge.id);
          console.log('Challenge marked as completed in DB:', completedChallenge);

          // Calculate points
          const isDailyChallenge = dailyChallenge?.id === activeUserChallenge.admin_challenge_id;
          const points = calculateChallengePoints(goalSteps, isDailyChallenge);
          
          setEarnedPoints(points);
          setShowCompletionModal(true);
        } catch (error) {
          console.error('Failed to complete challenge:', error);
          // Even if API fails, show modal if we're at 100%
          const isDailyChallenge = dailyChallenge?.id === activeUserChallenge.admin_challenge_id;
          const points = calculateChallengePoints(goalSteps, isDailyChallenge);
          setEarnedPoints(points);
          setShowCompletionModal(true);
        }
      }
    };

    checkCompletion();
  }, [activeUserChallenge, dailyChallenge, hasCheckedCompletion, showCompletionModal]);

  const handleExitChallenge = () => {
    setShowMenu(false);
    if (confirm('Exit this challenge?\n\nYour progress will be lost. This cannot be undone!')) {
      clearChallenge();
      setCurrentScreen('home');
    }
  };

  const handlePauseChallenge = () => {
    setShowMenu(false);
    if (userTier !== 'pro') {
      alert('Pause feature is only available for Pro users!\n\nUpgrade to Pro to pause and resume challenges.');
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

      // AUTO-COMPLETE when reaching 100%
      if (newSteps >= goalSteps) {
        console.log('Challenge completed! Showing finish button...');
        const { completeChallenge, calculateChallengePoints } = await import('../../lib/api');
        const completedChallenge = await completeChallenge(activeUserChallenge.id);
        console.log('Challenge marked as completed:', completedChallenge);

        // Calculate points based on goal_steps and if it's daily challenge
        const isDailyChallenge = dailyChallenge?.id === activeUserChallenge.admin_challenge_id;
        const points = calculateChallengePoints(goalSteps, isDailyChallenge);
        
        setEarnedPoints(points);
        setShowCompletionModal(true);
      }
    } catch (error) {
      console.error('Failed to update steps:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const calculateActiveTime = () => {
    if (!activeUserChallenge) return { days: 0, hours: 0, minutes: 0, totalSeconds: 0 };
    
    // Start with stored active time (time from previous sessions)
    let totalSeconds = activeUserChallenge.active_time_seconds || 0;
    
    // If challenge is currently active (not paused), add current session time
    if (activeUserChallenge.status === 'active' && activeUserChallenge.last_resumed_at) {
      const resumedAt = new Date(activeUserChallenge.last_resumed_at);
      const now = new Date();
      const currentSessionSeconds = Math.floor((now.getTime() - resumedAt.getTime()) / 1000);
      totalSeconds += currentSessionSeconds;
    }
    
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    return { days, hours, minutes, totalSeconds };
  };

  const formatActiveTime = () => {
    const { days, hours, minutes } = calculateActiveTime();
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Calculate stats
  const progress = activeUserChallenge 
    ? (activeUserChallenge.current_steps / (activeUserChallenge.admin_challenge?.goal_steps || 1)) * 100 
    : 0;
  const remaining = activeUserChallenge 
    ? (activeUserChallenge.admin_challenge?.goal_steps || 0) - activeUserChallenge.current_steps 
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
      <div className="fixed inset-0 z-0">
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
      <div className="relative z-10 flex flex-col h-screen pb-20">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <button 
            onClick={() => setCurrentScreen('home')}
            className="text-2xl font-bold"
          >
            MOVEE
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowStats(!showStats)}
              className="text-white/70 hover:text-white transition-colors"
              title={showStats ? "Hide stats" : "Show stats"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showStats ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
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
                      {/* Pause (Pro only) */}
                      <button
                        onClick={handlePauseChallenge}
                        className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 text-white"
                      >
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <div className="font-medium">Pause</div>
                          {userTier !== 'pro' && (
                            <div className="text-xs text-gray-400">Pro only</div>
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
            {/* Single row with key stats */}
            <div className="bg-gray-900/40 backdrop-blur-md rounded-xl p-4 border border-white/10">
              <div className="grid grid-cols-4 gap-4 text-center">
                {/* Steps */}
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{activeUserChallenge.current_steps.toLocaleString()}</div>
                  <div className="text-xs text-white/50 mt-1">steps</div>
                </div>
                {/* Remaining */}
                <div>
                  <div className="text-2xl font-bold text-white">{remaining.toLocaleString()}</div>
                  <div className="text-xs text-white/50 mt-1">left</div>
                </div>
                {/* Distance */}
                <div>
                  <div className="text-2xl font-bold text-blue-400">{distanceKm}</div>
                  <div className="text-xs text-white/50 mt-1">km</div>
                </div>
                {/* Active Time */}
                <div>
                  <div className="text-base font-bold text-purple-400">{formatActiveTime()}</div>
                  <div className="text-xs text-white/50 mt-1">active</div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-4 bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* FINISH CHALLENGE Button - Shows when completed */}
        {progress >= 100 && showCompletionModal && (
          <div className="px-6 pb-3 flex-shrink-0">
            <button
              onClick={() => {
                setShowCompletionModal(false);
                clearChallenge();
                setCurrentScreen('home');
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-4 rounded-2xl font-bold text-lg transition-all shadow-2xl shadow-green-500/30 flex items-center justify-center gap-3 group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">✓</span>
              <span>Finish Challenge</span>
            </button>
            {userTier === 'pro' && earnedPoints > 0 && (
              <p className="text-center text-sm text-yellow-400 font-bold mt-2">
                +{earnedPoints} points earned
              </p>
            )}
          </div>
        )}

        {/* TEST Simulator - Only visible when not completed */}
        {progress < 100 && (
          <div className="px-6 pb-3 flex-shrink-0">
            <div className="bg-blue-900/80 backdrop-blur-sm rounded-lg p-3 border border-blue-700/50">
              <p className="text-xs font-semibold text-blue-200 mb-2">Step Simulator (TEST MODE)</p>
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
