import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { AdminChallenge } from '../../types';
import { getAdminChallenges, startChallenge, getCompletedChallenges, calculateChallengePoints } from '../../lib/api';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { teamService, type TeamMember } from '../../lib/auth';

export function BrowseChallenges() {
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [completedChallengeIds, setCompletedChallengeIds] = useState<Set<string>>(new Set());
  const [dailyChallenge, setDailyChallenge] = useState<AdminChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<AdminChallenge | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const {
    activeUserChallenge,
    setActiveChallenge,
    setCurrentScreen,
    getDailyChallenge,
    setDailyChallenge: saveDailyChallenge,
    userTier,
    assignTarget,
    setAssignTarget,
  } = useChallengeStore();
  const userProfile = useChallengeStore((s) => s.userProfile);
  const isGuest = userProfile?.is_guest ?? false;
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Helper flag near other derived values
  const isSendToFlow = !!assignTarget?.id;

  const loadTeamMembers = useCallback(async () => {
    try {
      const members = await teamService.getTeamMembers();
      if (isMounted.current) {
        setTeamMembers(members);
      }
    } catch (err) {
      console.error('Failed to load team members:', err);
    }
  }, []);

  const loadDailyChallenge = useCallback(async () => {
    try {
      const todaysChallenge = getDailyChallenge();
      if (todaysChallenge) {
        if (isMounted.current) setDailyChallenge(todaysChallenge);
        return;
      }

      const allChallenges = await getAdminChallenges();
      if (!isMounted.current) return;

      const dailyChallenges = allChallenges.filter(c => c.goal_steps === 10000);
      const randomChallenge = dailyChallenges.length > 0 
        ? dailyChallenges[Math.floor(Math.random() * dailyChallenges.length)]
        : allChallenges[Math.floor(Math.random() * allChallenges.length)];

      if (randomChallenge) {
        saveDailyChallenge(randomChallenge);
        if (isMounted.current) setDailyChallenge(randomChallenge);
      }
    } catch (err) {
      console.error('Failed to load daily challenge:', err);
    }
  }, [getDailyChallenge, saveDailyChallenge]);

  const loadChallenges = useCallback(async () => {
    try {
      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }
      const allChallenges = await getAdminChallenges();
      if (isMounted.current) {
        setChallenges(allChallenges);
      }
    } catch (err) {
      if (isMounted.current) {
        setError('Failed to load challenges. Please try again.');
      }
      console.error('Error:', err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  const loadCompletedChallenges = useCallback(async () => {
    try {
      console.log('🔍 [BrowseChallenges] Loading completed challenges...');
      const completed = await getCompletedChallenges();
      if (!isMounted.current) return;

      console.log('✅ [BrowseChallenges] Completed challenges:', completed.length, completed);
      const completedIds = new Set(
        completed
          .map(uc => uc.admin_challenge_id)
          .filter((id): id is string => id !== null && id !== undefined)
      );
      if (isMounted.current) {
        setCompletedChallengeIds(completedIds);
        console.log('📊 [BrowseChallenges] State updated - completedChallenges.length:', completed.length);
      }
    } catch (err) {
      console.error('Failed to load completed challenges:', err);
    }
  }, []);

  useEffect(() => {
    loadChallenges();
    loadCompletedChallenges();
    loadDailyChallenge();
    loadTeamMembers();
  }, [loadChallenges, loadCompletedChallenges, loadDailyChallenge, loadTeamMembers]);

  const isChallengeCompleted = (challengeId: string) => {
    return completedChallengeIds.has(challengeId);
  };

  const groupedChallenges = {
    beginner: challenges.filter(c => c.goal_steps <= 5000),
    advanced: challenges.filter(c => c.goal_steps > 5000 && c.goal_steps <= 15000),
    expert: challenges.filter(c => c.goal_steps > 15000),
  };

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
    beginner: sortWithDailyFirst(groupedChallenges.beginner),
    advanced: sortWithDailyFirst(groupedChallenges.advanced),
    expert: sortWithDailyFirst(groupedChallenges.expert),
  };

  const handleStartForMyself = async () => {
    if (!selectedChallenge) return;
    
    if (activeUserChallenge) {
      setError(`You already have an active challenge. Complete it first!`);
      return;
    }
    
    try {
      const userChallenge = await startChallenge(selectedChallenge.id);
      if (isMounted.current) {
        setActiveChallenge(userChallenge);
        setSelectedChallenge(null);
        setCurrentScreen('home');
      }
    } catch (err) {
      if (isMounted.current) {
        setError('Failed to start challenge. Please try again.');
      }
      console.error('Error starting challenge:', err);
    }
  };

  const handleAssignToMember = async (memberId: string) => {
    if (!selectedChallenge) return;

    try {
      if (isMounted.current) setError(null);

      const { error: assignError } = await teamService.assignChallenge(memberId, selectedChallenge.id);
      if (assignError) throw assignError;

      if (isMounted.current) {
        const member = teamMembers.find((m) => m.member_id === memberId);
        alert(`✅ Challenge "${selectedChallenge.title}" assigned to ${member?.display_name || member?.email}!`);
        setSelectedChallenge(null);
        if (assignTarget?.id === memberId) setAssignTarget(null);
      }
    } catch (err) {
      console.error('Failed to assign challenge:', err);
      if (isMounted.current) {
        setError('Failed to assign challenge. Please try again.');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
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
              <h2 className="text-lg font-bold text-white">
                {assignTarget?.id ? `Send Challenge to ${assignTarget.name}` : 'Your Challenge!'}
              </h2>
              <button
                onClick={() => {
                  setSelectedChallenge(null);
                  if (assignTarget?.id) setAssignTarget(null);
                }}
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
                  {!selectedChallenge.is_custom && userTier === 'pro' && !isSendToFlow && (
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-lg">
                      {calculateChallengePoints(selectedChallenge.goal_steps)} PTS
                    </div>
                  )}
                </div>
              </div>
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
        <h2 className="text-2xl font-bold text-white mb-2">Browse Challenges</h2>
        <p className="text-gray-400 text-sm">
          Discover curated walking adventures
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-gray-400 text-sm">Loading challenges...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-8">
          {sortedGroupedChallenges.beginner.length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-white mb-3 px-1">Beginner • Up to 5k Steps</h3>
              <div className="overflow-x-auto pb-4 pt-2 -mx-5 px-5 scrollbar-hide">
                <div className="flex gap-3" style={{ width: 'max-content' }}>
                  {sortedGroupedChallenges.beginner.map((challenge) => {
                    const isDaily = dailyChallenge?.id === challenge.id;
                    return (
                      <button
                        key={challenge.id}
                        onClick={() => setSelectedChallenge(challenge)}
                        className="group relative w-40 flex-shrink-0"
                      >
                        <div className={`relative aspect-[3/4] rounded-xl overflow-hidden ring-1 ${isDaily ? 'ring-2 ring-blue-500' : 'ring-white/10'} group-hover:ring-purple-500/50 transition-all`}>
                          <img
                            src={challenge.image_url}
                            alt={challenge.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            style={{ filter: isChallengeCompleted(challenge.id) ? 'brightness(0.7)' : 'blur(10px)' }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          
                          {isDaily && !isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg animate-pulse">
                              DAILY
                            </div>
                          )}
                          
                          {isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 01-1.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}

                          {!isSendToFlow && !challenge.is_custom && !isChallengeCompleted(challenge.id) && userTier === 'pro' && (
                            <div className={`absolute top-2 left-2 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg ${
                              isDaily 
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse' 
                                : 'bg-amber-500/90'
                            }`}>
                              {calculateChallengePoints(challenge.goal_steps, isDaily)} PTS
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

          {sortedGroupedChallenges.advanced.length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-white mb-3 px-1">Advanced • 5k to 15k Steps</h3>
              <div className="overflow-x-auto pb-4 pt-2 -mx-5 px-5 scrollbar-hide">
                <div className="flex gap-3" style={{ width: 'max-content' }}>
                  {sortedGroupedChallenges.advanced.map((challenge) => {
                    const isDaily = dailyChallenge?.id === challenge.id;
                    return (
                      <button
                        key={challenge.id}
                        onClick={() => setSelectedChallenge(challenge)}
                        className="group relative w-40 flex-shrink-0"
                      >
                        <div className={`relative aspect-[3/4] rounded-xl overflow-hidden ring-1 ${isDaily ? 'ring-2 ring-blue-500' : 'ring-white/10'} group-hover:ring-purple-500/50 transition-all`}>
                          <img
                            src={challenge.image_url}
                            alt={challenge.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            style={{ filter: isChallengeCompleted(challenge.id) ? 'brightness(0.7)' : 'blur(10px)' }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          
                          {isDaily && !isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg animate-pulse">
                              DAILY
                            </div>
                          )}
                          
                          {isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 01-1.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}

                          {!isSendToFlow && !challenge.is_custom && !isChallengeCompleted(challenge.id) && userTier === 'pro' && (
                            <div className={`absolute top-2 left-2 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg ${
                              isDaily 
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse' 
                                : 'bg-amber-500/90'
                            }`}>
                              {calculateChallengePoints(challenge.goal_steps, isDaily)} PTS
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

          {sortedGroupedChallenges.expert.length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-white mb-3 px-1">Expert • 15k+ Steps</h3>
              <div className="overflow-x-auto pb-4 pt-2 -mx-5 px-5 scrollbar-hide">
                <div className="flex gap-3" style={{ width: 'max-content' }}>
                  {sortedGroupedChallenges.expert.map((challenge) => {
                    const isDaily = dailyChallenge?.id === challenge.id;
                    return (
                      <button
                        key={challenge.id}
                        onClick={() => setSelectedChallenge(challenge)}
                        className="group relative w-40 flex-shrink-0"
                      >
                        <div className={`relative aspect-[3/4] rounded-xl overflow-hidden ring-1 ${isDaily ? 'ring-2 ring-blue-500' : 'ring-white/10'} group-hover:ring-purple-500/50 transition-all`}>
                          <img
                            src={challenge.image_url}
                            alt={challenge.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            style={{ filter: isChallengeCompleted(challenge.id) ? 'brightness(0.7)' : 'blur(10px)' }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          
                          {isDaily && !isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg animate-pulse">
                              DAILY
                            </div>
                          )}
                          
                          {isChallengeCompleted(challenge.id) && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 01-1.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}

                          {!isSendToFlow && !challenge.is_custom && !isChallengeCompleted(challenge.id) && userTier === 'pro' && (
                            <div className={`absolute top-2 left-2 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg ${
                              isDaily 
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse' 
                                : 'bg-amber-500/90'
                            }`}>
                              {calculateChallengePoints(challenge.goal_steps, isDaily)} PTS
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