import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { useState } from 'react';

export function ProfileScreen() {
  const userTier = useChallengeStore((s) => s.userTier);
  const setUserTier = useChallengeStore((s) => s.setUserTier);
  const dailyStepGoal = useChallengeStore((s) => s.dailyStepGoal);
  const setDailyStepGoal = useChallengeStore((s) => s.setDailyStepGoal);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const setOnboardingComplete = useChallengeStore((s) => s.setOnboardingComplete);
  
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleStartEdit = () => {
    setInputValue((dailyStepGoal || 10000).toString());
    setIsEditingGoal(true);
  };

  const handleSaveGoal = () => {
    const num = parseInt(inputValue.replace(/\D/g, ''));
    if (!isNaN(num) && num >= 1000) {
      setDailyStepGoal(num);
    }
    setIsEditingGoal(false);
    // TODO: Save to backend/localStorage
  };

  const handleCancelEdit = () => {
    setIsEditingGoal(false);
    setInputValue('');
  };

  const handleInputChange = (value: string) => {
    // Remove all non-digits
    const digitsOnly = value.replace(/\D/g, '');
    setInputValue(digitsOnly);
  };

  const formatWithCommas = (num: number) => {
    return num.toLocaleString('en-US');
  };

  const displayGoal = dailyStepGoal || 10000;

  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-20 font-sans">
      {/* Header */}
      <AppHeader />

      <main className="px-5 py-6 max-w-md mx-auto space-y-5">
        {/* Daily Step Goal */}
        <section className="bg-[#151A25] border border-white/5 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
            <span>🎯</span>
            <span>Daily Step Goal</span>
          </h2>
          
          {isEditingGoal ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="flex-1 bg-[#0B101B] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10000"
                />
                <span className="text-gray-400 text-sm">steps</span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleSaveGoal}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-lg font-medium text-sm transition-colors border border-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#0B101B] rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold text-white">
                  {formatWithCommas(displayGoal)}
                </div>
                <button
                  onClick={handleStartEdit}
                  className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-white/10"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs text-gray-400">steps per day</div>
            </div>
          )}
        </section>

        {/* Account Type */}
        <section className="bg-[#151A25] border border-white/5 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Account Type</h2>
          
          <div className="flex items-center gap-2 bg-[#0B101B] rounded-lg p-1 mb-3 border border-white/5">
            <button
              onClick={() => setUserTier('basic')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                userTier === 'basic' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setUserTier('pro')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                userTier === 'pro' 
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Pro ⭐
            </button>
          </div>

          {/* Plan Features Comparison - Compact */}
          {userTier === 'basic' ? (
            <div className="bg-[#0B101B] rounded-xl p-3 border border-white/5">
              <div className="text-xs font-semibold text-white mb-2">Basic Plan</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-start gap-2 text-gray-400">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Contains ads</span>
                </div>
                <div className="flex items-start gap-2 text-gray-400">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Can't pause challenges</span>
                </div>
                <div className="flex items-start gap-2 text-gray-400">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Only 1 active challenge</span>
                </div>
                <div className="flex items-start gap-2 text-gray-400">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>No points for completing challenges</span>
                </div>
              </div>
              <button
                onClick={() => setUserTier('pro')}
                className="w-full mt-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3 py-2 rounded-lg font-semibold text-xs transition-all shadow-md hover:shadow-lg"
              >
                Upgrade to Pro ⭐
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 rounded-xl p-3 border border-amber-700/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⭐</span>
                <div className="text-xs font-semibold text-amber-200">Pro Plan Active</div>
              </div>
              <div className="space-y-1.5 text-xs text-amber-100">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>No Ads</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Pause & resume challenges</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Multiple active challenges</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Earn points for completing challenges</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Actions Section */}
        <section className="space-y-3">
          {/* View Onboarding */}
          <button
            onClick={() => {
              setOnboardingComplete(false);
              setCurrentScreen('onboarding');
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-2xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View Onboarding Tutorial
          </button>
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="home" />
    </div>
  );
}
