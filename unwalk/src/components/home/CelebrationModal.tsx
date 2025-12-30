import { useState } from 'react';
import { motion } from 'framer-motion';
import type { UserChallenge } from '../../types';
import { calculateChallengePoints, claimCompletedChallenge } from '../../lib/api';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { authService } from '../../lib/auth'; // 🎯 NEW: Import authService

interface CelebrationModalProps {
  challenge: UserChallenge;
  onClaim: () => void;
}

export function CelebrationModal({ challenge, onClaim }: CelebrationModalProps) {
  const [claiming, setClaiming] = useState(false);
  const userProfile = useChallengeStore((s) => s.userProfile);
  const setUserProfile = useChallengeStore((s) => s.setUserProfile); // 🎯 NEW: Get setUserProfile action

  const handleClaim = async () => {
    try {
      setClaiming(true);
      
      console.log('🎯 [Claim] Starting claim process...');
      console.log('🎯 [Claim] Challenge ID:', challenge.id);
      
      // ✅ Use the new claimCompletedChallenge function that adds XP
      await claimCompletedChallenge(challenge.id);
      
      console.log('✅ [Claim] Challenge claimed successfully with XP reward!');
      
      // 🎯 NEW: Refresh user profile to update XP/Level in header
      console.log('🔄 [Claim] Refreshing user profile...');
      const updatedProfile = await authService.getUserProfile();
      if (updatedProfile) {
        setUserProfile(updatedProfile);
        console.log('✅ [Claim] User profile refreshed - XP:', updatedProfile.xp, 'Level:', updatedProfile.level);
      }
      
      onClaim();
    } catch (error: any) {
      console.error('❌ [Claim] Failed to claim reward:', error);
      alert(`Failed to claim reward: ${error?.message || 'Unknown error'}\n\nPlease try again or contact support.`);
      setClaiming(false);
    }
  };

  // Calculate stats
  const totalSteps = challenge.current_steps;
  const totalDistance = ((totalSteps * 0.8) / 1000).toFixed(1);
  const totalCalories = Math.round(totalSteps * 0.04);
  
  // ✅ FIX: Calculate actual time duration
  const calculateDuration = () => {
    if (!challenge.started_at) return '< 1 hour';
    
    const startDate = new Date(challenge.started_at);
    const endDate = challenge.completed_at ? new Date(challenge.completed_at) : new Date();
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationDays = Math.floor(durationHours / 24);
    
    if (durationDays > 0) {
      const remainingHours = durationHours % 24;
      return remainingHours > 0 ? `${durationDays}d ${remainingHours}h` : `${durationDays}d`;
    } else if (durationHours > 0) {
      const remainingMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      return remainingMinutes > 0 ? `${durationHours}h ${remainingMinutes}m` : `${durationHours}h`;
    } else {
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      return durationMinutes > 0 ? `${durationMinutes}m` : '< 1m';
    }
  };
  
  const duration = calculateDuration();
  
  // ✅ FIX: Show XP for PRO users (not old points system)
  const isGuest = userProfile?.is_guest || false;
  const xpReward = !isGuest && challenge.admin_challenge?.goal_steps
    ? calculateChallengePoints(challenge.admin_challenge.goal_steps, challenge.admin_challenge.is_daily || false)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-gradient-to-br from-emerald-900/95 via-teal-900/95 to-cyan-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-5 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
        className="max-w-md w-full"
      >
        {/* Animated Stars/Sparkles Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                y: [0, -150],
                x: [0, (Math.random() - 0.5) * 200]
              }}
              transition={{
                duration: 2.5,
                delay: i * 0.15,
                repeat: Infinity,
                repeatDelay: 4
              }}
              className="absolute text-3xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: '50%'
              }}
            >
              ✨
            </motion.div>
          ))}
        </div>

        {/* Main Content Card - Onboarding Style */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#151A25] rounded-3xl overflow-hidden shadow-2xl relative"
        >
          {/* Hero Image Section */}
          <div className="relative h-64 overflow-hidden">
            <img
              src={challenge.admin_challenge?.image_url}
              alt={challenge.admin_challenge?.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            
            {/* Trophy Badge */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", bounce: 0.5 }}
              className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-white/30"
            >
              <span className="text-3xl">🏆</span>
            </motion.div>

            {/* Title at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-black text-white leading-tight mb-2"
              >
                {challenge.admin_challenge?.title}
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-white/80 text-sm font-medium"
              >
                Challenge completed! 🎉
              </motion.p>
            </div>
          </div>

          {/* Stats Grid - Onboarding Style */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="p-6"
          >
            <h2 className="text-xs font-bold text-gray-500 dark:text-white/60 uppercase tracking-wider mb-4">
              Your Achievement
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Steps */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-2xl p-4 border-2 border-blue-200 dark:border-blue-500/30">
                <div className="text-3xl font-black text-blue-900 dark:text-blue-300 mb-1">
                  {totalSteps.toLocaleString()}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-400 uppercase tracking-wide font-semibold">
                  Steps Taken
                </div>
              </div>

              {/* Distance */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-2xl p-4 border-2 border-purple-200 dark:border-purple-500/30">
                <div className="text-3xl font-black text-purple-900 dark:text-purple-300 mb-1">
                  {totalDistance}km
                </div>
                <div className="text-xs text-purple-700 dark:text-purple-400 uppercase tracking-wide font-semibold">
                  Distance
                </div>
              </div>

              {/* Calories */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 rounded-2xl p-4 border-2 border-orange-200 dark:border-orange-500/30">
                <div className="text-3xl font-black text-orange-900 dark:text-orange-300 mb-1">
                  {totalCalories}
                </div>
                <div className="text-xs text-orange-700 dark:text-orange-400 uppercase tracking-wide font-semibold">
                  Calories
                </div>
              </div>

              {/* Duration */}
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/30 dark:to-teal-900/30 rounded-2xl p-4 border-2 border-teal-200 dark:border-teal-500/30">
                <div className="text-3xl font-black text-teal-900 dark:text-teal-300 mb-1">
                  {duration}
                </div>
                <div className="text-xs text-teal-700 dark:text-teal-400 uppercase tracking-wide font-semibold">
                  Duration
                </div>
              </div>
            </div>

            {/* XP Reward - Only for Pro users */}
            {xpReward && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-500/30 rounded-2xl p-4 mb-6 text-center"
              >
                <div className="text-4xl mb-2">🎁</div>
                <div className="text-2xl font-black text-amber-900 dark:text-amber-400 mb-1">
                  +{xpReward} XP
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-500 font-semibold">
                  Added to your collection
                </div>
              </motion.div>
            )}

            {/* CTA Button - Single button */}
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-4 rounded-2xl font-bold text-base transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {claiming ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="text-xl">✓</span>
                    {xpReward ? 'Claim Reward' : 'Mark as Complete'}
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
