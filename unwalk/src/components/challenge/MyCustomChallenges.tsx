import { useState, useEffect } from 'react';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { BottomNavigation } from '../common/BottomNavigation';
import { AppHeader } from '../common/AppHeader';
import { getMyCustomChallenges, deleteCustomChallenge } from '../../lib/api';
import type { AdminChallenge } from '../../types';

export function MyCustomChallenges() {
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const data = await getMyCustomChallenges();
      setChallenges(data);
    } catch (error) {
      console.error('Failed to load custom challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (challengeId: string, title: string) => {
    if (!confirm(`Delete "${title}"?\n\nThis will permanently remove this challenge.`)) {
      return;
    }

    try {
      await deleteCustomChallenge(challengeId);
      await loadChallenges();
      alert('Challenge deleted');
    } catch (error) {
      console.error('Failed to delete challenge:', error);
      alert('Failed to delete challenge. Please try again.');
    }
  };

  const handleEdit = (_challenge: AdminChallenge) => {
    // TODO: Navigate to edit screen
    alert('Edit functionality coming soon!');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-20 font-sans">
      <AppHeader />

      <main className="px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            My Custom Challenges
          </h1>
          <p className="text-[15px] text-gray-600 dark:text-gray-400">
            Create a challenge, then assign it to yourself or a teammate
          </p>
        </div>

        {/* Create New Button */}
        <button
          onClick={() => setCurrentScreen('customChallenge')}
          className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-2xl px-6 py-4 shadow-lg font-semibold text-[15px] mb-6 flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">✨</span>
            <div className="text-left">
              <div className="font-bold">Create New Challenge</div>
              <div className="text-sm opacity-90">Pick steps, add image, assign</div>
            </div>
          </div>
          <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Challenges List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : challenges.length === 0 ? (
          <div className="bg-white dark:bg-[#151A25] rounded-2xl p-8 text-center border border-gray-200 dark:border-white/5">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white mb-2">
              No Custom Challenges Yet
            </h3>
            <p className="text-[14px] text-gray-600 dark:text-gray-400 mb-4">
              Create your first custom challenge with a photo and personalized goal
            </p>
            <button
              onClick={() => setCurrentScreen('customChallenge')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium text-[14px] transition-colors"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 mb-2">
              Your Challenges ({challenges.length})
            </h2>
            
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                className="bg-white dark:bg-[#151A25] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* ✅ FIXED: Better mobile layout */}
                <div className="p-3 sm:p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {/* Image - smaller on mobile */}
                    {challenge.image_url && (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                        <img
                          src={challenge.image_url}
                          alt={challenge.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1 break-words">
                        {challenge.title}
                      </h3>
                      <p className="text-[13px] text-gray-600 dark:text-gray-400 mb-2 line-clamp-2 break-words">
                        {challenge.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400">
                        <span className="whitespace-nowrap">🎯 {(challenge.goal_steps / 1000).toFixed(0)}k steps</span>
                        <span>•</span>
                        <span className="capitalize">{challenge.difficulty}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions - full width row on mobile */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                    <button
                      onClick={() => handleEdit(challenge)}
                      className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="text-xs font-medium">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(challenge.id, challenge.title)}
                      className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="text-xs font-medium">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNavigation currentScreen="profile" />
    </div>
  );
}
