import { motion } from 'framer-motion';

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  nextMilestone?: { milestone: number; reward: string };
}

export function StreakCard({ currentStreak, longestStreak, nextMilestone }: StreakCardProps) {
  const daysUntilMilestone = nextMilestone ? nextMilestone.milestone - currentStreak : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 dark:border-orange-500/30 rounded-2xl p-5 relative overflow-hidden"
    >
      {/* Accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500"></div>
      
      {/* Glow effect */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🔥</div>
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide">
                {currentStreak}-Day Streak!
              </h3>
              <p className="text-xs text-gray-600 dark:text-white/60 mt-0.5">
                {currentStreak === 0 
                  ? 'Complete a quest to start'
                  : longestStreak === currentStreak
                    ? "🎉 Personal best!"
                    : `Best: ${longestStreak} days`
                }
              </p>
            </div>
          </div>
          
          {currentStreak > 0 && (
            <div className="text-right">
              <div className="text-2xl font-black text-orange-500">{currentStreak}</div>
              <div className="text-xs text-gray-600 dark:text-white/60">days</div>
            </div>
          )}
        </div>

        {nextMilestone && currentStreak > 0 && (
          <div className="bg-white/50 dark:bg-white/5 rounded-xl p-3 border border-orange-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-600 dark:text-white/60 mb-1">
                  Next milestone
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {nextMilestone.milestone} days
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-600 dark:text-white/60 mb-1">
                  Reward
                </div>
                <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                  {nextMilestone.reward}
                </div>
              </div>
            </div>
            <div className="mt-2 bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(currentStreak / nextMilestone.milestone) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 dark:text-white/60 text-center mt-2">
              {daysUntilMilestone} {daysUntilMilestone === 1 ? 'day' : 'days'} to go
            </div>
          </div>
        )}

        {currentStreak === 0 && (
          <div className="text-center py-2 text-gray-600 dark:text-white/50 text-xs">
            Complete your daily quest to start building a streak!
          </div>
        )}
      </div>
    </motion.div>
  );
}
