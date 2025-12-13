import { useState } from 'react';
import { motion } from 'framer-motion';
import type { AdminChallenge } from '../../types';
import { getAdminChallenges, startChallenge } from '../../lib/api';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { BottomNavigation } from '../common/BottomNavigation';
import { AppHeader } from '../common/AppHeader';
import { CreateChallengeModal } from './CreateChallengeModal';

type StepGoal = 5000 | 10000 | 15000 | 25000 | 50000;
type Category = 'animals' | 'sport' | 'nature' | 'surprise';

export function ChallengeLibrary() {
  const [selectedSteps, setSelectedSteps] = useState<StepGoal | null>(null);
  const [customSteps, setCustomSteps] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<AdminChallenge | null>(null);
  const { activeUserChallenge, setActiveChallenge, setCurrentScreen } = useChallengeStore();

  // Mock family members for assignment
  const [familyMembers] = useState([
    { id: '1', name: 'Mama', avatar: '👩' },
    { id: '2', name: 'Tata', avatar: '👨' },
    { id: '3', name: 'Kasia', avatar: '👧' },
  ]);

  const stepOptions: { value: StepGoal; label: string; emoji: string }[] = [
    { value: 5000, label: '5,000', emoji: '🚶' },
    { value: 10000, label: '10,000', emoji: '🏃' },
    { value: 15000, label: '15,000', emoji: '💪' },
    { value: 25000, label: '25,000', emoji: '🔥' },
    { value: 50000, label: '50,000', emoji: '🚀' },
  ];

  const categoryOptions: { value: Category; label: string; emoji: string }[] = [
    { value: 'animals', label: 'Animals', emoji: '🦁' },
    { value: 'sport', label: 'Sport', emoji: '⚽' },
    { value: 'nature', label: 'Nature', emoji: '🏔️' },
    { value: 'surprise', label: 'Surprise', emoji: '🎲' },
  ];

  const handleGetChallenge = async () => {
    // Get actual steps value (either from slider or custom input)
    const actualSteps = showCustomInput && customSteps 
      ? parseInt(customSteps.replace(/,/g, '')) 
      : selectedSteps;

    if (!actualSteps || !selectedCategory) {
      setError('Please select both steps and category');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if user already has an active challenge
      if (activeUserChallenge) {
        setError(`You already have an active challenge: "${activeUserChallenge.admin_challenge?.title}". Please complete or abandon it first.`);
        setLoading(false);
        return;
      }

      // Get all challenges
      const allChallenges = await getAdminChallenges();
      
      // Filter by steps (allow ±20% tolerance)
      const minSteps = actualSteps * 0.8;
      const maxSteps = actualSteps * 1.2;
      let filtered = allChallenges.filter(
        c => c.goal_steps >= minSteps && c.goal_steps <= maxSteps
      );

      // Filter by category (if not surprise)
      if (selectedCategory !== 'surprise') {
        filtered = filtered.filter(c => 
          c.category?.toLowerCase() === selectedCategory
        );
      }

      // If no matches, fallback to any challenge with similar steps
      if (filtered.length === 0) {
        filtered = allChallenges.filter(
          c => c.goal_steps >= minSteps && c.goal_steps <= maxSteps
        );
      }

      // If still no matches, just pick from all
      if (filtered.length === 0) {
        filtered = allChallenges;
      }

      // Pick random challenge
      const randomChallenge = filtered[Math.floor(Math.random() * filtered.length)];
      
      if (!randomChallenge) {
        setError('No challenges available. Please try again later.');
        setLoading(false);
        return;
      }

      // Show modal with selected challenge
      setSelectedChallenge(randomChallenge);
      setLoading(false);
    } catch (err) {
      setError('Failed to load challenge. Please try again.');
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const handleStartForMyself = async () => {
    if (!selectedChallenge) return;
    
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
    <div className="min-h-screen bg-[#0B101B] text-white pb-20 font-sans">
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
                  <div className="text-white">
                    <div className="text-sm font-semibold mb-0.5">{selectedChallenge.title}</div>
                    <div className="text-xs text-white/70">🎯 {(selectedChallenge.goal_steps / 1000).toFixed(0)}k steps</div>
                  </div>
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

      {/* Header */}
      <AppHeader />

      <main className="px-5 py-6 max-w-md mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Start New Challenge</h1>
          <p className="text-gray-400 text-sm">
            Pick your goal and let us surprise you with a mystery photo!
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-200 px-4 py-3 rounded-xl mb-5 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Step Selection - Slider or Custom Input */}
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-semibold text-white">How many steps?</h2>
              {!showCustomInput ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{stepOptions.find(o => o.value === selectedSteps)?.emoji || '🚶'}</span>
                  <span className="text-lg font-bold text-white">
                    {selectedSteps ? (selectedSteps / 1000).toFixed(0) + 'k' : '—'}
                  </span>
                </div>
              ) : customSteps ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚀</span>
                  <span className="text-lg font-bold text-white">
                    {parseInt(customSteps.replace(/,/g, '')).toLocaleString()}
                  </span>
                </div>
              ) : null}
            </div>
            
            {showCustomInput ? (
              /* Custom Input Mode */
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter steps (e.g., 500000)"
                    value={customSteps}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      if (value && parseInt(value) > 0) {
                        setCustomSteps(parseInt(value).toLocaleString());
                      } else {
                        setCustomSteps('');
                      }
                    }}
                    className="flex-1 bg-[#151A25] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-base"
                  />
                  <button
                    onClick={() => {
                      if (customSteps) {
                        // Keep the custom value and close input
                        setShowCustomInput(false);
                      }
                    }}
                    disabled={!customSteps}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed border border-blue-500 disabled:border-white/10 rounded-lg text-sm text-white font-semibold transition-colors"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomSteps('');
                      if (!selectedSteps) setSelectedSteps(10000);
                    }}
                    className="px-4 py-3 bg-[#151A25] hover:bg-[#1c2230] border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {customSteps && (
                  <div className="text-xs text-gray-400 px-1">
                    = {parseInt(customSteps.replace(/,/g, '')).toLocaleString()} steps
                  </div>
                )}
              </div>
            ) : (
              /* Slider Mode */
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={selectedSteps ? stepOptions.findIndex(o => o.value === selectedSteps) : 0}
                  onChange={(e) => {
                    const index = parseInt(e.target.value);
                    setSelectedSteps(stepOptions[index].value);
                  }}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  style={{
                    background: selectedSteps 
                      ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(stepOptions.findIndex(o => o.value === selectedSteps) / 4) * 100}%, #374151 ${(stepOptions.findIndex(o => o.value === selectedSteps) / 4) * 100}%, #374151 100%)`
                      : '#374151'
                  }}
                />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  {stepOptions.map((option) => (
                    <span key={option.value}>{(option.value / 1000).toFixed(0)}k</span>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Steps Toggle */}
            {!showCustomInput && (
              <button
                onClick={() => {
                  setShowCustomInput(true);
                  setSelectedSteps(null);
                }}
                className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 px-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Enter custom amount</span>
              </button>
            )}
          </section>

          {/* Category Selection */}
          <section>
            <h2 className="text-sm font-semibold text-white mb-3 px-1">What category?</h2>
            <div className="grid grid-cols-2 gap-2">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedCategory(option.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedCategory === option.value
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-white/10 bg-[#151A25] hover:border-white/20'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.emoji}</div>
                  <div className="text-sm font-bold text-white">{option.label}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Get Challenge Button */}
          <button
            onClick={handleGetChallenge}
            disabled={(!selectedSteps && !customSteps) || !selectedCategory || loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 text-white px-6 py-4 rounded-xl font-bold text-base transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Finding Challenge...</span>
              </>
            ) : (
              <>
                <span>🎁</span>
                <span>Get My Challenge</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0B101B] px-3 text-gray-500">or</span>
            </div>
          </div>

          {/* Create Custom Challenge */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full bg-[#151A25] hover:bg-[#1c2230] border border-white/10 text-white px-6 py-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Custom Challenge</span>
          </button>
        </div>
      </main>

      {/* Floating Action Button - Active Challenge */}
      {activeUserChallenge && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onClick={() => setCurrentScreen('dashboard')}
          className="fixed bottom-24 right-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full w-14 h-14 shadow-2xl hover:shadow-green-500/50 transition-all flex items-center justify-center z-30 hover:scale-110"
        >
          <div className="relative">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
          </div>
        </motion.button>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="library" />

      {/* Create Challenge Modal */}
      <CreateChallengeModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        onSuccess={() => {
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}
