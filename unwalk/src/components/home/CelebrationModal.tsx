import { useState } from 'react';
import { motion } from 'framer-motion';
import type { UserChallenge } from '../../types';
import { calculateChallengePoints } from '../../lib/api';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { supabase } from '../../lib/supabase';
import { badgesService, authService } from '../../lib/auth';

interface CelebrationModalProps {
  challenge: UserChallenge;
  onClaim: () => void;
}

export function CelebrationModal({ challenge, onClaim }: CelebrationModalProps) {
  const [claiming, setClaiming] = useState(false);
  const userTier = useChallengeStore((s) => s.userTier);
  const setUserProfile = useChallengeStore((s) => s.setUserProfile);

  const handleClaim = async () => {
    try {
      setClaiming(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('🎯 [Claim] Starting claim process...');
      console.log('🎯 [Claim] User ID:', user?.id);
      console.log('🎯 [Claim] Challenge ID:', challenge.id);
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Use database function to claim challenge (bypasses RLS issues)
      const { data, error } = await supabase.rpc('claim_user_challenge', {
        p_challenge_id: challenge.id,
        p_user_id: user.id
      });
      
      if (error) {
        console.error('❌ [Claim] RPC error:', error);
        console.error('❌ [Claim] Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('✅ [Claim] Challenge claimed successfully:', data);
      
      // ✅ Refresh user profile to update points in UI
      const updatedProfile = await authService.getUserProfile();
      if (updatedProfile) {
        setUserProfile(updatedProfile);
        console.log('✅ [Claim] User profile refreshed, new points:', updatedProfile.total_points);
      }
      
      // ✅ Manually trigger achievement check (double-check)
      if (userTier === 'pro') {
        try {
          const { newBadgesCount } = await badgesService.checkAchievements();
          if (newBadgesCount > 0) {
            console.log(`🎉 [Claim] Unlocked ${newBadgesCount} new badge(s)!`);
          }
        } catch (err) {
          console.error('⚠️ [Claim] Failed to check achievements:', err);
          // Don't fail the whole claim if badge check fails
        }
      }
      
      // No more localStorage - everything is in Supabase!
      onClaim();
    } catch (error: any) {
      console.error('❌ [Claim] Failed to claim reward:', error);
      console.error('❌ [Claim] Error message:', error?.message);
      console.error('❌ [Claim] Error details:', error?.details);
      alert(`Failed to claim reward: ${error?.message || 'Unknown error'}\n\nPlease try again or contact support.`);
      setClaiming(false);
    }
  };

  // Calculate stats
  const totalSteps = challenge.current_steps;
  const totalDistance = ((totalSteps * 0.8) / 1000).toFixed(1);
  const totalCalories = Math.round(totalSteps * 0.04);
  const activeDays = Math.ceil((challenge.active_time_seconds || 0) / 86400) || 1;
  const points = !challenge.admin_challenge?.is_custom && userTier === 'pro' 
    ? calculateChallengePoints(challenge.admin_challenge?.goal_steps || 0) 
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
              <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-200 dark:border-white/10">
                <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                  {totalSteps.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 dark:text-white/60 uppercase tracking-wide font-semibold">
                  Steps Taken
                </div>
              </div>

              {/* Distance */}
              <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-200 dark:border-white/10">
                <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                  {totalDistance}km
                </div>
                <div className="text-xs text-gray-600 dark:text.white/60 uppercase tracking-wide font-semibold">
                  Distance
                </div>
              </div>

              {/* Calories */}
              <div className="bg-gray-50 dark:bg.white/5 rounded-2xl p-4 border border-gray-200 dark:border-white/10">
                <div className="text-3xl font-black text-gray-900 dark:text.white mb-1">
                  {totalCalories}
                </div>
                <div className="text-xs text-gray-600 dark:text.white/60 uppercase tracking-wide font-semibold">
                  Calories
                </div>
              </div>

              {/* Active Days */}
              <div className="bg-gray-50 dark:bg.white/5 rounded-2xl p-4 border border-gray-200 dark:border-white/10">
                <div className="text-3xl font-black text-gray-900 dark:text.white mb-1">
                  {activeDays}
                </div>
                <div className="text-xs text-gray-600 dark:text.white/60 uppercase tracking-wide font-semibold">
                  {activeDays === 1 ? 'Day' : 'Days'}
                </div>
              </div>
            </div>

            {/* Points Badge - Only for Pro users with system challenges */}
            {points && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-500/30 rounded-2xl p-4 mb-6 text-center"
              >
                <div className="text-4xl mb-2">🎁</div>
                <div className="text-2xl font-black text-amber-900 dark:text-amber-400 mb-1">
                  +{points} Points
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
                    {points ? 'Claim Reward' : 'Mark as Complete'}
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
