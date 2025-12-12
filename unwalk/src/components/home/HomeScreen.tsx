import { motion } from 'framer-motion';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { useEffect, useState } from 'react';
import { getCompletedChallenges } from '../../lib/api';
import type { UserChallenge } from '../../types';

export function HomeScreen() {
  const [completedChallenges, setCompletedChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const pausedChallenges = useChallengeStore((s) => s.pausedChallenges);
  const userTier = useChallengeStore((s) => s.userTier);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const pauseActiveChallenge = useChallengeStore((s) => s.pauseActiveChallenge);
  const resumeChallenge = useChallengeStore((s) => s.resumeChallenge);

  // Mock family members - later from API
  const [familyMembers] = useState([
    { id: '1', name: 'Mama', avatar: '👩', activeChallenges: 1, completedChallenges: 3 },
    { id: '2', name: 'Tata', avatar: '👨', activeChallenges: 0, completedChallenges: 5 },
    { id: '3', name: 'Kasia', avatar: '👧', activeChallenges: 2, completedChallenges: 1 },
  ]);

  useEffect(() => {
    loadCompletedChallenges();
  }, []);

  const loadCompletedChallenges = async () => {
    try {
      const data = await getCompletedChallenges();
      setCompletedChallenges(data);
    } catch (err) {
      console.error('Failed to load completed challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseChallenge = async () => {
    if (!activeUserChallenge) return;
    
    const confirmed = confirm(
      `⏸️ Pause "${activeUserChallenge.admin_challenge?.title}"?\n\n` +
      `Progress saved: ${activeUserChallenge.current_steps.toLocaleString()} steps.\n\n` +
      `You can start a new challenge and resume later.`
    );
    
    if (confirmed) {
      const pausedChallenge = { ...activeUserChallenge, status: 'paused' as const, paused_at: new Date().toISOString() };
      pauseActiveChallenge(pausedChallenge);
    }
  };

  const handleAbandonChallenge = async () => {
    if (!activeUserChallenge) return;
    
    const confirmed = confirm(
      `⚠️ Abandon "${activeUserChallenge.admin_challenge?.title}"?\n\n` +
      `Progress will be LOST: ${activeUserChallenge.current_steps.toLocaleString()} steps.\n\n` +
      `This cannot be undone!`
    );
    
    if (confirmed) {
      const { clearChallenge } = useChallengeStore.getState();
      clearChallenge();
      loadCompletedChallenges();
    }
  };

  const handleResumeChallenge = (challenge: UserChallenge) => {
    const activeChallenge = { ...challenge, status: 'active' as const };
    resumeChallenge(activeChallenge);
  };

  const calculateProgress = () => {
    if (!activeUserChallenge) return 0;
    return Math.round((activeUserChallenge.current_steps / (activeUserChallenge.admin_challenge?.goal_steps || 1)) * 100);
  };

  const calculateDaysActive = () => {
    if (!activeUserChallenge?.started_at) return 0;
    const startDate = new Date(activeUserChallenge.started_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const totalSteps = completedChallenges.reduce((sum, c) => sum + c.current_steps, 0) + (activeUserChallenge?.current_steps || 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">UnWalk</h1>
        </div>
      </header>

      {/* Profile Modal */}
      {showProfile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
          onClick={() => setShowProfile(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
              <button onClick={() => setShowProfile(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats */}
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">Total Steps</div>
                <div className="text-3xl font-bold text-gray-900">{totalSteps.toLocaleString()}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="text-sm text-green-600 mb-1">Completed</div>
                  <div className="text-2xl font-bold text-green-700">{completedChallenges.length}</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-sm text-blue-600 mb-1">Active Days</div>
                  <div className="text-2xl font-bold text-blue-700">{calculateDaysActive()}</div>
                </div>
              </div>
            </div>

            {/* Tier Toggle */}
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">Account Type</div>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => useChallengeStore.getState().setUserTier('basic')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    userTier === 'basic' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Basic
                </button>
                <button
                  onClick={() => useChallengeStore.getState().setUserTier('pro')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    userTier === 'pro' 
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Pro ⭐
                </button>
              </div>
              {userTier === 'basic' && (
                <p className="text-xs text-gray-500 mt-2">
                  Upgrade to Pro for unlimited paused challenges
                </p>
              )}
            </div>

            {/* Actions */}
            <button
              onClick={() => {
                if (confirm('Reset all data and return to onboarding?')) {
                  useChallengeStore.getState().clearChallenge();
                  useChallengeStore.getState().setOnboardingComplete(false);
                  setCurrentScreen('onboarding');
                }
              }}
              className="w-full bg-red-50 text-red-600 hover:bg-red-100 px-4 py-3 rounded-xl font-medium transition-colors"
            >
              Reset App
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Image Viewer Modal */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.title}
              className="w-full h-auto rounded-lg shadow-2xl"
            />
            <div className="mt-4 text-center">
              <h3 className="text-xl font-bold text-white mb-1">{selectedImage.title}</h3>
              <p className="text-white/70 text-sm">Tap outside to close</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      <main className="px-6 py-6 max-w-4xl mx-auto space-y-8">
        {/* MY FAMILY / TEAM SECTION */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">My Family</h2>
            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
              + Invite
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {familyMembers.map((member) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 hover:bg-gray-800 transition-all cursor-pointer"
              >
                <div className="text-4xl mb-2 text-center">{member.avatar}</div>
                <div className="text-center">
                  <div className="font-bold text-white text-sm mb-1">{member.name}</div>
                  <div className="text-xs text-gray-400">
                    {member.activeChallenges > 0 && (
                      <span className="text-green-400">🔥 {member.activeChallenges} active</span>
                    )}
                    {member.activeChallenges === 0 && (
                      <span className="text-gray-500">No active</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ✓ {member.completedChallenges} completed
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick Action */}
          {!activeUserChallenge && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setCurrentScreen('library')}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-blue-500/50"
            >
              🎯 Assign New Challenge to Family
            </motion.button>
          )}
        </section>

        {/* ACTIVE CHALLENGE */}
        {activeUserChallenge && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Active Challenge</h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setCurrentScreen('dashboard')}
              className="relative rounded-2xl overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-all group"
            >
              {/* Background */}
              <div className="absolute inset-0">
                <img
                  src={activeUserChallenge.admin_challenge?.image_url}
                  alt={activeUserChallenge.admin_challenge?.title}
                  className="w-full h-full object-cover"
                  style={{ 
                    filter: `blur(${Math.max(0, 30 - (calculateProgress() * 0.3))}px)` 
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
              </div>

              {/* Content */}
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {activeUserChallenge.admin_challenge?.title}
                    </h3>
                    <p className="text-white/80 text-sm">
                      Day {calculateDaysActive()} • {calculateProgress()}% revealed
                    </p>
                  </div>
                  <div className="text-3xl">{calculateProgress() === 100 ? '🎉' : '🔥'}</div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white/20 rounded-full h-2 mb-4">
                  <div
                    className="bg-green-400 h-full rounded-full transition-all"
                    style={{ width: `${calculateProgress()}%` }}
                  />
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-white/90 text-sm">
                  <span>{activeUserChallenge.current_steps.toLocaleString()} / {activeUserChallenge.admin_challenge?.goal_steps.toLocaleString()} steps</span>
                  <div className="flex items-center gap-3">
                    {userTier === 'pro' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePauseChallenge();
                        }}
                        className="text-yellow-300 hover:text-yellow-200 text-xs font-medium"
                      >
                        ⏸️ Pause
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAbandonChallenge();
                      }}
                      className="text-red-300 hover:text-red-200 text-xs font-medium"
                    >
                      Abandon
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>
        )}

        {/* PAUSED CHALLENGES (PRO) */}
        {userTier === 'pro' && pausedChallenges.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Paused ({pausedChallenges.length})</h2>
            <div className="space-y-3">
              {pausedChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <img
                      src={challenge.admin_challenge?.image_url}
                      alt={challenge.admin_challenge?.title}
                      className="w-full h-full object-cover"
                      style={{ filter: 'blur(15px)' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-xl">⏸️</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate">{challenge.admin_challenge?.title}</h3>
                    <p className="text-sm text-gray-400">
                      {challenge.current_steps.toLocaleString()} / {challenge.admin_challenge?.goal_steps.toLocaleString()} 
                      <span className="mx-1">•</span>
                      {Math.round((challenge.current_steps / (challenge.admin_challenge?.goal_steps || 1)) * 100)}%
                    </p>
                  </div>

                  <button
                    onClick={() => handleResumeChallenge(challenge)}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex-shrink-0"
                  >
                    Resume
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* COMPLETED CHALLENGES */}
        {completedChallenges.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">
              Completed ({completedChallenges.length})
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {completedChallenges.map((challenge) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setSelectedImage({
                    url: challenge.admin_challenge?.image_url || '',
                    title: challenge.admin_challenge?.title || ''
                  })}
                  className="relative aspect-square rounded-xl overflow-hidden shadow-md group cursor-pointer hover:scale-105 transition-transform"
                >
                  <img
                    src={challenge.admin_challenge?.image_url}
                    alt={challenge.admin_challenge?.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3">
                    <div className="text-white w-full">
                      <div className="font-bold text-sm mb-1 truncate">{challenge.admin_challenge?.title}</div>
                      <div className="text-xs opacity-90">{challenge.current_steps.toLocaleString()} steps</div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  {/* Zoom hint overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                      <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Floating Action Button - Active Challenge */}
      {activeUserChallenge && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onClick={() => setCurrentScreen('dashboard')}
          className="fixed bottom-24 right-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full w-16 h-16 shadow-2xl hover:shadow-green-500/50 transition-all flex items-center justify-center z-30 hover:scale-110"
        >
          <div className="relative">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse"></div>
          </div>
        </motion.button>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-6 py-3 z-20">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 text-blue-400">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </button>

          <button
            onClick={() => setCurrentScreen('library')}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs font-medium">Explore</span>
          </button>

          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
