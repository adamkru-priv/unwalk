import { useEffect, useState } from 'react';
import { getTodayQuest } from '../../../lib/gamification';
import type { DailyQuest } from '../../../types';

interface DailyActivityHUDProps {
  todaySteps: number;
  dailyStepGoal: number; // 🎯 NEW: Daily step goal from user profile (default 10,000)
  onClick: () => void;
}

export function DailyActivityHUD({ todaySteps, dailyStepGoal = 10000, onClick }: DailyActivityHUDProps) {
  const [dailyQuest, setDailyQuest] = useState<DailyQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false); // 🎯 NEW: Track expanded state

  useEffect(() => {
    const loadDailyStats = async () => {
      try {
        const quest = await getTodayQuest();
        setDailyQuest(quest);
      } catch (error) {
        console.error('Failed to load daily quest:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDailyStats();
  }, [todaySteps]);

  const progressPercent = Math.min(100, Math.round((todaySteps / dailyStepGoal) * 100));

  // Circle progress properties
  const size = 280;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="w-full px-4">
      <div className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl">
        {/* Label */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-black text-gray-800 dark:text-white">My Steps</h2>
        </div>

        {/* Progress Ring */}
        <div className="flex justify-center mb-6">
          <div className="relative" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90" width={size} height={size}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="transparent"
                className="text-gray-200 dark:text-gray-800"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="url(#gradient-daily)"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'
                }}
              />
              <defs>
                <linearGradient id="gradient-daily" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center - Steps */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-black text-gray-900 dark:text-white mb-1">
                {todaySteps.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold">
                / {dailyStepGoal.toLocaleString()} steps
              </div>
              <div className="mt-2 text-lg font-black text-blue-600 dark:text-blue-400">
                {progressPercent}%
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
            Today's Activity
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {progressPercent >= 100 ? 'Daily goal completed!' : `${(dailyStepGoal - todaySteps).toLocaleString()} steps to go`}
          </p>
        </div>

        {/* Daily Challenge Card */}
        {!loading && dailyQuest && (
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-4 mb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase mb-1">
                  Daily Challenge
                </div>
                <h4 className="text-lg font-black text-gray-900 dark:text-white">
                  {dailyQuest.quest_type === 'steps' && `Walk ${dailyQuest.target_value.toLocaleString()} steps`}
                  {dailyQuest.quest_type === 'challenge_progress' && 'Complete your active challenge'}
                  {dailyQuest.quest_type === 'social' && 'Challenge a friend'}
                </h4>
              </div>
              {dailyQuest.completed && !dailyQuest.claimed && (
                <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  Ready!
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Reward: <span className="font-black text-gray-900 dark:text-white">{dailyQuest.xp_reward} XP</span>
              </div>
              <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                {dailyQuest.completed 
                  ? dailyQuest.claimed ? 'Claimed' : 'Complete!'
                  : `${dailyQuest.current_progress || 0} / ${dailyQuest.target_value || 0}`
                }
              </div>
            </div>
          </div>
        )}

        {/* Toggle Details Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl active:scale-98 transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isExpanded ? 'Hide Details' : 'View Challenge Details'}
          <svg 
            className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 🎯 NEW: Expanded Details Panel */}
        <div 
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            isExpanded ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="space-y-3">
            {/* Quest Details */}
            {dailyQuest && (
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">
                  Daily Challenge Details
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3">
                  {dailyQuest.quest_type === 'steps' && `Walk ${dailyQuest.target_value.toLocaleString()} steps today`}
                  {dailyQuest.quest_type === 'challenge_progress' && 'Make progress on your active challenge'}
                  {dailyQuest.quest_type === 'social' && 'Challenge a friend to compete'}
                </h3>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                      {Math.min(100, Math.round((dailyQuest.current_progress / dailyQuest.target_value) * 100))}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (dailyQuest.current_progress / dailyQuest.target_value) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 text-center">
                    {dailyQuest.current_progress.toLocaleString()} / {dailyQuest.target_value.toLocaleString()}
                  </div>
                </div>

                {/* Reward Info */}
                <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase mb-1">Reward</div>
                      <div className="text-2xl font-black text-gray-900 dark:text-white">
                        {dailyQuest.xp_reward} XP
                      </div>
                    </div>
                    {dailyQuest.completed && !dailyQuest.claimed && (
                      <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm">
                        Ready to Claim!
                      </div>
                    )}
                    {dailyQuest.claimed && (
                      <div className="text-gray-500 dark:text-gray-400 text-sm font-semibold">
                        ✓ Claimed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Claim Reward Button (only if completed and not claimed) */}
            {dailyQuest?.completed && !dailyQuest?.claimed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(); // This will trigger the claim flow
                }}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl active:scale-98 transition-all duration-200"
              >
                Claim {dailyQuest.xp_reward} XP Reward
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
