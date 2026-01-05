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
      <div className="bg-white dark:bg-[#151A25] rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-3xl">🤖</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Daily Tip</h2>
              <p className="text-sm text-white/80">AI-powered advice</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <span className="text-xl">{dailyTip.icon}</span>
                <span className="text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                  {dailyTip.category}
                </span>
              </div>

              {/* Main Tip - Clean Design */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700">
                <p className="text-base font-semibold text-gray-900 dark:text-white leading-relaxed">
                  {dailyTip.tip}
                </p>
              </div>

              {/* Quick Win */}
              {dailyTip.details?.quickWin && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500/30 rounded-2xl p-5">
                  <p className="text-xs font-black text-green-900 dark:text-green-300 mb-2 uppercase tracking-wide">
                    Quick Action
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {dailyTip.details.quickWin}
                  </p>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
              >
                Got it!
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
