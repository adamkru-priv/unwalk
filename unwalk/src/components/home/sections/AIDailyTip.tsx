import { useState, useEffect } from 'react';
import { useAIDailyTip } from '../../../hooks/useAI';

interface AIDailyTipProps {
  todaySteps: number;
  dailyGoal: number;
  currentStreak: number;
  userLevel: number;
  hasActiveChallenge: boolean;
}

export function AIDailyTip({ todaySteps, dailyGoal, currentStreak, userLevel, hasActiveChallenge }: AIDailyTipProps) {
  const [dailyTip, setDailyTip] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { getDailyTip, loading } = useAIDailyTip();

  useEffect(() => {
    loadDailyTip();
  }, []);

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

  if (!dailyTip && !loading) {
    return (
      <div className="bg-white dark:bg-[#151A25] rounded-2xl border-2 border-blue-500/30 dark:border-blue-500/40 p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💡</span>
            <span className="text-sm font-bold text-blue-900 dark:text-blue-300">Daily Tip</span>
          </div>
          
          <button
            onClick={loadDailyTip}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            Get My Tip ✨
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#151A25] rounded-2xl border-2 border-blue-500/30 dark:border-blue-500/40 p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="inline-block w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
            Generating your daily tip...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#151A25] rounded-2xl border-2 border-blue-500/30 dark:border-blue-500/40 overflow-hidden shadow-xl">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-2xl mt-0.5">{dailyTip.icon || '💡'}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase">
                  Daily Tip
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  dailyTip.category === 'motivation' 
                    ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
                    : dailyTip.category === 'health'
                      ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                      : 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
                }`}>
                  {dailyTip.category}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                {dailyTip.tip}
              </p>
            </div>
          </div>
          
          <span className={`text-blue-500 text-xl transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {isExpanded && dailyTip.details && (
        <div className="px-4 pb-4 space-y-3 border-t border-blue-500/20 pt-4">
          {/* Quick Win - TYLKO TO! */}
          {dailyTip.details.quickWin && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/30">
              <p className="text-xs font-black text-green-900 dark:text-green-300 mb-2 uppercase">
                🎯 Do This Now:
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {dailyTip.details.quickWin}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}