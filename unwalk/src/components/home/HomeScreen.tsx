import { useChallengeStore } from '../../stores/useChallengeStore';
import { useEffect, useState } from 'react';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { getUnclaimedChallenges } from '../../lib/api';
import type { UserChallenge } from '../../types';
import { CelebrationModal } from './CelebrationModal';

export function HomeScreen() {
  const [unclaimedChallenges, setUnclaimedChallenges] = useState<UserChallenge[]>([]);
  const [selectedCompletedChallenge, setSelectedCompletedChallenge] = useState<UserChallenge | null>(null);
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const pausedChallenges = useChallengeStore((s) => s.pausedChallenges);
  const resumeChallenge = useChallengeStore((s) => s.resumeChallenge);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);

  useEffect(() => {
    loadUnclaimedChallenges();
  }, []);

  const loadUnclaimedChallenges = async () => {
    try {
      const data = await getUnclaimedChallenges();
      setUnclaimedChallenges(data);
    } catch (err) {
      console.error('Failed to load unclaimed challenges:', err);
    }
  };

  const handleClaimSuccess = () => {
    setSelectedCompletedChallenge(null);
    loadUnclaimedChallenges(); // Refresh list
    setCurrentScreen('badges'); // Go to badges to see the new addition
  };

  const calculateProgress = () => {
    if (!activeUserChallenge) return 0;
    return Math.round((activeUserChallenge.current_steps / (activeUserChallenge.admin_challenge?.goal_steps || 1)) * 100);
  };

  const calculateProgressForChallenge = (challenge: any) => {
    return Math.round((challenge.current_steps / (challenge.admin_challenge?.goal_steps || 1)) * 100);
  };

  const calculateDaysActive = () => {
    if (!activeUserChallenge?.started_at) return 0;
    const startDate = new Date(activeUserChallenge.started_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleResumeChallenge = (challenge: any) => {
    if (confirm(`▶️ Resume "${challenge.admin_challenge?.title}"?\n\nYour progress: ${calculateProgressForChallenge(challenge)}%`)) {
      resumeChallenge(challenge);
      setCurrentScreen('dashboard');
    }
  };

  // Mock today's stats - later from Health API
  const todaySteps = 7234;
  const todayDistance = 5.8;
  const currentStreak = 3;

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Header */}
      <AppHeader />

      {/* Celebration Modal */}
      {selectedCompletedChallenge && (
        <CelebrationModal
          challenge={selectedCompletedChallenge}
          onClaim={handleClaimSuccess}
        />
      )}

      <main className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        {/* COMPLETED CHALLENGES TO CLAIM - Top priority! */}
        {unclaimedChallenges.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="animate-bounce">🎉</span>
              <span>Completed - Claim Your Reward!</span>
            </h2>
            
            <div className="space-y-3">
              {unclaimedChallenges.map((challenge) => (
                <button
                  key={challenge.id}
                  onClick={() => setSelectedCompletedChallenge(challenge)}
                  className="w-full bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-600/50 rounded-xl p-4 hover:from-green-900/50 hover:to-emerald-900/50 hover:border-green-500 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    {/* Thumbnail - fully revealed */}
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-green-500">
                      <img
                        src={challenge.admin_challenge?.image_url}
                        alt={challenge.admin_challenge?.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                        <div className="text-4xl">🎁</div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white text-lg truncate">
                          {challenge.admin_challenge?.title}
                        </h3>
                        <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                          NEW
                        </span>
                      </div>
                      <div className="text-sm text-green-300 mb-2">
                        ✓ Challenge completed!
                      </div>
                      <div className="text-xs text-gray-400">
                        {challenge.current_steps.toLocaleString()} steps • {((challenge.current_steps * 0.8) / 1000).toFixed(1)}km
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-green-400 flex-shrink-0">
                      <svg className="w-8 h-8 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ACTIVE CHALLENGE CARD */}
        {activeUserChallenge ? (
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>🎯</span>
              <span>Active Challenge</span>
            </h2>
            <div
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
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {activeUserChallenge.admin_challenge?.title}
                    </h3>
                    <p className="text-white/80 text-sm">
                      Day {calculateDaysActive()} • {calculateProgress()}% revealed
                    </p>
                  </div>
                  <div className="text-4xl">{calculateProgress() === 100 ? '🎉' : '🔥'}</div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white/20 rounded-full h-3 mb-4">
                  <div
                    className="bg-gradient-to-r from-green-400 to-green-500 h-full rounded-full transition-all"
                    style={{ width: `${calculateProgress()}%` }}
                  />
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between text-white/90">
                  <div className="text-center">
                    <div className="text-lg font-bold">{activeUserChallenge.current_steps.toLocaleString()}</div>
                    <div className="text-xs text-white/60">Current</div>
                  </div>
                  <div className="text-white/40">/</div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{activeUserChallenge.admin_challenge?.goal_steps.toLocaleString()}</div>
                    <div className="text-xs text-white/60">Goal</div>
                  </div>
                  <div className="text-white/40">•</div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-400">
                      {((activeUserChallenge.current_steps * 0.8) / 1000).toFixed(1)}km
                    </div>
                    <div className="text-xs text-white/60">Distance</div>
                  </div>
                </div>

                {/* Tap to view hint */}
                <div className="mt-4 text-center text-white/50 text-xs">
                  Tap to view details →
                </div>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors pointer-events-none" />
            </div>
          </section>
        ) : (
          /* EMPTY STATE - No active challenge */
          <section>
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-2xl p-12 relative overflow-hidden">
              {/* Decorative circles in background */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Ready to start your journey?</h2>
                <p className="text-white/70 mb-8">
                  Choose a challenge and start revealing amazing destinations!
                </p>
                
                {/* Large Circular START Button */}
                <div className="flex justify-center mb-6">
                  <button
                    onClick={() => setCurrentScreen('library')}
                    className="relative group"
                  >
                    {/* Outer glow ring */}
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-all"></div>
                    
                    {/* Main button */}
                    <div className="relative w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    
                    {/* Label below */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="text-white font-bold text-lg">Start Challenge</span>
                    </div>
                  </button>
                </div>

                {/* Secondary action */}
                <div className="mt-12 pt-6 border-t border-white/10">
                  <button
                    onClick={() => setCurrentScreen('team')}
                    className="text-white/70 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    or challenge friends & family
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* PAUSED CHALLENGES SECTION - Only for Pro users */}
        {pausedChallenges.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>⏸️</span>
              <span>Paused Challenges ({pausedChallenges.length})</span>
            </h2>
            
            <div className="space-y-3">
              {pausedChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 hover:bg-gray-800/70 transition-all"
                >
                  <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={challenge.admin_challenge?.image_url}
                        alt={challenge.admin_challenge?.title}
                        className="w-full h-full object-cover grayscale opacity-50"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white mb-1 truncate">
                        {challenge.admin_challenge?.title}
                      </h3>
                      <div className="text-sm text-gray-400 mb-2">
                        {calculateProgressForChallenge(challenge)}% complete • {challenge.current_steps.toLocaleString()} steps
                      </div>
                      
                      {/* Progress bar */}
                      <div className="bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full transition-all"
                          style={{ width: `${calculateProgressForChallenge(challenge)}%` }}
                        />
                      </div>
                    </div>

                    {/* Resume Button */}
                    <button
                      onClick={() => handleResumeChallenge(challenge)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                      Resume
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TODAY'S STATS - Mini widget */}
        <section>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <span>📊</span>
              <span>Today</span>
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">{todaySteps.toLocaleString()}</div>
                <div className="text-xs text-gray-400">Steps</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">{todayDistance}km</div>
                <div className="text-xs text-gray-400">Distance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400 mb-1">🔥 {currentStreak}</div>
                <div className="text-xs text-gray-400">Streak</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="home" />
    </div>
  );
}
