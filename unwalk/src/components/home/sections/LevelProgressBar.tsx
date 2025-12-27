import { motion } from 'framer-motion';
import { calculateXPForLevel, calculateLevelProgress } from '../../../lib/gamification';

interface LevelProgressBarProps {
  xp: number;
  level: number;
  compact?: boolean;
}

export function LevelProgressBar({ xp, level, compact = false }: LevelProgressBarProps) {
  const progress = calculateLevelProgress(xp, level);
  const currentLevelXP = calculateXPForLevel(level);
  const nextLevelXP = calculateXPForLevel(level + 1);
  const xpInCurrentLevel = xp - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  
  // Get level tier (for visual styling)
  const getLevelTier = (lvl: number) => {
    if (lvl < 10) return { name: 'Beginner', color: 'from-green-500 to-emerald-500', emoji: '🌱' };
    if (lvl < 20) return { name: 'Explorer', color: 'from-blue-500 to-cyan-500', emoji: '🗺️' };
    if (lvl < 30) return { name: 'Adventurer', color: 'from-purple-500 to-pink-500', emoji: '⚔️' };
    if (lvl < 40) return { name: 'Champion', color: 'from-orange-500 to-red-500', emoji: '🏆' };
    return { name: 'Legend', color: 'from-yellow-500 to-amber-500', emoji: '👑' };
  };

  const tier = getLevelTier(level);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{tier.emoji}</span>
          <div>
            <div className="text-sm font-black text-gray-900 dark:text-white">
              Level {level}
            </div>
            <div className="text-xs text-gray-600 dark:text-white/60">
              {tier.name}
            </div>
          </div>
        </div>
        <div className="flex-1">
          <div className="bg-gray-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
            <motion.div 
              className={`bg-gradient-to-r ${tier.color} h-full rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="text-xs text-gray-600 dark:text-white/60 mt-1 text-right">
            {xpInCurrentLevel.toLocaleString()} / {xpNeededForLevel.toLocaleString()} XP
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/10 rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-2xl shadow-lg`}>
            {tier.emoji}
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              Level {level}
            </h3>
            <p className="text-sm text-gray-600 dark:text-white/60">
              {tier.name}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {Math.round(progress)}%
          </div>
          <div className="text-xs text-gray-600 dark:text-white/60">
            to Level {level + 1}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-600 dark:text-white/60">
            {xpInCurrentLevel.toLocaleString()} XP
          </span>
          <span className="text-gray-600 dark:text-white/60">
            {xpNeededForLevel.toLocaleString()} XP
          </span>
        </div>
        <div className="bg-gray-200 dark:bg-white/10 rounded-full h-3 overflow-hidden">
          <motion.div 
            className={`bg-gradient-to-r ${tier.color} h-full rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="text-xs text-gray-600 dark:text-white/60 text-center mt-2">
          {(xpNeededForLevel - xpInCurrentLevel).toLocaleString()} XP needed
        </div>
      </div>
    </motion.div>
  );
}
