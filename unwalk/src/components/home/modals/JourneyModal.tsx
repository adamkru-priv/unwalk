import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import type { DailyQuest } from '../../../types';
import { 
  getTodayQuest,
  generateDailyQuest, // ✅ NEW: Import function to generate quest
  checkTodayChallengesSent,
  updateQuestProgress,
  claimQuestReward,
  getQuestIcon
} from '../../../lib/gamification';
import { useHealthKit } from '../../../hooks/useHealthKit';

interface JourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  longestStreak: number;
  nextMilestone?: { steps: number; title: string; icon: string }; // 🎯 FIX: Changed from {milestone, reward}
  onQuestClaimed?: (xpEarned: number) => void;
}

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'quest' | 'streak-milestone' | 'level-up' | 'challenge-completed';
  title: string;
  subtitle?: string;
  icon: string;
  xp?: number;
  completed: boolean;
  claimed?: boolean;
  progress?: number;
  maxProgress?: number;
}

export function JourneyModal({ 
  isOpen,
  onClose,
  currentStreak, 
  longestStreak, 
  nextMilestone,
  onQuestClaimed 
}: JourneyModalProps) {
  const [quest, setQuest] = useState<DailyQuest | null>(null);
  const [claiming, setClaiming] = useState(false);
  const { todaySteps } = useHealthKit();

  useEffect(() => {
    if (isOpen) {
      loadQuest();
    }
  }, [isOpen]);

  // Update quest progress
  useEffect(() => {
    const updateProgress = async () => {
      if (!quest || !isOpen) return;
      
      if (quest.quest_type === 'steps' && !quest.completed) {
        const progress = Math.min(todaySteps, quest.target_value);
        if (progress !== quest.current_progress) {
          await updateQuestProgress(quest.id, progress);
          // 🎯 FIX: Reload quest from backend to get accurate completed status
          const updatedQuest = await getTodayQuest();
          if (updatedQuest) {
            setQuest(updatedQuest);
          }
        }
      } else if (quest.quest_type === 'social' && !quest.completed) {
        const challengesSent = await checkTodayChallengesSent();
        if (challengesSent !== quest.current_progress) {
          await updateQuestProgress(quest.id, challengesSent);
          // 🎯 FIX: Reload quest from backend to get accurate completed status
          const updatedQuest = await getTodayQuest();
          if (updatedQuest) {
            setQuest(updatedQuest);
          }
        }
      }
    };

    if (isOpen) {
      updateProgress();
      const interval = setInterval(updateProgress, 10 * 1000);
      return () => clearInterval(interval);
    }
  }, [quest, todaySteps, isOpen]);

  const loadQuest = async () => {
    try {
      // ✅ FIX: Try to get today's quest, if it doesn't exist, generate it
      let todayQuest = await getTodayQuest();
      
      if (!todayQuest) {
        console.log('🎲 [Quest] No quest for today, generating...');
        todayQuest = await generateDailyQuest();
        
        if (todayQuest) {
          console.log('✅ [Quest] Generated new quest:', todayQuest.quest_type, todayQuest.target_value);
        } else {
          console.warn('⚠️ [Quest] Failed to generate quest');
        }
      }
      
      setQuest(todayQuest);
    } catch (error) {
      console.error('Failed to load quest:', error);
    }
  };

  const handleClaimQuest = async () => {
    if (!quest || !quest.completed || quest.claimed || claiming) return;
    
    try {
      setClaiming(true);
      await updateQuestProgress(quest.id, quest.current_progress);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await claimQuestReward(quest.id);
      if (result) {
        setQuest({ ...quest, claimed: true, claimed_at: new Date().toISOString() });
        onQuestClaimed?.(result.xp_earned);
      }
    } catch (error) {
      console.error('Failed to claim quest:', error);
    } finally {
      setClaiming(false);
    }
  };

  const getQuestDescription = () => {
    if (!quest) return '';
    
    switch (quest.quest_type) {
      case 'steps':
        return `Walk ${quest.target_value.toLocaleString()} steps`;
      case 'social':
        return `Send ${quest.target_value} challenge${quest.target_value > 1 ? 's' : ''} to team`;
      default:
        return 'Complete daily task';
    }
  };

  const timelineEvents: TimelineEvent[] = [];

  // Add today's quest
  if (quest) {
    timelineEvents.push({
      id: `quest-${quest.id}`,
      date: new Date(),
      type: 'quest',
      title: "Daily Quest",
      subtitle: getQuestDescription(),
      icon: getQuestIcon(quest.quest_type),
      xp: quest.xp_reward,
      completed: quest.completed,
      claimed: quest.claimed,
      progress: quest.current_progress,
      maxProgress: quest.target_value
    });
  }

  // Add streak info
  if (currentStreak > 0) {
    timelineEvents.push({
      id: 'streak-current',
      date: new Date(),
      type: 'streak-milestone',
      title: `${currentStreak}-Day Streak`,
      subtitle: nextMilestone 
        ? `${nextMilestone.steps - currentStreak} days until ${nextMilestone.title}` // 🎯 FIX: Use .steps instead of .milestone
        : longestStreak === currentStreak 
          ? "🎉 Personal best!" 
          : `Best: ${longestStreak} days`,
      icon: '🔥',
      completed: true,
      progress: nextMilestone ? currentStreak : undefined,
      maxProgress: nextMilestone?.steps // 🎯 FIX: Use .steps instead of .milestone
    });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-gray-200 dark:border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <h2 className="text-xs font-black uppercase tracking-wide text-gray-900 dark:text-white">
                  📍 Today's Journey
                </h2>
                <button
                  onClick={onClose}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <span className="text-gray-600 dark:text-white/60 text-sm">✕</span>
                </button>
              </div>

              {/* Timeline */}
              <div className="p-4">
                {timelineEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-white/50 text-sm">
                    Complete your first quest to start your journey!
                  </div>
                ) : (
                  <div className="space-y-0">
                    {timelineEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative"
                      >
                        {/* Timeline line */}
                        {index < timelineEvents.length - 1 && (
                          <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/30 to-purple-500/30" />
                        )}

                        {/* Event card */}
                        <div className="flex gap-3 pb-4">
                          {/* Icon */}
                          <div className={`
                            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl
                            ${event.completed 
                              ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30' 
                              : 'bg-gradient-to-br from-gray-500/20 to-gray-600/20 border border-gray-500/30'
                            }
                          `}>
                            {event.completed ? '✓' : event.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                  {event.title}
                                </h3>
                                {event.subtitle && (
                                  <p className="text-xs text-gray-600 dark:text-white/60">
                                    {event.subtitle}
                                  </p>
                                )}
                              </div>
                              
                              {event.xp && event.completed && !event.claimed && (
                                <div className="flex-shrink-0 bg-yellow-500/20 border border-yellow-500/30 px-2 py-0.5 rounded-md">
                                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                                    +{event.xp} XP
                                  </span>
                                </div>
                              )}
                              
                              {event.claimed && (
                                <div className="flex-shrink-0 text-green-600 dark:text-green-400 text-xs font-semibold">
                                  ✓ Claimed
                                </div>
                              )}
                            </div>

                            {/* Progress bar (if applicable) */}
                            {event.progress !== undefined && event.maxProgress && !event.claimed && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-gray-600 dark:text-white/60">
                                    {event.progress.toLocaleString()} / {event.maxProgress.toLocaleString()}
                                  </span>
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {Math.round((event.progress / event.maxProgress) * 100)}%
                                  </span>
                                </div>
                                <div className="bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                                  <motion.div 
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (event.progress / event.maxProgress) * 100)}%` }}
                                    transition={{ duration: 0.5 }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Claim button */}
                            {event.type === 'quest' && event.completed && !event.claimed && (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleClaimQuest}
                                disabled={claiming}
                                className="mt-2 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 rounded-lg font-semibold text-xs transition-all disabled:opacity-50"
                              >
                                {claiming ? 'Claiming...' : `🎁 Claim ${event.xp} XP`}
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className="bg-gray-50 dark:bg-[#0B101B] border-t border-gray-200 dark:border-white/10 px-4 py-2">
                <p className="text-xs text-center text-gray-500 dark:text-white/40">
                  Complete quests daily to earn XP and maintain your streak
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}