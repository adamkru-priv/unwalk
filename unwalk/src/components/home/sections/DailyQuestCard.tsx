import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { DailyQuest } from '../../../types';
import { 
  getTodayQuest, 
  generateDailyQuest, 
  claimQuestReward,
  getQuestDescription,
  getQuestIcon,
  checkTodayChallengesSent,
  updateQuestProgress
} from '../../../lib/gamification';
import { useHealthKit } from '../../../hooks/useHealthKit';

interface DailyQuestCardProps {
  onQuestClaimed?: (xpEarned: number) => void;
}

export function DailyQuestCard({ onQuestClaimed }: DailyQuestCardProps) {
  const [quest, setQuest] = useState<DailyQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const { todaySteps } = useHealthKit();

  useEffect(() => {
    loadQuest();
  }, []);

  // Update quest progress based on steps (for steps quests)
  useEffect(() => {
    const updateStepsQuest = async () => {
      if (quest && quest.quest_type === 'steps' && !quest.completed) {
        const progress = Math.min(todaySteps, quest.target_value);
        if (progress !== quest.current_progress) {
          // ✅ UPDATE: Save to database
          await updateQuestProgress(quest.id, progress);
          
          // Update local state
          setQuest({ 
            ...quest, 
            current_progress: progress,
            completed: progress >= quest.target_value
          });
        }
      }
    };

    updateStepsQuest();
  }, [todaySteps, quest?.id, quest?.quest_type, quest?.completed, quest?.current_progress]);

  // ✨ NEW: Check social quest progress (challenge sent to team)
  useEffect(() => {
    const checkSocialQuest = async () => {
      if (!quest || quest.quest_type !== 'social' || quest.completed) return;
      
      const challengesSent = await checkTodayChallengesSent();
      
      if (challengesSent !== quest.current_progress) {
        // Update progress in DB
        await updateQuestProgress(quest.id, challengesSent);
        
        // Update local state
        setQuest({ 
          ...quest, 
          current_progress: challengesSent,
          completed: challengesSent >= quest.target_value
        });
      }
    };

    // Check immediately
    checkSocialQuest();
    
    // Check every 10 seconds (in case user sent challenge in another tab/window)
    const interval = setInterval(checkSocialQuest, 10 * 1000);
    return () => clearInterval(interval);
  }, [quest]);

  const loadQuest = async () => {
    try {
      setLoading(true);
      let todayQuest = await getTodayQuest();
      
      if (!todayQuest) {
        // Generate new quest
        await generateDailyQuest();
        todayQuest = await getTodayQuest();
      }
      
      setQuest(todayQuest);
    } catch (error) {
      console.error('Failed to load quest:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!quest || !quest.completed || quest.claimed || claiming) return;
    
    try {
      setClaiming(true);
      
      // ✅ FIX: Ensure quest is marked as completed in DB before claiming
      console.log('🎯 [DailyQuestCard] Updating quest progress before claim:', quest.id, quest.current_progress);
      await updateQuestProgress(quest.id, quest.current_progress);
      
      // Wait a bit for DB to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🎁 [DailyQuestCard] Attempting to claim quest reward...');
      const result = await claimQuestReward(quest.id);
      
      if (result) {
        console.log('✅ [DailyQuestCard] Quest claimed successfully! XP earned:', result.xp_earned);
        setQuest({ ...quest, claimed: true, claimed_at: new Date().toISOString() });
        onQuestClaimed?.(result.xp_earned);
      }
    } catch (error) {
      console.error('❌ [DailyQuestCard] Failed to claim reward:', error);
      alert('Failed to claim reward. Please try refreshing the page.');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/10 rounded-2xl p-5 animate-pulse">
        <div className="h-20 bg-gray-200 dark:bg-white/5 rounded"></div>
      </div>
    );
  }

  if (!quest) return null;

  const progress = Math.min(100, (quest.current_progress / quest.target_value) * 100);
  const icon = getQuestIcon(quest.quest_type);
  const description = getQuestDescription(quest);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 dark:border-blue-500/30 rounded-2xl p-5 relative overflow-hidden"
    >
      {/* Accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
      
      {/* Glow effect */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide">
                Today's Quest
              </h3>
              <p className="text-xs text-gray-600 dark:text-white/60 mt-0.5">
                {description}
              </p>
            </div>
          </div>
          
          {!quest.claimed && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 px-2 py-1 rounded-lg">
              <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                +{quest.xp_reward} XP
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-600 dark:text-white/60">
              Progress: {quest.current_progress.toLocaleString()} / {quest.target_value.toLocaleString()}
            </span>
            <span className="font-bold text-gray-900 dark:text-white">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="bg-gray-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
            <motion.div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Action button */}
        {quest.completed && !quest.claimed && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClaim}
            disabled={claiming}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {claiming ? 'Claiming...' : `🎁 Claim Reward (+${quest.xp_reward} XP)`}
          </motion.button>
        )}

        {quest.claimed && (
          <div className="text-center py-2 text-green-600 dark:text-green-400 font-semibold text-sm">
            ✅ Quest Completed! Come back tomorrow
          </div>
        )}

        {!quest.completed && (
          <div className="text-center py-2 text-gray-600 dark:text-white/50 text-xs">
            Complete this quest to earn XP and maintain your streak
          </div>
        )}
      </div>
    </motion.div>
  );
}
