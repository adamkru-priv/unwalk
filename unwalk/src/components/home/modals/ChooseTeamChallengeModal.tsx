import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface TeamChallenge {
  id: string;
  title: string;
  description: string;
  goal_steps: number;
  time_limit_hours: number;
  points: number;
  image_url: string;
  category: string;
}

interface ChooseTeamChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChallengeSelected: (challengeId: string) => void;
}

export function ChooseTeamChallengeModal({ isOpen, onClose, onChallengeSelected }: ChooseTeamChallengeModalProps) {
  const [challenges, setChallenges] = useState<TeamChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTeamChallenges();
    }
  }, [isOpen]);

  const loadTeamChallenges = async () => {
    try {
      setLoading(true);
      
      // Load team challenges (those with is_team_challenge = true)
      const { data, error } = await supabase
        .from('admin_challenges')
        .select('*')
        .eq('is_team_challenge', true)
        .eq('is_active', true)
        .order('goal_steps', { ascending: true });

      if (error) throw error;

      setChallenges(data || []);
    } catch (error) {
      console.error('Failed to load team challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChallenge = async (challengeId: string) => {
    setStarting(challengeId);
    onChallengeSelected(challengeId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#151A25] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              🏆 Choose Team Challenge
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select a challenge and invite friends to join
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-500 dark:text-gray-400">Loading challenges...</p>
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 dark:text-gray-400 mb-2 font-bold">No team challenges available</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Check back later for new challenges!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-500/10 to-pink-500/10 border-2 border-orange-500/30 dark:border-orange-500/20 hover:border-orange-500/50 transition-all cursor-pointer group"
                  onClick={() => handleSelectChallenge(challenge.id)}
                >
                  {/* Background Image */}
                  <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                    <img 
                      src={challenge.image_url} 
                      alt={challenge.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="relative p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">
                          {challenge.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {challenge.description}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4 text-sm">
                      <span className="text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1.5">
                        <span>🎯</span>
                        {challenge.goal_steps.toLocaleString()} steps
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1.5">
                        <span>⏱️</span>
                        {challenge.time_limit_hours}h
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1.5">
                        <span>💎</span>
                        {challenge.points} XP
                      </span>
                    </div>

                    {/* Select Button */}
                    <button
                      disabled={starting === challenge.id}
                      className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 rounded-xl font-black text-base shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {starting === challenge.id ? '⏳ Selecting...' : '✨ Select & Invite Friends'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold hover:scale-105 active:scale-95 transition-transform"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
