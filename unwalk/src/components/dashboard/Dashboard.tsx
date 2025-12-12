import { useChallengeStore } from '../../stores/useChallengeStore';
import { EmptyState } from './EmptyState';
import { useState } from 'react';
import { updateChallengeProgress } from '../../lib/api';

export function Dashboard() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const setOnboardingComplete = useChallengeStore((s) => s.setOnboardingComplete);
  const clearChallenge = useChallengeStore((s) => s.clearChallenge);

  const handleReset = () => {
    if (confirm('Reset the app? This will clear your current challenge and return to onboarding.')) {
      clearChallenge();
      setOnboardingComplete(false);
      setCurrentScreen('onboarding');
    }
  };

  // DEV: Simulator
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

  // Calculate stats
  const progress = activeUserChallenge 
    ? (activeUserChallenge.current_steps / (activeUserChallenge.admin_challenge?.goal_steps || 1)) * 100 
    : 0;
  const remaining = activeUserChallenge 
    ? (activeUserChallenge.admin_challenge?.goal_steps || 0) - activeUserChallenge.current_steps 
    : 0;
  const blurAmount = Math.max(0, 30 - (progress * 0.3));

  const calculateDaysActive = () => {
    if (!activeUserChallenge?.started_at) return 0;
    const startDate = new Date(activeUserChallenge.started_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const distanceKm = activeUserChallenge 
    ? ((activeUserChallenge.current_steps * 0.8) / 1000).toFixed(1) 
    : 0;

  const calories = activeUserChallenge 
    ? Math.round((activeUserChallenge.current_steps * 40) / 1000) 
    : 0;

  if (!activeUserChallenge) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
          <button onClick={() => setCurrentScreen('home')} className="text-2xl font-bold">
            UnWalk
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
            UnWalk
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
            <button onClick={handleReset} className="text-white/70 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
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

        {/* DEV: Simulator */}
        {import.meta.env.DEV && (
          <div className="px-6 pb-3 flex-shrink-0">
            <div className="bg-blue-900/80 backdrop-blur-sm rounded-lg p-3 border border-blue-700/50">
              <p className="text-xs font-semibold text-blue-200 mb-2">🛠️ Step Simulator</p>
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
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-white/10 px-6 py-3 z-20">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button onClick={() => setCurrentScreen('home')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">Home</span>
          </button>
          <button onClick={() => setCurrentScreen('library')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span className="text-xs">Explore</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-yellow-400">
            <div className="relative w-7 h-7">
              <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-700" />
                <circle
                  cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="text-yellow-400 transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <span className="text-xs">Active</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
