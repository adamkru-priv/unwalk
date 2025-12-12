import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { AdminChallenge, UserChallenge } from '../../types';
import { getAdminChallenges, getCompletedChallenges, startChallenge } from '../../lib/api';
import { useChallengeStore } from '../../stores/useChallengeStore';

export function ChallengeLibrary() {
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<AdminChallenge | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { activeUserChallenge, setActiveChallenge, setCurrentScreen } = useChallengeStore();
  
  // 🔍 Filter & Sort State
  const [sortBy, setSortBy] = useState<'steps-asc' | 'steps-desc' | 'default'>('default');
  const [maxSteps, setMaxSteps] = useState<number>(100000);
  const [filterExpanded, setFilterExpanded] = useState(false);

  // Mock family members for assignment
  const [familyMembers] = useState([
    { id: '1', name: 'Mama', avatar: '👩' },
    { id: '2', name: 'Tata', avatar: '👨' },
    { id: '3', name: 'Kasia', avatar: '👧' },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  // 🔄 Reload when screen becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Library visible again - reloading data...');
        loadData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const adminChallenges = await getAdminChallenges();
      
      console.log('📊 Library loaded:', {
        totalChallenges: adminChallenges.length,
      });
      
      setChallenges(adminChallenges);
      setError(null);
    } catch (err) {
      setError('Failed to load challenges. Please try again.');
      console.error('Error loading challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChallengeClick = (challenge: AdminChallenge) => {
    setSelectedChallenge(challenge);
  };

  const handleStartForMyself = async () => {
    if (!selectedChallenge) return;
    
    try {
      setStarting(selectedChallenge.id);
      
      // Check if user already has an active challenge
      if (activeUserChallenge) {
        setError(`You already have an active challenge: "${activeUserChallenge.admin_challenge?.title}". Please complete or abandon it first.`);
        setStarting(null);
        setSelectedChallenge(null);
        return;
      }
      
      const userChallenge = await startChallenge(selectedChallenge.id);
      
      setActiveChallenge(userChallenge);
      setSelectedChallenge(null);
      setCurrentScreen('home');
      
      setStarting(null);
    } catch (err) {
      setError('Failed to start challenge. Please try again.');
      console.error('Error starting challenge:', err);
      setStarting(null);
    }
  };

  const handleAssignToMember = (memberId: string) => {
    if (!selectedChallenge) return;
    
    const member = familyMembers.find(m => m.id === memberId);
    alert(`✅ Challenge "${selectedChallenge.title}" assigned to ${member?.name}!\n\nThey will receive a notification.`);
    setSelectedChallenge(null);
  };

  // 🔍 Get min/max steps from challenges
  const getStepsRange = () => {
    if (challenges.length === 0) return { min: 0, max: 100000 };
    const steps = challenges.map(c => c.goal_steps);
    return {
      min: Math.min(...steps),
      max: Math.max(...steps)
    };
  };

  // 🔍 Filter and sort challenges
  const getFilteredAndSortedChallenges = () => {
    let filtered = challenges.filter(c => c.goal_steps <= maxSteps);
    
    if (sortBy === 'steps-asc') {
      filtered = [...filtered].sort((a, b) => a.goal_steps - b.goal_steps);
    } else if (sortBy === 'steps-desc') {
      filtered = [...filtered].sort((a, b) => b.goal_steps - a.goal_steps);
    }
    
    return filtered;
  };

  const filteredChallenges = getFilteredAndSortedChallenges();
  const stepsRange = getStepsRange();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading challenges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Challenge Action Modal */}
      {selectedChallenge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedChallenge(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{selectedChallenge.title}</h2>
              <button onClick={() => setSelectedChallenge(null)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="relative aspect-[3/2] rounded-xl overflow-hidden mb-4">
                <img
                  src={selectedChallenge.image_url}
                  alt={selectedChallenge.title}
                  className="w-full h-full object-cover"
                  style={{ filter: 'blur(25px)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-4">
                  <div className="text-white">
                    <div className="text-sm font-medium mb-1">🎯 Goal: {(selectedChallenge.goal_steps / 1000).toFixed(0)}k steps</div>
                    <div className="text-xs text-white/70">{selectedChallenge.difficulty} • {selectedChallenge.category}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleStartForMyself}
                disabled={starting === selectedChallenge.id}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {starting === selectedChallenge.id ? 'Starting...' : '🚶‍♂️ Do it Myself'}
              </button>

              <div>
                <div className="text-sm text-gray-400 mb-2 text-center">or assign to</div>
                <div className="grid grid-cols-3 gap-2">
                  {familyMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleAssignToMember(member.id)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-3 rounded-lg text-sm font-medium transition-colors flex flex-col items-center gap-1"
                    >
                      <span className="text-2xl">{member.avatar}</span>
                      <span className="text-xs">{member.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

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

            {/* Simple profile info */}
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-gray-600">View your profile stats on the Home screen</p>
            </div>

            <button
              onClick={() => {
                setShowProfile(false);
                setCurrentScreen('home');
              }}
              className="w-full bg-blue-500 text-white px-4 py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              Go to Home
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-b from-gray-900 to-transparent px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => setCurrentScreen('home')}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Back to home"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">Explore Challenges</h1>
          </div>
          <p className="text-white/70 ml-10">Choose for yourself or assign to family</p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
            <button onClick={loadData} className="ml-4 underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {/* Create Custom Challenge Button */}
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowCreateModal(true)}
          className="w-full mb-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Custom Challenge
        </motion.button>

        {/* 🔍 Filters & Sort Controls */}
        <div className="mb-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
          {/* Header - Always visible */}
          <button
            onClick={() => setFilterExpanded(!filterExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="font-semibold">Filter & Sort</span>
              <span className="text-sm text-white/60">
                ({filteredChallenges.length} of {challenges.length} challenges)
              </span>
            </div>
            <svg 
              className={`w-5 h-5 text-white/60 transition-transform ${filterExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Expanded Controls */}
          {filterExpanded && (
            <div className="px-4 pb-4 space-y-4 border-t border-gray-700 pt-4">
              {/* Sort Dropdown */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Sort by Steps</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="default">Default Order</option>
                  <option value="steps-asc">Fewest Steps First 📈</option>
                  <option value="steps-desc">Most Steps First 📊</option>
                </select>
              </div>

              {/* Steps Range Slider */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Maximum Steps: {(maxSteps / 1000).toFixed(0)}k
                </label>
                <input
                  type="range"
                  min={stepsRange.min}
                  max={stepsRange.max}
                  step={1000}
                  value={maxSteps}
                  onChange={(e) => setMaxSteps(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-white/50 mt-1">
                  <span>{(stepsRange.min / 1000).toFixed(0)}k</span>
                  <span>{(stepsRange.max / 1000).toFixed(0)}k</span>
                </div>
              </div>

              {/* Reset Button */}
              {(sortBy !== 'default' || maxSteps !== stepsRange.max) && (
                <button
                  onClick={() => {
                    setSortBy('default');
                    setMaxSteps(stepsRange.max);
                  }}
                  className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Netflix-style Grid - ALL challenges, NO completed filter */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredChallenges.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="group relative aspect-[3/2] rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
              onClick={() => handleChallengeClick(challenge)}
            >
              {/* Background Image */}
              <img
                src={challenge.image_url}
                alt={challenge.title}
                className="w-full h-full object-cover"
                style={{ filter: 'blur(25px)' }}
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20 transition-opacity" />
              
              {/* MYSTERY BOX Badge */}
              <div className="absolute top-2 left-2">
                <div className="bg-purple-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                  <span>🎁</span>
                  <span>MYSTERY</span>
                </div>
              </div>
              
              {/* Content */}
              <div className="absolute inset-0 p-4 flex flex-col justify-end">
                <h3 className="text-base font-bold mb-2 line-clamp-2 text-white">
                  {challenge.title}
                </h3>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="px-2 py-0.5 bg-white/25 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                    {challenge.difficulty}
                  </span>
                  <span className="px-2 py-0.5 bg-white/25 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                    {challenge.category}
                  </span>
                </div>

                {/* Goal */}
                <div className="flex items-center gap-1.5 text-sm text-white/90 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {(challenge.goal_steps / 1000).toFixed(0)}k steps
                </div>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-white/30 backdrop-blur-sm rounded-full p-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredChallenges.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-white/70">No challenges available at the moment.</p>
          </div>
        )}
      </div>

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
          {/* Home */}
          <button
            onClick={() => setCurrentScreen('home')}
            className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </button>

          {/* Explore */}
          <button
            onClick={() => setCurrentScreen('library')}
            className="flex flex-col items-center gap-1 text-white"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            <span className="text-xs font-medium">Explore</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => setShowProfile(true)}
            className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
