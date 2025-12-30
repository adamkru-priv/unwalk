import { useState } from 'react';
import { motion } from 'framer-motion';

interface DailyStepsRewardModalProps {
  steps: number;
  xpReward: number;
  onClaim: () => void;
}

export function DailyStepsRewardModal({ steps, xpReward, onClaim }: DailyStepsRewardModalProps) {
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await onClaim();
    } catch (error) {
      console.error('Failed to claim daily reward:', error);
      setClaiming(false);
    }
  };

  const distance = ((steps * 0.8) / 1000).toFixed(1);
  const calories = Math.round(steps * 0.04);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-gradient-to-br from-blue-900/95 via-cyan-900/95 to-teal-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-5"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
        className="max-w-md w-full"
      >
        {/* Animated Stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                y: [0, -200],
                x: [0, (Math.random() - 0.5) * 300]
              }}
              transition={{
                duration: 3,
                delay: i * 0.1,
                repeat: Infinity,
                repeatDelay: 5
              }}
              className="absolute text-4xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: '60%'
              }}
            >
              ⭐
            </motion.div>
          ))}
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#151A25] rounded-3xl overflow-hidden shadow-2xl relative"
        >
          {/* Hero Section */}
          <div className="relative bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-8 text-center">
            {/* Trophy Badge */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", bounce: 0.5 }}
              className="inline-flex w-24 h-24 bg-white rounded-full items-center justify-center shadow-2xl mb-4"
            >
              <span className="text-6xl">🎉</span>
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-black text-white mb-2"
            >
              Daily Goal Reached!
            </motion.h1>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white/90 text-lg font-semibold"
            >
              {steps.toLocaleString()} steps completed! 🚶‍♂️
            </motion.p>
          </div>

          {/* Content */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="p-6"
          >
            <h2 className="text-xs font-bold text-gray-500 dark:text-white/60 uppercase tracking-wider mb-4">
              Today's Achievement
            </h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {/* Steps */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-2xl p-3 border-2 border-blue-200 dark:border-blue-500/30">
                <div className="text-2xl font-black text-blue-900 dark:text-blue-300 mb-1">
                  {steps.toLocaleString()}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-400 uppercase tracking-wide font-semibold">
                  Steps
                </div>
              </div>

              {/* Distance */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-2xl p-3 border-2 border-purple-200 dark:border-purple-500/30">
                <div className="text-2xl font-black text-purple-900 dark:text-purple-300 mb-1">
                  {distance}km
                </div>
                <div className="text-xs text-purple-700 dark:text-purple-400 uppercase tracking-wide font-semibold">
                  Distance
                </div>
              </div>

              {/* Calories */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 rounded-2xl p-3 border-2 border-orange-200 dark:border-orange-500/30">
                <div className="text-2xl font-black text-orange-900 dark:text-orange-300 mb-1">
                  {calories}
                </div>
                <div className="text-xs text-orange-700 dark:text-orange-400 uppercase tracking-wide font-semibold">
                  Calories
                </div>
              </div>
            </div>

            {/* XP Reward Box */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-500/30 rounded-2xl p-6 mb-6 text-center"
            >
              <div className="text-5xl mb-3">🎁</div>
              <div className="text-3xl font-black text-amber-900 dark:text-amber-400 mb-2">
                +{xpReward} XP
              </div>
              <div className="text-sm text-amber-700 dark:text-amber-500 font-semibold">
                Daily Steps Reward
              </div>
            </motion.div>

            {/* Claim Button */}
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {claiming ? (
                  <>
                    <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    🎁 Claim {xpReward} XP
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
