import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { AdminChallenge } from '../../types';
import { getAdminChallenges, startChallenge, calculateChallengePoints } from '../../lib/api';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { teamService, type TeamMember } from '../../lib/auth';

type DifficultyLevel = 'easy' | 'advanced' | 'expert' | 'custom';

interface DifficultyOption {
  level: DifficultyLevel;
  title: string;
  subtitle: string;
  stepsRange: string;
  icon: string;
  color: string;
  gradient: string;
}

interface BrowseChallengesProps {
  onCustomClick: () => void;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    level: 'easy',
    title: 'EASY',
    subtitle: 'Starting Out',
    stepsRange: '3K - 7K steps',
    icon: 'easy',
    color: 'from-green-500 to-emerald-500',
    gradient: 'bg-gradient-to-br from-green-500/10 to-emerald-500/10',
  },
  {
    level: 'advanced',
    title: 'ADVANCED',
    subtitle: 'Regular Walker',
    stepsRange: '7.5K - 12.5K steps',
    icon: 'advanced',
    color: 'from-amber-500 to-orange-500',
    gradient: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10',
  },
  {
    level: 'expert',
    title: 'EXPERT',
    subtitle: 'Power Walker',
    stepsRange: '13K+ steps',
    icon: 'expert',
    color: 'from-red-500 to-rose-500',
    gradient: 'bg-gradient-to-br from-red-500/10 to-rose-500/10',
  },
];

// Removed: DifficultyIcon component (not used in current design)

