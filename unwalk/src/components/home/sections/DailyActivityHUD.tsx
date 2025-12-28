import { useEffect, useState } from 'react';
import { getTodayStepsStats } from '../../../lib/gamification';
import { getTodayQuest } from '../../../lib/gamification';
import type { DailyQuest } from '../../../types';

interface DailyActivityHUDProps {
  todaySteps: number;
  onClick: () => void;
}

export function DailyActivityHUD({ todaySteps, onClick }: DailyActivityHUDProps) {
  const [todayBaseXP, setTodayBaseXP] = useState(0);
  const [dailyQuest, setDailyQuest] = useState<DailyQuest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDailyStats = async () => {
      try {
        const [stats, quest] = await Promise.all([
          getTodayStepsStats(),
          getTodayQuest()
        ]);
        
        if (stats) {
          setTodayBaseXP(stats.today_base_xp || 0);
        }
        
        setDailyQuest(quest);
      } catch (error) {
        console.error('Failed to load daily stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDailyStats();
  }, [todaySteps]);

  // Calculate progress to next XP (next 1000 steps)
  const progressToNextXP = ((todaySteps % 1000) / 1000) * 100;

  // Calculate total XP today
  const questXP = dailyQuest?.claimed ? dailyQuest.xp_reward : 0;
  const totalTodayXP = todayBaseXP + questXP;

  // Circle progress properties (same as RunnerHUD)
  const size = 280;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressToNextXP / 100) * circumference;

  return (
    <div className="w-full px-4">
      <div 
        className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl cursor-pointer"
        onClick={onClick}
      >
        {/* Giant Progress Ring - SAME AS RunnerHUD */}
        <div className="flex justify-center mb-6">
          <div className="relative" style={{ width: size, height: size }}>
            {/* Background ring */}
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
              {/* Progress ring */}
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
              {/* Gradient definition */}
              <defs>
                <linearGradient id="gradient-daily" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center content - Steps */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-black text-gray-900 dark:text-white mb-1">
                {todaySteps.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold">
                steps today
              </div>
              <div className="mt-2 text-sm font-black text-blue-600 dark:text-blue-400">
                {Math.round(progressToNextXP)}% to next XP
              </div>
            </div>
          </div>
        </div>

        {/* Title - SAME STYLE */}
        <div className="text-center mb-4">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
            Today's Activity
          </h3>
        </div>

        {/* Compact Stats Row - SAME STYLE */}
        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
          {/* Base XP */}
          <div className="flex items-center gap-2">
            <span className="text-lg">💎</span>
            <div>
              <div className="font-black text-gray-900 dark:text-white">{todayBaseXP} XP</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Base</div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-300 dark:bg-gray-700"></div>

          {/* Quest XP */}
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div>
              <div className="font-black text-gray-900 dark:text-white">
                {questXP} XP
                {dailyQuest?.completed && !dailyQuest?.claimed && (
                  <span className="ml-1 text-green-500">✓</span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Quest</div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-300 dark:bg-gray-700"></div>

          {/* Total Today */}
          <div className="flex items-center gap-2">
            <span className="text-lg">🎉</span>
            <div>
              <div className="font-black text-gray-900 dark:text-white">{totalTodayXP} XP</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
            </div>
          </div>
        </div>

        {/* Simple CTA Button - SAME STYLE */}
        <button 
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl active:scale-98 transition-all duration-200"
        >
          {dailyQuest?.completed && !dailyQuest?.claimed 
            ? '✨ Claim Quest Reward' 
            : 'View Quest Details'}
        </button>

        {/* XP Breakdown Card - Additional info */}
        {!loading && (
          <div className="mt-4 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 rounded-xl p-3">
            <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase mb-2">
              XP Sources Today
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Base (steps)
                </span>
                <span className="font-bold text-gray-900 dark:text-white">{todayBaseXP} XP</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Daily Quest
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {questXP} XP
                  {dailyQuest?.completed && !dailyQuest?.claimed && (
                    <span className="ml-1 text-xs text-green-500">Ready!</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                  Team Challenge
                </span>
                <span className="font-bold text-gray-900 dark:text-white">0 XP</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
