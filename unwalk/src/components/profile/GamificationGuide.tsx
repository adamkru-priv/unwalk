import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GamificationGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GamificationGuide({ isOpen, onClose }: GamificationGuideProps) {
  const [activeTab, setActiveTab] = useState<'xp' | 'quests' | 'streaks'>('xp');

  const tabs = [
    { id: 'xp' as const, label: 'XP & Levels', emoji: '⭐' },
    { id: 'quests' as const, label: 'Daily Quests', emoji: '🎯' },
    { id: 'streaks' as const, label: 'Streaks', emoji: '🔥' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0B101B] w-full max-w-2xl max-h-[85vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-black">How It Works</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-white/80 text-sm">
                Learn how to earn XP, level up, and stay motivated!
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#151A25]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-4 px-3 text-sm font-semibold transition-all relative ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span className="mr-2">{tab.emoji}</span>
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <AnimatePresence mode="wait">
                {activeTab === 'xp' && (
                  <motion.div
                    key="xp"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <span className="text-2xl">⭐</span>
                        What is XP?
                      </h3>
                      <p className="text-gray-600 dark:text-white/70 text-sm leading-relaxed">
                        <strong>XP (Experience Points)</strong> measures your progress and dedication. 
                        The more XP you earn, the higher your level becomes!
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-500/30">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">
                        💰 How to Earn XP:
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                            50
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">Daily Quest</div>
                            <div className="text-xs text-gray-600 dark:text-white/60">Complete your daily quest</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                            100
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">Easy Challenge</div>
                            <div className="text-xs text-gray-600 dark:text-white/60">Complete 3k-7k steps challenges</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                            250
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">Medium Challenge</div>
                            <div className="text-xs text-gray-600 dark:text-white/60">Complete 7.5k-12.5k steps challenges</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                            500
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">Hard Challenge</div>
                            <div className="text-xs text-gray-600 dark:text-white/60">Complete 13k+ steps challenges</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                            ⚡
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">Streak Bonuses</div>
                            <div className="text-xs text-gray-600 dark:text-white/60">50-1000 XP for maintaining streaks</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                        <span className="text-xl">📈</span>
                        Levels & Tiers
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-500/30">
                          <span className="text-2xl">🌱</span>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">Beginner</div>
                            <div className="text-xs text-gray-600 dark:text-white/60">Level 1-9</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-500/30">
                          <span className="text-2xl">🗺️</span>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">Explorer</div>
                            <div className="text-xs text-gray-600 dark:text-white/60">Level 10-19</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-500/30">
                          <span className="text-2xl">⚔️</span>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">Adventurer</div>
                            <div className="text-xs text-gray-600 dark:text-white/60">Level 20-29</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-500/30">
                          <span className="text-2xl">🏆</span>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">Champion</div>
                            <div className="text-xs text-gray-600 dark:text-white/60">Level 30-39</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-500/30">
                          <span className="text-2xl">👑</span>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">Legend</div>
                            <div className="text-xs text-gray-600 dark:text-white/60">Level 40-50</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'quests' && (
                  <motion.div
                    key="quests"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <span className="text-2xl">🎯</span>
                        What are Daily Quests?
                      </h3>
                      <p className="text-gray-600 dark:text-white/70 text-sm leading-relaxed">
                        Every day you get a <strong>new quest</strong> to complete. 
                        Quests are quick challenges that help you stay active and earn XP!
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-500/30">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">
                        📋 Quest Types:
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0 text-xl">
                            👟
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">Steps Quest</div>
                            <div className="text-xs text-gray-600 dark:text-white/60 mb-1">Walk a certain number of steps today</div>
                            <div className="text-xs font-bold text-green-600 dark:text-green-400">+50 XP</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0 text-xl">
                            🎯
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">Progress Quest</div>
                            <div className="text-xs text-gray-600 dark:text-white/60 mb-1">Make progress on your active challenge</div>
                            <div className="text-xs font-bold text-blue-600 dark:text-blue-400">+100 XP</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0 text-xl">
                            👥
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm">Social Quest</div>
                            <div className="text-xs text-gray-600 dark:text-white/60 mb-1">Send a challenge to a team member</div>
                            <div className="text-xs font-bold text-purple-600 dark:text-purple-400">+75 XP</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-500/30">
                      <div className="flex gap-3">
                        <span className="text-2xl">💡</span>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Pro Tip</h4>
                          <p className="text-xs text-gray-600 dark:text-white/60 leading-relaxed">
                            Complete your daily quest every day to build a streak and earn bonus XP! 
                            The longer your streak, the bigger the rewards.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'streaks' && (
                  <motion.div
                    key="streaks"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <span className="text-2xl">🔥</span>
                        What are Streaks?
                      </h3>
                      <p className="text-gray-600 dark:text-white/70 text-sm leading-relaxed">
                        A <strong>streak</strong> is the number of consecutive days you've completed 
                        your daily quest. The longer your streak, the bigger the rewards!
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-4 border border-orange-200 dark:border-orange-500/30">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">
                        🎁 Streak Milestones:
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🔥</span>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white text-sm">3 Days</div>
                              <div className="text-xs text-gray-600 dark:text-white/60">Keep it up!</div>
                            </div>
                          </div>
                          <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                            +50 XP
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🔥🔥</span>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white text-sm">7 Days</div>
                              <div className="text-xs text-gray-600 dark:text-white/60">Week Warrior!</div>
                            </div>
                          </div>
                          <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                            +150 XP + Badge
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🔥🔥🔥</span>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white text-sm">14 Days</div>
                              <div className="text-xs text-gray-600 dark:text-white/60">Two weeks strong!</div>
                            </div>
                          </div>
                          <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                            +300 XP
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">👑</span>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white text-sm">30 Days</div>
                              <div className="text-xs text-gray-600 dark:text-white/60">Monthly Master!</div>
                            </div>
                          </div>
                          <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                            +1000 XP + Badge
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-500/30">
                      <div className="flex gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Don't Break It!</h4>
                          <p className="text-xs text-gray-600 dark:text-white/60 leading-relaxed">
                            If you miss a day, your streak resets to 0. 
                            Complete your daily quest every day to maintain your streak and keep earning bonus XP!
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#151A25]">
              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl font-bold text-sm transition-all"
              >
                Got it! Let's Go 🚀
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