export function BrowseChallenges({ onCustomClick }: BrowseChallengesProps) {
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null);
  const [randomChallenge, setRandomChallenge] = useState<AdminChallenge | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const {
    activeUserChallenge,
    setActiveChallenge,
    setCurrentScreen,
    userTier,
    assignTarget,
    setAssignTarget,
  } = useChallengeStore();
  const userProfile = useChallengeStore((s) => s.userProfile);
  const isGuest = userProfile?.is_guest ?? false;

  const isSendToFlow = !!assignTarget?.id;

  useEffect(() => {
    loadChallenges();
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      const members = await teamService.getTeamMembers();
      setTeamMembers(members);
    } catch (err) {
      console.error('Failed to load team members:', err);
    }
  };

  const loadChallenges = async () => {
    try {
      setLoading(true);
      setError(null);
      const allChallenges = await getAdminChallenges();
      setChallenges(allChallenges);
    } catch (err) {
      setError('Failed to load challenges. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getChallengesByDifficulty = (level: DifficultyLevel): AdminChallenge[] => {
    if (level === 'easy') {
      return challenges.filter(c => c.goal_steps >= 3000 && c.goal_steps <= 7000);
    } else if (level === 'advanced') {
      return challenges.filter(c => c.goal_steps >= 7500 && c.goal_steps <= 12500);
    } else if (level === 'expert') {
      return challenges.filter(c => c.goal_steps >= 13000);
    }
    return [];
  };

  const handleDifficultySelect = (level: DifficultyLevel) => {
    if (level === 'custom') {
      // ✅ If guest, redirect to profile to sign up
      if (isGuest) {
        setCurrentScreen('profile');
        return;
      }
      onCustomClick(); // ✅ Use callback instead of setCurrentScreen
      return;
    }

    const availableChallenges = getChallengesByDifficulty(level);
    if (availableChallenges.length === 0) {
      setError('No challenges available for this difficulty level.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableChallenges.length);
    setRandomChallenge(availableChallenges[randomIndex]);
    setSelectedDifficulty(level);
  };

  const handleReroll = () => {
    if (!selectedDifficulty) return;
    
    const availableChallenges = getChallengesByDifficulty(selectedDifficulty);
    if (availableChallenges.length <= 1) {
      setError('No other challenges available at this level.');
      return;
    }

    // Get different challenge
    let newChallenge: AdminChallenge;
    do {
      const randomIndex = Math.floor(Math.random() * availableChallenges.length);
      newChallenge = availableChallenges[randomIndex];
    } while (newChallenge.id === randomChallenge?.id && availableChallenges.length > 1);

    setRandomChallenge(newChallenge);
  };

  const handleStartForMyself = async () => {
    if (!randomChallenge) return;
    
    if (activeUserChallenge) {
      setError(`You already have an active challenge. Complete it first!`);
      return;
    }
    
    try {
      const userChallenge = await startChallenge(randomChallenge.id);
      setActiveChallenge(userChallenge);
      setRandomChallenge(null);
      setSelectedDifficulty(null);
      setCurrentScreen('home');
    } catch (err) {
      setError('Failed to start challenge. Please try again.');
      console.error('Error starting challenge:', err);
    }
  };

  const handleAssignToMember = async (memberId: string) => {
    if (!randomChallenge) return;

    try {
      setError(null);

      const { error: assignError } = await teamService.assignChallenge(memberId, randomChallenge.id);
      if (assignError) throw assignError;

      const member = teamMembers.find((m) => m.member_id === memberId);
      alert(`✅ Challenge "${randomChallenge.title}" assigned to ${member?.display_name || member?.email}!`);
      setRandomChallenge(null);
      setSelectedDifficulty(null);
      if (assignTarget?.id === memberId) setAssignTarget(null);
    } catch (err) {
      console.error('Failed to assign challenge:', err);
      setError('Failed to assign challenge. Please try again.');
    }
  };

  const handleClose = () => {
    setRandomChallenge(null);
    setSelectedDifficulty(null);
    if (assignTarget?.id) setAssignTarget(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Challenge Preview Modal */}
      {randomChallenge && selectedDifficulty && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-5"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#151A25] border border-white/10 rounded-2xl p-5 max-w-sm w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {assignTarget?.id ? `Send Challenge to ${assignTarget.name}` : 'Your Challenge!'}
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="relative aspect-[3/2] rounded-xl overflow-hidden mb-3">
                <img
                  src={randomChallenge.image_url}
                  alt={randomChallenge.title}
                  className="w-full h-full object-cover"
                  style={{ filter: 'blur(20px)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-3">
                  <div className="text-white flex-1">
                    <div className="text-sm font-semibold mb-0.5">{randomChallenge.title}</div>
                    <div className="text-xs text-white/70">
                      {(randomChallenge.goal_steps / 1000).toFixed(1)}k steps • ≈ {(randomChallenge.goal_steps / 1250).toFixed(1)} km
                    </div>
                  </div>
                  {!randomChallenge.is_custom && userTier === 'pro' && !isSendToFlow && (
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-lg">
                      {calculateChallengePoints(randomChallenge.goal_steps)} PTS
                    </div>
                  )}
                </div>
              </div>

              {/* Reroll Button */}
              <button
                onClick={handleReroll}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors mb-3 flex items-center justify-center gap-2"
              >
                🎲 Try Another Challenge
              </button>
            </div>

            <div className="space-y-2">
              {assignTarget?.id ? (
                <div>
                  <button
                    onClick={() => handleAssignToMember(assignTarget.id)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3 rounded-xl text-sm font-black transition-colors"
                  >
                    Send to {assignTarget.name}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleStartForMyself}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    🚶‍♂️ Start Now
                  </button>

                  {!isGuest && teamMembers.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 mb-2 text-center">or assign to</div>
                      <div className="grid grid-cols-3 gap-2">
                        {teamMembers.map((member) => {
                          const displayName = member.custom_name || member.display_name || member.email.split('@')[0];
                          const showRelationship = member.relationship && member.relationship.trim().length > 0;

                          const getInitials = (name: string) => {
                            return name
                              .split(' ')
                              .map(word => word[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2);
                          };

                          const getColorFromName = (name: string) => {
                            const colors = [
                              '#3B82F6',
                              '#F59E0B',
                              '#10B981',
                              '#EC4899',
                              '#8B5CF6',
                              '#EF4444',
                              '#06B6D4',
                              '#F97316',
                            ];
                            
                            const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                            return colors[hash % colors.length];
                          };

                          return (
                            <button
                              key={member.id}
                              onClick={() => handleAssignToMember(member.member_id)}
                              className="bg-[#0B101B] hover:bg-gray-800 border border-white/5 hover:border-blue-500/30 text-white px-2 py-2 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-1.5"
                            >
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/10"
                                style={{ backgroundColor: getColorFromName(displayName) }}
                              >
                                {getInitials(displayName)}
                              </div>
                              <div className="flex flex-col items-center gap-0.5 w-full">
                                <span className="text-[11px] font-bold truncate w-full text-center leading-tight">
                                  {displayName.split(' ')[0]}
                                </span>
                                {showRelationship && (
                                  <span className="text-[9px] text-blue-400 font-semibold truncate w-full text-center">
                                    {member.relationship}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-200 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Challenge</h2>
        <p className="text-gray-400 text-sm">
          Pick your difficulty level
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-gray-400 text-sm">Loading challenges...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-3 max-w-md mx-auto">
          {/* Difficulty Options */}
          {DIFFICULTY_OPTIONS.map((option) => {
            const availableCount = getChallengesByDifficulty(option.level).length;
            
            return (
              <motion.button
                key={option.level}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleDifficultySelect(option.level)}
                className={`relative w-full ${option.gradient} border border-white/10 rounded-2xl p-5 text-left transition-all hover:border-white/30 overflow-hidden group`}
              >
                {/* Accent line at left */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${option.color}`}></div>
                
                {/* Glow effect on hover */}
                <div className={`absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-10 rounded-full blur-3xl transition-opacity duration-500`}></div>
                
                <div className="relative flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3 mb-1">
                      <h3 className="text-xl font-black text-white tracking-tight">
                        {option.title}
                      </h3>
                      <span className="text-xs text-white/50 font-medium">{option.subtitle}</span>
                    </div>
                    <p className="text-sm text-white/60 mb-2">{option.stepsRange}</p>
                    <span className="inline-block bg-white/10 border border-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                      {availableCount} challenges
                    </span>
                  </div>
                  
                  <svg className="w-6 h-6 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </motion.button>
            );
          })}

          {/* Custom Challenge Option */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleDifficultySelect('custom')}
            className="relative w-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-5 text-left transition-all hover:border-white/30 overflow-hidden group"
          >
            {/* Accent line at left */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-blue-500"></div>
            
            {/* Glow effect on hover */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-purple-500 to-blue-500 opacity-0 group-hover:opacity-10 rounded-full blur-3xl transition-opacity duration-500"></div>
            
            <div className="relative flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-baseline gap-3 mb-1">
                  <h3 className="text-xl font-black text-white tracking-tight">
                    CUSTOM
                  </h3>
                  <span className="text-xs text-white/50 font-medium">Create Your Own</span>
                </div>
                <p className="text-sm text-white/60 mb-2">Set your own goal</p>
                <div className="flex items-center gap-2">
                  <span className="inline-block bg-white/10 border border-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                    Unlimited
                  </span>
                  {isGuest && (
                    <span className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-lg">
                      PRO
                    </span>
                  )}
                </div>
              </div>
              
              <svg className="w-6 h-6 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </motion.button>

          {challenges.length === 0 && (
            <div className="bg-[#151A25] border border-white/10 rounded-2xl p-8 text-center mt-8">
              <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🔍</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No challenges found</h3>
              <p className="text-gray-400 text-sm">
                Check back later for new challenges
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}