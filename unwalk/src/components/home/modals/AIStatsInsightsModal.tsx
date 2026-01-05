import { useAIInsights } from '../../../hooks/useAI';
import { useState, useEffect } from 'react';

interface AIStatsInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeklyData: {
    days: string[];
    steps: number[];
  };
  currentStreak: number;
  totalChallenges?: number;
  completedChallenges?: number;
  level?: number;
  xp?: number;
}

export function AIStatsInsightsModal({ 
  isOpen, 
  onClose, 
  weeklyData,
  currentStreak,
  totalChallenges = 0,
  completedChallenges = 0,
  level = 1,
  xp = 0
}: AIStatsInsightsModalProps) {
  const [insights, setInsights] = useState<any>(null);
  const { getInsights, loading } = useAIInsights();

  useEffect(() => {
    if (isOpen && !insights && !loading) {
      loadInsights();
    }
  }, [isOpen]);

  const loadInsights = async () => {
    try {
      const data = await getInsights({
        weeklySteps: weeklyData.steps,
        streak: currentStreak,
        totalChallenges,
        completedChallenges,
        level,
        xp
      });
      
      if (data) {
        setInsights(data);
      }
    } catch (error) {
      console.error('Failed to load insights:', error);
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
              <span className="text-3xl">🤖</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">AI Insights</h2>
              <p className="text-sm text-white/80">Your week analyzed</p>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="inline-block w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-semibold">
                Analyzing your week...
              </p>
            </div>
          )}

          {!loading && insights && (
            <div className="space-y-4">
              {/* Trend Card - Clean Design */}
              <div className={`rounded-2xl p-5 ${getTrendConfig(insights.trend).bg}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{getTrendConfig(insights.trend).emoji}</span>
                  <div>
                    <p className="text-xs font-black text-white/80 uppercase tracking-wide">Weekly Trend</p>
                    <h3 className="text-xl font-black text-white">{getTrendConfig(insights.trend).text}</h3>
                  </div>
                </div>
              </div>

              {/* Main Insight */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-white leading-relaxed">
                  {insights.summary}
                </p>
              </div>

              {/* Recommendations */}
              {insights.recommendations && insights.recommendations.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                    Recommendations
                  </p>
                  {insights.recommendations.map((rec: string, idx: number) => (
                    <div 
                      key={idx}
                      className="flex gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-500/30"
                    >
                      <span className="text-xl flex-shrink-0">💡</span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                        {rec}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500/30 rounded-xl p-4">
                  <p className="text-xs font-bold text-green-900 dark:text-green-300 mb-1 uppercase tracking-wide">
                    Weekly Avg
                  </p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">
                    {insights.weeklyAverage?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">steps/day</p>
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

          {!loading && !insights && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Failed to load insights. Try again?
              </p>
              <button
                onClick={loadInsights}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:scale-105 active:scale-95 transition-all"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Footer - Close Button */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function getTrendConfig(trend: string) {
  switch(trend) {
    case 'improving':
      return { emoji: '🚀', text: 'Improving', bg: 'bg-gradient-to-r from-green-500 to-emerald-500' };
    case 'declining':
      return { emoji: '⚠️', text: 'Needs Attention', bg: 'bg-gradient-to-r from-orange-500 to-red-500' };
    default:
      return { emoji: '✓', text: 'Steady', bg: 'bg-gradient-to-r from-blue-500 to-purple-500' };
  }
}
