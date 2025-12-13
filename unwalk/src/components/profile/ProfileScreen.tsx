import { useState } from 'react';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { useChallengeStore } from '../../stores/useChallengeStore';

export function ProfileScreen() {
  const [showProfile, setShowProfile] = useState(false);
  const userTier = useChallengeStore((s) => s.userTier);
  const setUserTier = useChallengeStore((s) => s.setUserTier);
  const setOnboardingComplete = useChallengeStore((s) => s.setOnboardingComplete);
  const clearChallenge = useChallengeStore((s) => s.clearChallenge);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);

  // Mock stats - later from API
  const totalSteps = 5000;
  const completedChallenges = 1;
  const activeDays = 0;

  const handleResetApp = () => {
    if (confirm('⚠️ Reset the entire app?\n\nThis will:\n• Clear all your challenges\n• Reset your progress\n• Return to onboarding\n\nThis cannot be undone!')) {
      clearChallenge();
      setOnboardingComplete(false);
      setCurrentScreen('onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Header */}
      <AppHeader 
        title="Profile" 
        showBackButton 
        onProfileClick={() => setShowProfile(true)} 
      />

      <main className="px-6 py-6 max-w-2xl mx-auto space-y-6">
        {/* User Stats Card */}
        <section className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Your Progress</h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">{totalSteps.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Total Steps</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">{completedChallenges}</div>
              <div className="text-sm text-gray-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-1">{activeDays}</div>
              <div className="text-sm text-gray-400">Active Days</div>
            </div>
          </div>
        </section>

        {/* Account Type */}
        <section className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Account Type</h2>
          
          <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg p-1 mb-4">
            <button
              onClick={() => setUserTier('basic')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                userTier === 'basic' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setUserTier('pro')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                userTier === 'pro' 
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Pro ⭐
            </button>
          </div>

          {/* Plan Features Comparison */}
          {userTier === 'basic' ? (
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
              <div className="text-sm font-semibold text-white mb-3">Basic Plan</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-gray-400">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Contains ads</span>
                </div>
                <div className="flex items-start gap-2 text-gray-400">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Can't pause challenges</span>
                </div>
                <div className="flex items-start gap-2 text-gray-400">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Only 1 person per challenge</span>
                </div>
                <div className="flex items-start gap-2 text-gray-400">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Only 1 active challenge at a time</span>
                </div>
              </div>
              <button
                onClick={() => setUserTier('pro')}
                className="w-full mt-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg"
              >
                Upgrade to Pro ⭐
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 rounded-xl p-4 border border-amber-700/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⭐</span>
                <div className="text-sm font-semibold text-amber-200">Pro Plan</div>
              </div>
              <div className="space-y-2 text-sm text-amber-100">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">No Ads</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Pause & resume challenges</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Assign to multiple people</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Multiple active challenges</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Danger Zone */}
        <section className="bg-red-900/20 border border-red-700/50 rounded-xl p-6">
          <h2 className="text-lg font-bold text-red-400 mb-4">Danger Zone</h2>
          <button
            onClick={handleResetApp}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
          >
            Reset App
          </button>
          <p className="text-xs text-red-300/70 mt-2 text-center">
            This will clear all data and return to onboarding
          </p>
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="home" />
    </div>
  );
}
