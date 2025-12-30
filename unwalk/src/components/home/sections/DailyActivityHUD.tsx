import { useEffect, useState } from 'react';
import { useHealthKit } from '../../../hooks/useHealthKit';

interface DailyActivityHUDProps {
  todaySteps: number;
  dailyStepGoal: number;
  onClick: () => void;
  onRefresh?: () => Promise<void>; // 🎯 NEW: Manual refresh callback
}

export function DailyActivityHUD({ todaySteps, dailyStepGoal = 10000, onClick, onRefresh }: DailyActivityHUDProps) {
  const { syncSteps, isNative, isAuthorized } = useHealthKit();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false); // 🎯 NEW: Silent background refresh

  // 🎯 NEW: Background refresh - no loading spinner, just update data
  const handleBackgroundRefresh = async () => {
    if (isBackgroundRefresh) return; // Already refreshing in background
    
    setIsBackgroundRefresh(true);
    try {
      // Sync HealthKit steps silently
      if (isNative && isAuthorized) {
        await syncSteps();
      }
      
      // Call parent refresh callback silently
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('[DailyActivityHUD] Background refresh failed:', error);
    } finally {
      setIsBackgroundRefresh(false);
    }
  };
  
  // 🎯 NEW: Manual refresh function - shows loading spinner
  const handleManualRefresh = async () => {
    if (isRefreshing || isBackgroundRefresh) return;
    
    setIsRefreshing(true);
    try {
      // Sync HealthKit steps if on iOS
      if (isNative && isAuthorized) {
        await syncSteps();
      }
      
      // Call parent refresh callback
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('[DailyActivityHUD] Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 🎯 NEW: Silent background refresh on mount (when slide becomes visible)
  useEffect(() => {
    handleBackgroundRefresh();
  }, []); // Only on mount

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

        {/* Progress Ring - 🎯 CHANGED: Click to refresh, not expand */}
        <div 
          className="flex justify-center mb-6 cursor-pointer group"
          onClick={handleManualRefresh}
        >
          <div className="relative transition-transform duration-200 group-hover:scale-105" style={{ width: size, height: size }}>
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
              {isRefreshing ? (
                <div className="text-blue-600 dark:text-blue-400 animate-spin">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              ) : (
                <>
                  <div className="text-5xl font-black text-gray-900 dark:text-white mb-1">
                    {todaySteps.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold">
                    / {dailyStepGoal.toLocaleString()} steps
                  </div>
                  <div className="mt-2 text-lg font-black text-blue-600 dark:text-blue-400">
                    {progressPercent}%
                  </div>
                </>
              )}
              {/* 🎯 NEW: Tap to refresh hint */}
              <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                👆 Tap to refresh
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
