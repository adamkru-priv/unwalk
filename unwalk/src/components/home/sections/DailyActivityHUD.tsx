import { useEffect, useState, useRef } from 'react';
import { useHealthKit } from "../../../hooks/useHealthKit";
import { analytics, AnalyticsEvents } from "../../../lib/analytics";
import { AIDailyTip } from "./AIDailyTip";

interface DailyActivityHUDProps {
  todaySteps: number;
  dailyStepGoal: number;
  currentStreak?: number;
  userLevel?: number;
  hasActiveChallenge?: boolean;
  onRefresh?: () => Promise<void>;
}

export default function DailyActivityHUD({ 
  todaySteps, 
  dailyStepGoal = 10000, 
  currentStreak = 0,
  userLevel = 1,
  hasActiveChallenge = false,
  onRefresh 
}: DailyActivityHUDProps) {
  const { syncSteps, isNative, isAuthorized } = useHealthKit();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDailyTip, setShowDailyTip] = useState(false);
  const hasTrackedGoalToday = useRef(false);

  useEffect(() => {
    const progressPercent = Math.min(100, Math.round((todaySteps / dailyStepGoal) * 100));
    
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    const lastTrackedKey = localStorage.getItem('last_daily_goal_tracked');
    
    if (lastTrackedKey !== todayKey) {
      hasTrackedGoalToday.current = false;
    }
    
    if (progressPercent >= 100 && !hasTrackedGoalToday.current) {
      analytics.track(AnalyticsEvents.DAILY_GOAL_REACHED, {
        steps: todaySteps,
        goal: dailyStepGoal,
        percent: progressPercent,
        date: todayKey,
      });
      
      hasTrackedGoalToday.current = true;
      localStorage.setItem('last_daily_goal_tracked', todayKey);
    }
  }, [todaySteps, dailyStepGoal]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      if (isNative && isAuthorized) {
        await syncSteps();
      }
      
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('[DailyActivityHUD] Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const progressPercent = Math.min(100, Math.round((todaySteps / dailyStepGoal) * 100));
  const isGoalCompleted = progressPercent >= 100;

  const size = 280;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <>
      <div className="w-full px-4">
        <div className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl relative">
          {/* 🎯 Cute AI Robot - small floating assistant in top right */}
          <button
            onClick={() => setShowDailyTip(true)}
            className="absolute top-3 right-3 group z-10"
            title="Ask me for today's tip!"
          >
            <div className="relative">
              {/* Subtle glow */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-400 to-pink-400 blur-sm opacity-40 group-hover:opacity-60 transition-opacity" />
              
              {/* Robot icon */}
              <div className="relative bg-gradient-to-br from-purple-500 via-purple-400 to-pink-400 rounded-lg p-2 shadow-lg group-hover:scale-110 group-active:scale-95 transition-all duration-300">
                <span className="text-2xl block leading-none">🤖</span>
              </div>
              
              {/* Tiny sparkle */}
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-300 animate-ping" />
            </div>
          </button>

          <div className="text-center mb-4">
            <h2 className="text-xl font-black text-gray-800 dark:text-white">My Steps</h2>
          </div>

          <div 
            className="flex justify-center mb-6 cursor-pointer group"
            onClick={handleRefresh}
          >
            <div className="relative transition-transform duration-200 group-hover:scale-105" style={{ width: size, height: size }}>
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-400/30 via-cyan-400/20 to-transparent transition-all duration-1000 ease-out"
                  style={{ 
                    height: `${progressPercent}%`,
                    animation: 'wave 3s ease-in-out infinite'
                  }}
                />
                
                {progressPercent > 10 && (
                  <>
                    <div className="absolute bottom-[20%] left-[30%] text-2xl animate-float" style={{ animationDelay: '0s' }}>
                      👣
                    </div>
                    <div className="absolute bottom-[40%] right-[25%] text-xl animate-float" style={{ animationDelay: '1s' }}>
                      👣
                    </div>
                    <div className="absolute bottom-[60%] left-[40%] text-lg animate-float" style={{ animationDelay: '2s', opacity: 0.6 }}>
                      👣
                    </div>
                  </>
                )}

                {isGoalCompleted && (
                  <>
                    <div className="absolute top-[10%] left-[20%] text-xl animate-bounce" style={{ animationDelay: '0s' }}>
                      🎉
                    </div>
                    <div className="absolute top-[15%] right-[25%] text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>
                      ✨
                    </div>
                    <div className="absolute top-[30%] left-[15%] text-lg animate-bounce" style={{ animationDelay: '0.4s' }}>
                      🌟
                    </div>
                    <div className="absolute top-[25%] right-[15%] text-xl animate-bounce" style={{ animationDelay: '0.6s' }}>
                      🎊
                    </div>
                  </>
                )}
              </div>

              <svg className="transform -rotate-90 relative z-10" width={size} height={size}>
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
                  stroke={isGoalCompleted ? "url(#gradient-daily-completed)" : "url(#gradient-daily)"}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: isGoalCompleted 
                      ? 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.5))' 
                      : 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'
                  }}
                />
                <defs>
                  <linearGradient id="gradient-daily" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                  <linearGradient id="gradient-daily-completed" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <div className="text-5xl font-black text-gray-900 dark:text-white mb-1">
                  {todaySteps.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold">
                  / {dailyStepGoal.toLocaleString()} steps
                </div>
                <div className="mt-2 text-lg font-black text-blue-600 dark:text-blue-400">
                  {progressPercent}%
                </div>
                {isRefreshing && (
                  <div className="mt-2 text-xs text-blue-400 dark:text-blue-300 animate-pulse">
                    Updating...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
              Today's Activity
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {progressPercent >= 100 ? 'Daily goal completed! 🎉' : `${(dailyStepGoal - todaySteps).toLocaleString()} steps to go`}
            </p>
          </div>
        </div>

        {showDailyTip && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDailyTip(false)}
          >
            <div 
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <AIDailyTip 
                todaySteps={todaySteps} 
                dailyGoal={dailyStepGoal}
                currentStreak={currentStreak}
                userLevel={userLevel}
                hasActiveChallenge={hasActiveChallenge}
              />
              <button
                onClick={() => setShowDailyTip(false)}
                className="mt-4 w-full py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-transform duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
