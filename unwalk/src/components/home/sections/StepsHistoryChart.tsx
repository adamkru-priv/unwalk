import { useState, useEffect, useRef } from 'react';
import { useHealthKit } from '../../../hooks/useHealthKit';
import { useChallengeStore } from '../../../stores/useChallengeStore';

interface StepsHistoryChartProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DayData {
  date: string;
  steps: number;
  label: string;
}

export function StepsHistoryChart({ isOpen, onClose }: StepsHistoryChartProps) {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const DAILY_GOAL = 10000; // Can be made dynamic from user settings
  
  const { getStepsHistory, isAuthorized } = useHealthKit();
  const todaySteps = useChallengeStore((s) => s.todaySteps); // 🎯 Get current steps from store
  const userProfile = useChallengeStore((s) => s.userProfile); // 🎯 Get user profile for registration date

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, todaySteps]); // 🎯 Reload when todaySteps changes

  const loadData = async () => {
    setLoading(true);
    try {
      // 🎯 Calculate days since registration
      const registrationDate = userProfile?.created_at ? new Date(userProfile.created_at) : null;
      const today = new Date();
      
      let daysSinceRegistration = 365; // Default fallback
      if (registrationDate) {
        const diffTime = Math.abs(today.getTime() - registrationDate.getTime());
        daysSinceRegistration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include today
        console.log('📊 User registered:', registrationDate.toISOString(), 'Days since:', daysSinceRegistration);
      }
      
      const days = Math.min(daysSinceRegistration, 365); // Max 365 days
      const history = await getStepsHistory(days);
      
      console.log('📊 Steps history loaded:', history.length, 'days (from registration)');
      console.log('📊 Today steps from store:', todaySteps);
      
      const todayDateString = today.toISOString().split('T')[0];
      
      const formattedData: DayData[] = history.map((item, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - index));
        
        // Format: 30/12
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const label = `${day}/${month}`;
        
        const dateString = date.toISOString().split('T')[0];
        
        // 🎯 Use todaySteps from store for today, historical data for other days
        const steps = dateString === todayDateString ? todaySteps : item.steps;
        
        return {
          date: dateString,
          steps,
          label
        };
      }); // 🎯 REMOVED .filter(item => item.steps > 0) - show all days

      console.log('📊 Formatted data:', formattedData.length, 'days');
      console.log('📊 Last 7 days:', formattedData.slice(-7));
      
      setData(formattedData);
      
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
      }, 100);
    } catch (error) {
      console.error('❌ Failed to load steps history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const bestDay = Math.max(...data.map(d => d.steps), 0);
  const maxSteps = Math.max(bestDay, DAILY_GOAL * 1.2);
  
  // 🎯 Calculate current goal streak (consecutive days meeting goal from today backwards)
  let currentGoalStreak = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].steps >= DAILY_GOAL) {
      currentGoalStreak++;
    } else {
      break; // Stop when we hit a day that didn't meet the goal
    }
  }
  
  console.log('📊 Chart render - bestDay:', bestDay, 'maxSteps:', maxSteps, 'data length:', data.length, 'goal streak:', currentGoalStreak);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onTouchMove={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-white dark:bg-[#151A25] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              Steps History
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="text-6xl mb-4">📊</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                No steps data available
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                {!isAuthorized 
                  ? 'Please grant Health Connect permissions to see your steps history.'
                  : 'Start walking to see your steps history here!'}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col p-6">
              {/* Goal info */}
              <div className="flex items-center justify-between mb-6">
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Swipe to see history →
                </div>
                <div className="text-xs text-blue-500 dark:text-blue-400 font-semibold">
                  Goal: {DAILY_GOAL.toLocaleString()} steps
                </div>
              </div>

              {/* 🎯 Goal Streak Badge */}
              {currentGoalStreak > 0 && (
                <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl px-4 py-3 flex items-center justify-center gap-2">
                  <span className="text-2xl">🔥</span>
                  <div className="text-center">
                    <div className="text-2xl font-black text-green-600 dark:text-green-400">{currentGoalStreak} {currentGoalStreak === 1 ? 'day' : 'days'}</div>
                    <div className="text-xs text-green-700 dark:text-green-300 font-medium">Goal streak</div>
                  </div>
                </div>
              )}

              {/* Scrollable circles */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-x-auto overflow-y-hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <style>{`
                  div::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                
                <div className="flex items-start justify-start gap-3 h-full" style={{ minWidth: `${data.length * 64}px` }}>
                  {data.map((item, index) => {
                    const isGoalMet = item.steps >= DAILY_GOAL;
                    const isToday = index === data.length - 1;
                    const hasSteps = item.steps > 0;
                    
                    return (
                      <div 
                        key={index} 
                        className="flex flex-col items-center gap-2 flex-shrink-0"
                        style={{ width: '56px' }}
                      >
                        {/* Circle */}
                        <div className="relative flex items-center justify-center">
                          {hasSteps ? (
                            <svg width="48" height="48" className="transform -rotate-90">
                              {/* Background circle */}
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="6"
                                className="text-gray-700 dark:text-gray-700"
                              />
                              {/* Progress circle */}
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 20}`}
                                strokeDashoffset={`${2 * Math.PI * 20 * (1 - Math.min(item.steps / DAILY_GOAL, 1))}`}
                                className={`transition-all ${
                                  isGoalMet 
                                    ? 'text-green-500' 
                                    : 'text-blue-500'
                                }`}
                              />
                              {/* Removed yellow ring for today */}
                            </svg>
                          ) : (
                            <div className="w-[48px] h-[48px] rounded-full border-[6px] border-gray-700 dark:border-gray-700" />
                          )}
                        </div>
                        
                        {/* Steps count */}
                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300 text-center">
                          {hasSteps ? (item.steps / 1000).toFixed(1) + 'k' : '0'}
                        </div>
                        
                        {/* Date - yellow and bold if today */}
                        <div className={`text-[10px] font-bold text-center ${
                          isToday 
                            ? 'text-yellow-400' 
                            : 'text-gray-500 dark:text-gray-500'
                        }`}>
                          {item.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-4 border-blue-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">Below goal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">Goal met</span>
                </div>
                {/* Removed "Today" legend item with yellow ring */}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm hover:scale-105 active:scale-95 transition-transform"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
