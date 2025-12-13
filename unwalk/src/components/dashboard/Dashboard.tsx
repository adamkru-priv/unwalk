import { useChallengeStore } from '../../stores/useChallengeStore';
import { EmptyState } from './EmptyState';
import { useState } from 'react';
import { updateChallengeProgress } from '../../lib/api';
import { BottomNavigation } from '../common/BottomNavigation';
import { ProfileModal } from '../common/ProfileModal';

export function Dashboard() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);
  const pauseActiveChallenge = useChallengeStore((s) => s.pauseActiveChallenge);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const setOnboardingComplete = useChallengeStore((s) => s.setOnboardingComplete);
  const clearChallenge = useChallengeStore((s) => s.clearChallenge);
  const userTier = useChallengeStore((s) => s.userTier);

  const handleReset = () => {
    if (confirm('Reset the app? This will clear your current challenge and return to onboarding.')) {
      clearChallenge();
      setOnboardingComplete(false);
      setCurrentScreen('onboarding');
    }
  };

  const handleExitChallenge = () => {
    setShowMenu(false);
    if (confirm('⚠️ Exit this challenge?\n\nYour progress will be lost. This cannot be undone!')) {
      clearChallenge();
      setCurrentScreen('home');
    }
  };

  const handlePauseChallenge = () => {
    setShowMenu(false);
    if (userTier !== 'pro') {
      alert('⭐ Pause feature is only available for Pro users!\n\nUpgrade to Pro to pause and resume challenges.');
      return;
    }
    if (!activeUserChallenge) return;
    
    if (confirm('⏸️ Pause this challenge?\n\nYour progress will be saved and you can resume later.')) {
      // Pauzuj wyzwanie (zapisuje do pausedChallenges i usuwa z activeUserChallenge)
      pauseActiveChallenge(activeUserChallenge);
      alert('✅ Challenge paused! You can resume it anytime from the Home screen.');
      setCurrentScreen('home');
    }
  };

  const handleCompleteChallenge = async () => {
    setShowMenu(false);
    if (!activeUserChallenge) return;
    
    const progress = (activeUserChallenge.current_steps / (activeUserChallenge.admin_challenge?.goal_steps || 1)) * 100;
    
    if (progress < 100) {
      if (userTier !== 'pro') {
        alert('⭐ Early completion is only available for Pro users!\n\nUpgrade to Pro or reach 100% to complete.');
        return;
      }
      if (!confirm('🏁 Complete this challenge early?\n\nYou are at ' + Math.round(progress) + '% progress.\n\nThis will reveal the image and mark as completed.')) {
        return;
      }
    }

    try {
      const { completeChallenge } = await import('../../lib/api');
      await completeChallenge(activeUserChallenge.id);
      alert('🎉 Congratulations! Challenge completed!');
      clearChallenge();
      setCurrentScreen('home');
    } catch (error) {
      console.error('Failed to complete challenge:', error);
      alert('❌ Failed to complete challenge. Please try again.');
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

      // 🎉 AUTO-COMPLETE when reaching 100%
      if (newSteps >= goalSteps) {
        console.log('🎉 Challenge completed! Auto-completing...');
        const { completeChallenge } = await import('../../lib/api');
        const completedChallenge = await completeChallenge(activeUserChallenge.id);
        console.log('✅ Challenge marked as completed:', completedChallenge);
        
        // Show celebration and redirect to home after 2 seconds
        setTimeout(() => {
          clearChallenge();
          setCurrentScreen('home');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Failed to update steps:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const calculateDaysActive = () => {
    if (!activeUserChallenge?.started_at) return 0;
    const startDate = new Date(activeUserChallenge.started_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
      {/* Profile Modal */}
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />

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
            
            {/* Settings Menu Button */}
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
                      {userTier !== 'pro' && <span className="text-amber-400">⭐</span>}
                    </button>

                    {/* Complete */}
                    <button
                      onClick={handleCompleteChallenge}
                      className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 text-white border-t border-gray-700"
                    >
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <div className="font-medium">Complete</div>
                        {progress < 100 && userTier !== 'pro' && (
                          <div className="text-xs text-gray-400">Pro only</div>
                        )}
                      </div>
                      {progress < 100 && userTier !== 'pro' && <span className="text-amber-400">⭐</span>}
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

                    {/* Dev Reset */}
                    <button
                      onClick={handleReset}
                      className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 text-gray-400 border-t border-gray-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <div className="font-medium text-xs">DEV: Reset App</div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* EMPTY SPACE - Let the image breathe */}
        <div className="flex-1 flex items-center justify-center">
          {!showStats && (
            <div className="text-center">
              <div className="text-6xl font-bold mb-2">{Math.round(progress)}%</div>
              <div className="text-sm text-white/60">revealed</div>
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
                {/* Days */}
                <div>
                  <div className="text-2xl font-bold text-purple-400">{calculateDaysActive()}</div>
                  <div className="text-xs text-white/50 mt-1">days</div>
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

        {/* TEST Simulator - Always visible for testing */}
        <div className="px-6 pb-3 flex-shrink-0">
          <div className="bg-blue-900/80 backdrop-blur-sm rounded-lg p-3 border border-blue-700/50">
            <p className="text-xs font-semibold text-blue-200 mb-2">🛠️ Step Simulator (TEST MODE)</p>
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
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentScreen="dashboard" 
        onProfileClick={() => setShowProfile(true)} 
      />
    </div>
  );
}
