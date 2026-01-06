import { useAIDailyTip } from '../../../hooks/useAI';
import { useState, useEffect } from 'react';

interface DailyTipModalProps {
  isOpen: boolean;
  onClose: () => void;
  todaySteps: number;
  dailyGoal: number;
  currentStreak: number;
  userLevel: number;
  hasActiveChallenge: boolean;
}

export function DailyTipModal({ 
  isOpen, 
  onClose, 
  todaySteps, 
  dailyGoal, 
  currentStreak, 
  userLevel, 
  hasActiveChallenge 
}: DailyTipModalProps) {
  const [dailyTip, setDailyTip] = useState<any>(null);
  const { getDailyTip, loading } = useAIDailyTip();

  useEffect(() => {
    if (isOpen && !dailyTip && !loading) {
      loadDailyTip();
    }
  }, [isOpen]);

  const loadDailyTip = async () => {
    try {
      const tip = await getDailyTip({
        todaySteps,
        dailyGoal,
        currentStreak,
        userLevel,
        hasActiveChallenge
      });
      
      if (tip) {
        setDailyTip(tip);
      }
    } catch (error) {
      console.error('Failed to load daily tip:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#151A25] rounded-3xl max-w-md w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-3xl">💡</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Daily Tip</h2>
              <p className="text-sm text-white/80">AI-powered advice</p>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="inline-block w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-semibold">
                Analyzing your activity...
              </p>
            </div>
          )}

          {!loading && !dailyTip && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Failed to load tip. Try again?
              </p>
              <button
                onClick={loadDailyTip}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:scale-105 active:scale-95 transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {dailyTip && (
            <div className="space-y-4">
              {/* Category Badge */}
              <div className={`rounded-2xl p-5 ${getCategoryConfig(dailyTip.category).bg}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{getCategoryConfig(dailyTip.category).emoji}</span>
                  <div>
                    <p className="text-xs font-black text-white/80 uppercase tracking-wide">
                      {dailyTip.category}
                    </p>
                    <h3 className="text-xl font-black text-white">
                      {getCategoryConfig(dailyTip.category).title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Main Tip - Clean Design */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-relaxed">
                  {dailyTip.tip}
                </p>
              </div>

              {/* Quick Win */}
              {dailyTip.details?.quickWin && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500/30 rounded-xl p-5">
                  <div className="flex gap-3">
                    <span className="text-2xl flex-shrink-0">⚡</span>
                    <div className="flex-1">
                      <p className="text-xs font-black text-green-900 dark:text-green-300 mb-2 uppercase tracking-wide">
                        Quick Action
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {dailyTip.details.quickWin}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-500/30 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-300 mb-1 uppercase tracking-wide">
                    Today
                  </p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">
                    {todaySteps.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">steps</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-500/30 rounded-xl p-4">
                  <p className="text-xs font-bold text-orange-900 dark:text-orange-300 mb-1 uppercase tracking-wide">
                    Streak
                  </p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">
                    {currentStreak}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">days</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Close Button */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

function getCategoryConfig(category: string) {
  switch(category?.toLowerCase()) {
    case 'motivation':
      return { 
        emoji: '🔥', 
        title: 'Stay Motivated',
        bg: 'bg-gradient-to-r from-orange-500 to-red-500' 
      };
    case 'health':
      return { 
        emoji: '❤️', 
        title: 'Health Tips',
        bg: 'bg-gradient-to-r from-pink-500 to-rose-500' 
      };
    case 'performance':
      return { 
        emoji: '🚀', 
        title: 'Performance Boost',
        bg: 'bg-gradient-to-r from-blue-500 to-indigo-500' 
      };
    case 'recovery':
      return { 
        emoji: '🧘', 
        title: 'Recovery & Rest',
        bg: 'bg-gradient-to-r from-green-500 to-emerald-500' 
      };
    case 'challenge':
      return { 
        emoji: '🎯', 
        title: 'Challenge Strategy',
        bg: 'bg-gradient-to-r from-purple-500 to-pink-500' 
      };
    default:
      return { 
        emoji: '💡', 
        title: 'Daily Tip',
        bg: 'bg-gradient-to-r from-purple-500 to-pink-500' 
      };
  }
}
