import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { AdminChallenge } from '../../types';
import { getAdminChallenges, startChallenge, getCompletedChallenges, calculateChallengePoints } from '../../lib/api';
import { useChallengeStore } from '../../stores/useChallengeStore';

type Category = 'animals' | 'sport' | 'nature' | 'surprise';

export function BrowseChallenges() {
  const [selectedCategory] = useState<Category | null>(null);
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [completedChallengeIds, setCompletedChallengeIds] = useState<Set<string>>(new Set());
  const [dailyChallenge, setDailyChallenge] = useState<AdminChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<AdminChallenge | null>(null);
  const { activeUserChallenge, setActiveChallenge, setCurrentScreen, getDailyChallenge, setDailyChallenge: saveDailyChallenge, userTier } = useChallengeStore();

  const familyMembers = [
    { id: '1', name: 'Mama', avatar: '👩' },
    { id: '2', name: 'Tata', avatar: '👨' },
    { id: '3', name: 'Kasia', avatar: '👧' },
  ];

  useEffect(() => {
    loadChallenges();
    loadCompletedChallenges();
    loadDailyChallenge();
  }, [selectedCategory]);

  const loadDailyChallenge = async () => {
    try {
      // Check if we already have today's daily challenge
      const todaysChallenge = getDailyChallenge();
      if (todaysChallenge) {
        setDailyChallenge(todaysChallenge);
        return;
      }

      // If not, fetch and set a new one
      const allChallenges = await getAdminChallenges();
      const dailyChallenges = allChallenges.filter(c => c.goal_steps === 10000);
      const randomChallenge = dailyChallenges.length > 0 
        ? dailyChallenges[Math.floor(Math.random() * dailyChallenges.length)]
        : allChallenges[Math.floor(Math.random() * allChallenges.length)];

      if (randomChallenge) {
        saveDailyChallenge(randomChallenge);
        setDailyChallenge(randomChallenge);
      }
    } catch (err) {
      console.error('Failed to load daily challenge:', err);
    }
  };

  const loadChallenges = async () => {
    try {
      setLoading(true);
      setError(null);
      const allChallenges = await getAdminChallenges();
      
      // Filter by category if selected
      let filtered = allChallenges;
      if (selectedCategory && selectedCategory !== 'surprise') {
        filtered = allChallenges.filter(c => 
          c.category?.toLowerCase() === selectedCategory
        );
      }
      
      setChallenges(filtered);
    } catch (err) {
      setError('Failed to load challenges. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedChallenges = async () => {
    try {
      const completed = await getCompletedChallenges();
      const completedIds = new Set(
        completed
          .map(uc => uc.admin_challenge_id)
          .filter((id): id is string => id !== null && id !== undefined)
      );
      setCompletedChallengeIds(completedIds);
    } catch (err) {
      console.error('Failed to load completed challenges:', err);
    }
  };

  const isChallengeCompleted = (challengeId: string) => {
    return completedChallengeIds.has(challengeId);
  };

  // Group challenges by goal_steps
  const groupedChallenges = {
    5000: challenges.filter(c => c.goal_steps >= 3000 && c.goal_steps < 7500),
    10000: challenges.filter(c => c.goal_steps >= 7500 && c.goal_steps < 12500),
    15000: challenges.filter(c => c.goal_steps >= 12500 && c.goal_steps < 20000),
    25000: challenges.filter(c => c.goal_steps >= 20000 && c.goal_steps < 35000),
    50000: challenges.filter(c => c.goal_steps >= 35000),
  };

  // Sort each group so daily challenge is first
  const sortWithDailyFirst = (challengeList: AdminChallenge[]) => {
    return [...challengeList].sort((a, b) => {
      const aIsDaily = dailyChallenge?.id === a.id;
      const bIsDaily = dailyChallenge?.id === b.id;
      if (aIsDaily) return -1;
      if (bIsDaily) return 1;
      return 0;
    });
  };

  const sortedGroupedChallenges = {
    5000: sortWithDailyFirst(groupedChallenges[5000]),
    10000: sortWithDailyFirst(groupedChallenges[10000]),
    15000: sortWithDailyFirst(groupedChallenges[15000]),
    25000: sortWithDailyFirst(groupedChallenges[25000]),
    50000: sortWithDailyFirst(groupedChallenges[50000]),
  };

  const handleStartForMyself = async () => {
    if (!selectedChallenge) return;
    
    if (activeUserChallenge) {
      setError(`You already have an active challenge. Complete it first!`);
      return;
    }
    
    try {
      const userChallenge = await startChallenge(selectedChallenge.id);
      setActiveChallenge(userChallenge);
      setSelectedChallenge(null);
      setCurrentScreen('home');
    } catch (err) {
      setError('Failed to start challenge. Please try again.');
      console.error('Error starting challenge:', err);
    }
  };

  const handleAssignToMember = (memberId: string) => {
    if (!selectedChallenge) return;
    
    const member = familyMembers.find(m => m.id === memberId);
    alert(`✅ Challenge "${selectedChallenge.title}" assigned to ${member?.name}!`);
    setSelectedChallenge(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Challenge Preview Modal */}
      {selectedChallenge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-5"
          onClick={() => setSelectedChallenge(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#151A25] border border-white/10 rounded-2xl p-5 max-w-sm w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Your Challenge!</h2>
              <button onClick={() => setSelectedChallenge(null)} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="relative aspect-[3/2] rounded-xl overflow-hidden mb-3">
                <img
                  src={selectedChallenge.image_url}
                  alt={selectedChallenge.title}
                  className="w-full h-full object-cover"
                  style={{ filter: 'blur(20px)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-3">
                  <div className="text-white flex-1">
                    <div className="text-sm font-semibold mb-0.5">{selectedChallenge.title}</div>
                    <div className="text-xs text-white/70">{(selectedChallenge.goal_steps / 1000).toFixed(0)}k steps • ≈ {(selectedChallenge.goal_steps / 1250).toFixed(1)} km</div>
                  </div>
                  {/* Points badge in preview - only for Pro users */}
                  {!selectedChallenge.is_custom && userTier === 'pro' && (
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-lg">
                      {calculateChallengePoints(selectedChallenge.goal_steps)} PTS
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleStartForMyself}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                🚶‍♂️ Start Now
              </button>

              <div>
                <div className="text-xs text-gray-400 mb-2 text-center">or assign to</div>
                <div className="grid grid-cols-3 gap-2">
                  {familyMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleAssignToMember(member.id)}
                      className="bg-[#0B101B] hover:bg-gray-800 border border-white/5 text-white px-2 py-2 rounded-lg text-xs font-medium transition-colors flex flex-col items-center gap-1"
                    >
                      <span className="text-xl">{member.avatar}</span>
                      <span className="text-[10px]">{member.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-200 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Browse Challenges</h2>
        <p className="text-gray-400 text-sm">
          Discover curated walking adventures
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-gray-400 text-sm">Loading challenges...</p>
        </div>
      )}

      {/* Challenge Carousels */}
      {!loading && (
        <div className="space-y-8">
          
          {/* 5k Challenges */}
          {sortedGroupedChallenges[5000].length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-white mb-3 px-1">5k Steps • Quick Walks</h3>
              <div className="overflow-x-auto pb-4 pt-2 -mx-5 px-5 scrollbar-hide">
                <div className="flex gap-3" style={{ width: 'max-content' }}>
                  {sortedGroupedChallenges[5000].map((challenge) => {
                    const isDaily = dailyChallenge?.id === challenge.id;
                    return (
                      <button
                        key={challenge.id}
                        onClick={() => setSelectedChallenge(challenge)}
                        className="group relative w-40 flex-shrink-0"
                      >
                        <div className={`relative aspect-[3/4] rounded-xl overflow-hidden ring-1 ${isDaily ? 'ring-2 ring-blue-500' : 'ring-white/10'} group-hover:ring-purple-500/50 transition-all ${isChallengeCompleted(challenge.id) ? 'opacity-75' : ''}`}>
                          <img
                            src={challenge.image_url}
                            alt={challenge.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            style={{ filter: isChallengeCompleted(challenge.id) ? 'none' : 'blur(10px)' }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          
                          {/* Daily Pick Badge */}
                          {isDaily && !isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg animate-pulse">
                              DAILY
                            </div>
                          )}
                          
                          {/* Completed Badge */}
                          {isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}

                          {/* Points Badge - only for system challenges (not custom/family) and Pro users */}
                          {!challenge.is_custom && !isChallengeCompleted(challenge.id) && !isDaily && userTier === 'pro' && (
                            <div className="absolute top-2 left-2 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg">
                              {calculateChallengePoints(challenge.goal_steps)} PT
                            </div>
                          )}

                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h4 className="text-white text-sm font-semibold line-clamp-2 mb-1">
                              {challenge.title}
                            </h4>
                            <div className="text-xs text-white/70">
                              {(challenge.goal_steps / 1000).toFixed(0)}k steps
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* 10k Challenges */}
          {sortedGroupedChallenges[10000].length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-white mb-3 px-1">10k Steps • Daily Goals</h3>
              <div className="overflow-x-auto pb-4 pt-2 -mx-5 px-5 scrollbar-hide">
                <div className="flex gap-3" style={{ width: 'max-content' }}>
                  {sortedGroupedChallenges[10000].map((challenge) => {
                    const isDaily = dailyChallenge?.id === challenge.id;
                    return (
                      <button
                        key={challenge.id}
                        onClick={() => setSelectedChallenge(challenge)}
                        className="group relative w-40 flex-shrink-0"
                      >
                        <div className={`relative aspect-[3/4] rounded-xl overflow-hidden ring-1 ${isDaily ? 'ring-2 ring-blue-500' : 'ring-white/10'} group-hover:ring-purple-500/50 transition-all ${isChallengeCompleted(challenge.id) ? 'opacity-75' : ''}`}>
                          <img
                            src={challenge.image_url}
                            alt={challenge.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            style={{ filter: isChallengeCompleted(challenge.id) ? 'none' : 'blur(10px)' }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          
                          {/* Daily Pick Badge */}
                          {isDaily && !isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg animate-pulse">
                              DAILY
                            </div>
                          )}
                          
                          {/* Completed Badge */}
                          {isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}

                          {/* Points Badge - only for system challenges (not custom/family) and Pro users */}
                          {!challenge.is_custom && !isChallengeCompleted(challenge.id) && !isDaily && userTier === 'pro' && (
                            <div className="absolute top-2 left-2 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg">
                              {calculateChallengePoints(challenge.goal_steps)} PT
                            </div>
                          )}

                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h4 className="text-white text-sm font-semibold line-clamp-2 mb-1">
                              {challenge.title}
                            </h4>
                            <div className="text-xs text-white/70">
                              {(challenge.goal_steps / 1000).toFixed(0)}k steps
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* 15k Challenges */}
          {sortedGroupedChallenges[15000].length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-white mb-3 px-1">15k Steps • Active Days</h3>
              <div className="overflow-x-auto pb-4 pt-2 -mx-5 px-5 scrollbar-hide">
                <div className="flex gap-3" style={{ width: 'max-content' }}>
                  {sortedGroupedChallenges[15000].map((challenge) => {
                    const isDaily = dailyChallenge?.id === challenge.id;
                    return (
                      <button
                        key={challenge.id}
                        onClick={() => setSelectedChallenge(challenge)}
                        className="group relative w-40 flex-shrink-0"
                      >
                        <div className={`relative aspect-[3/4] rounded-xl overflow-hidden ring-1 ${isDaily ? 'ring-2 ring-blue-500' : 'ring-white/10'} group-hover:ring-purple-500/50 transition-all ${isChallengeCompleted(challenge.id) ? 'opacity-75' : ''}`}>
                          <img
                            src={challenge.image_url}
                            alt={challenge.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            style={{ filter: isChallengeCompleted(challenge.id) ? 'none' : 'blur(10px)' }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          
                          {/* Daily Pick Badge */}
                          {isDaily && !isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg animate-pulse">
                              DAILY
                            </div>
                          )}
                          
                          {/* Completed Badge */}
                          {isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}

                          {/* Points Badge */}
                          {!challenge.is_custom && !isChallengeCompleted(challenge.id) && !isDaily && userTier === 'pro' && (
                            <div className="absolute top-2 left-2 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg">
                              {calculateChallengePoints(challenge.goal_steps)} PT
                            </div>
                          )}

                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h4 className="text-white text-sm font-semibold line-clamp-2 mb-1">
                              {challenge.title}
                            </h4>
                            <div className="text-xs text-white/70">
                              {(challenge.goal_steps / 1000).toFixed(0)}k steps
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* 25k Challenges */}
          {sortedGroupedChallenges[25000].length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-white mb-3 px-1">25k Steps • Intense</h3>
              <div className="overflow-x-auto pb-4 pt-2 -mx-5 px-5 scrollbar-hide">
                <div className="flex gap-3" style={{ width: 'max-content' }}>
                  {sortedGroupedChallenges[25000].map((challenge) => {
                    const isDaily = dailyChallenge?.id === challenge.id;
                    return (
                      <button
                        key={challenge.id}
                        onClick={() => setSelectedChallenge(challenge)}
                        className="group relative w-40 flex-shrink-0"
                      >
                        <div className={`relative aspect-[3/4] rounded-xl overflow-hidden ring-1 ${isDaily ? 'ring-2 ring-blue-500' : 'ring-white/10'} group-hover:ring-purple-500/50 transition-all ${isChallengeCompleted(challenge.id) ? 'opacity-75' : ''}`}>
                          <img
                            src={challenge.image_url}
                            alt={challenge.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            style={{ filter: isChallengeCompleted(challenge.id) ? 'none' : 'blur(10px)' }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          
                          {/* Daily Pick Badge */}
                          {isDaily && !isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg animate-pulse">
                              DAILY
                            </div>
                          )}
                          
                          {/* Completed Badge */}
                          {isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}

                          {/* Points Badge */}
                          {!challenge.is_custom && !isChallengeCompleted(challenge.id) && !isDaily && userTier === 'pro' && (
                            <div className="absolute top-2 left-2 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg">
                              {calculateChallengePoints(challenge.goal_steps)} PT
                            </div>
                          )}

                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h4 className="text-white text-sm font-semibold line-clamp-2 mb-1">
                              {challenge.title}
                            </h4>
                            <div className="text-xs text-white/70">
                              {(challenge.goal_steps / 1000).toFixed(0)}k steps
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* 50k+ Challenges */}
          {sortedGroupedChallenges[50000].length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-white mb-3 px-1">50k+ Steps • Epic Adventures</h3>
              <div className="overflow-x-auto pb-4 pt-2 -mx-5 px-5 scrollbar-hide">
                <div className="flex gap-3" style={{ width: 'max-content' }}>
                  {sortedGroupedChallenges[50000].map((challenge) => {
                    const isDaily = dailyChallenge?.id === challenge.id;
                    return (
                      <button
                        key={challenge.id}
                        onClick={() => setSelectedChallenge(challenge)}
                        className="group relative w-40 flex-shrink-0"
                      >
                        <div className={`relative aspect-[3/4] rounded-xl overflow-hidden ring-1 ${isDaily ? 'ring-2 ring-blue-500' : 'ring-white/10'} group-hover:ring-purple-500/50 transition-all ${isChallengeCompleted(challenge.id) ? 'opacity-75' : ''}`}>
                          <img
                            src={challenge.image_url}
                            alt={challenge.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            style={{ filter: isChallengeCompleted(challenge.id) ? 'none' : 'blur(10px)' }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          
                          {/* Daily Pick Badge */}
                          {isDaily && !isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg animate-pulse">
                              DAILY
                            </div>
                          )}
                          
                          {/* Completed Badge */}
                          {isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}

                          {/* Points Badge */}
                          {!challenge.is_custom && !isChallengeCompleted(challenge.id) && !isDaily && userTier === 'pro' && (
                            <div className="absolute top-2 left-2 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg">
                              {calculateChallengePoints(challenge.goal_steps)} PT
                            </div>
                          )}

                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h4 className="text-white text-sm font-semibold line-clamp-2 mb-1">
                              {challenge.title}
                            </h4>
                            <div className="text-xs text-white/70">
                              {(challenge.goal_steps / 1000).toFixed(0)}k steps
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Empty State */}
          {challenges.length === 0 && (
            <div className="bg-[#151A25] border border-white/10 rounded-2xl p-8 text-center">
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