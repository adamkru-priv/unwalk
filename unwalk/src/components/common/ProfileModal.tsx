import { motion } from 'framer-motion';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { useEffect, useState } from 'react';
import { getCompletedChallenges } from '../../lib/api';
import type { UserChallenge } from '../../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [completedChallenges, setCompletedChallenges] = useState<UserChallenge[]>([]);
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);
  const userTier = useChallengeStore((s) => s.userTier);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);

  useEffect(() => {
    if (isOpen) {
      loadCompletedChallenges();
    }
  }, [isOpen]);

  const loadCompletedChallenges = async () => {
    try {
      const data = await getCompletedChallenges();
      setCompletedChallenges(data);
    } catch (err) {
      console.error('Failed to load completed challenges:', err);
    }
  };

  const calculateDaysActive = () => {
    if (!activeUserChallenge?.started_at) return 0;
    const startDate = new Date(activeUserChallenge.started_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const totalSteps = completedChallenges.reduce((sum, c) => sum + c.current_steps, 0) + (activeUserChallenge?.current_steps || 0);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
          <div className="text-sm text-gray-600 mb-3 font-medium">Account Type</div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 mb-4">
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

          {/* Plan Features Comparison */}
          {userTier === 'basic' ? (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="text-sm font-semibold text-gray-900 mb-3">Basic Plan</div>
              <div className="space-y-2 text-sm">
                {/* All items with warning triangle */}
                <div className="flex items-start gap-2 text-gray-600">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Contains ads</span>
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Can't pause challenges</span>
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Only 1 person per challenge</span>
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Only 1 active challenge at a time</span>
                </div>
              </div>
              <button
                onClick={() => useChallengeStore.getState().setUserTier('pro')}
                className="w-full mt-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg"
              >
                Upgrade to Pro ⭐
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⭐</span>
                <div className="text-sm font-semibold text-amber-900">Pro Plan</div>
              </div>
              <div className="space-y-2 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">No Ads</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Pause & resume challenges</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Assign to multiple people</span>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Multiple active challenges</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={() => {
            if (confirm('Reset all data and return to onboarding?')) {
              useChallengeStore.getState().clearChallenge();
              useChallengeStore.getState().setOnboardingComplete(false);
              setCurrentScreen('onboarding');
              onClose();
            }
          }}
          className="w-full bg-red-50 text-red-600 hover:bg-red-100 px-4 py-3 rounded-xl font-medium transition-colors"
        >
          Reset App
        </button>
      </motion.div>
    </motion.div>
  );
}
