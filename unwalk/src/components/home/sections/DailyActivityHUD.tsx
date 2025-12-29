import { useEffect } from 'react';
import { useHealthKit } from '../../../hooks/useHealthKit';

interface DailyActivityHUDProps {
  todaySteps: number;
  dailyStepGoal: number; // 🎯 NEW: Daily step goal from user profile (default 10,000)
  onClick: () => void;
}

export function DailyActivityHUD({ todaySteps, dailyStepGoal = 10000, onClick }: DailyActivityHUDProps) {
  // 🎯 FIX: Auto-refresh steps only on iOS with HealthKit connected
  const { syncSteps, isNative, isAuthorized } = useHealthKit();
  
  useEffect(() => {
    // Only sync if running on native iOS AND HealthKit is authorized
    if (!isNative || !isAuthorized) {
      console.log('⏭️ [DailyActivityHUD] Skipping auto-refresh - not iOS or HealthKit not authorized');
      return;
    }

    console.log('🔄 [DailyActivityHUD] Starting auto-refresh for HealthKit steps');
    
    // Sync immediately on mount
    syncSteps();
    
    // Then sync every 5 seconds for real-time updates
    const interval = setInterval(() => {
      syncSteps();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [syncSteps, isNative, isAuthorized]);

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
            {progressPercent >= 100 ? 'Daily goal completed! 🎉' : `${(dailyStepGoal - todaySteps).toLocaleString()} steps to go`}
          </p>
        </div>

        {/* 🎯 REMOVED: Daily Challenge Card - users can see it in details */}

        {/* View Details Button */}
        <button 
          onClick={onClick}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl active:scale-98 transition-all duration-200 flex items-center justify-center gap-2"
        >
          View Challenge Details
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
