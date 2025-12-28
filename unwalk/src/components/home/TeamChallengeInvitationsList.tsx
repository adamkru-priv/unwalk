import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useChallengeStore } from '../../stores/useChallengeStore';

interface Invitation {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  invited_at: string;
  invited_user: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface ChallengeWithInvitations {
  challenge_id: string;
  title: string;
  goal_steps: number;
  time_limit_hours: number;
  points: number; // 🎯 FIX: Add points field
  invitations: Invitation[];
  acceptedCount: number;
  pendingCount: number;
}

interface TeamChallengeInvitationsListProps {
  onClose: () => void;
}

export function TeamChallengeInvitationsList({ onClose }: TeamChallengeInvitationsListProps) {
  const [challenge, setChallenge] = useState<ChallengeWithInvitations | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);

  useEffect(() => {
    loadMyTeamChallenge();
  }, []);

  const loadMyTeamChallenge = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load the FIRST/LATEST team challenge where user sent invitations
      // (In real scenario, you'd have only ONE active team challenge per user)
      const { data, error } = await supabase
        .from('team_challenge_invitations')
        .select(`
          id,
          status,
          invited_at,
          challenge_id,
          invited_user:users!invited_user(id, display_name, avatar_url),
          challenge:admin_challenges!challenge_id(id, title, goal_steps, time_limit_hours, image_url, points)
        `)
        .eq('invited_by', user.id)
        .order('invited_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setChallenge(null);
        setLoading(false);
        return;
      }

      // Get the LATEST challenge (first one after sort)
      const latestChallengeId = data[0].challenge_id;
      const challengeInfo = data[0].challenge as any; // 🎯 FIX: Type assertion
      
      // Group all invitations for this challenge
      const challengeData: ChallengeWithInvitations = {
        challenge_id: latestChallengeId,
        title: challengeInfo.title,
        goal_steps: challengeInfo.goal_steps,
        time_limit_hours: challengeInfo.time_limit_hours,
        points: challengeInfo.points,
        invitations: [],
        acceptedCount: 0,
        pendingCount: 0
      };

      // Add all invitations for this challenge
      data
        .filter((inv: any) => inv.challenge_id === latestChallengeId)
        .forEach((inv: any) => {
          challengeData.invitations.push({
            id: inv.id,
            status: inv.status,
            invited_at: inv.invited_at,
            invited_user: inv.invited_user
          });

          if (inv.status === 'accepted') challengeData.acceptedCount++;
          if (inv.status === 'pending') challengeData.pendingCount++;
        });

      setChallenge(challengeData);
    } catch (error) {
      console.error('Failed to load team challenge:', error);
    } finally {
      setLoading(false);
    }
  };

  const startChallenge = async () => {
    if (!challenge) return;
    
    try {
      setStarting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create user_challenge for this team challenge
      const { data: newChallenge, error } = await supabase
        .from('user_challenges')
        .insert({
          device_id: user.id,
          user_id: user.id,
          admin_challenge_id: challenge.challenge_id,
          status: 'active'
        })
        .select(`
          *,
          admin_challenge:admin_challenges(*)
        `)
        .single();

      if (error) throw error;

      // Close modal and navigate to dashboard
      onClose();
      setCurrentScreen('dashboard');
      
      console.log('✅ Team challenge started!', newChallenge);
    } catch (error) {
      console.error('Failed to start challenge:', error);
      alert('Failed to start challenge. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
      case 'accepted': return 'bg-green-500/20 text-green-600 dark:text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-600 dark:text-red-400';
      case 'expired': return 'bg-gray-500/20 text-gray-600 dark:text-gray-400';
      default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'accepted': return '✅';
      case 'rejected': return '❌';
      case 'expired': return '⏰';
      default: return '❓';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#151A25] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              📋 My Team Challenge
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your team and start the challenge
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-500 dark:text-gray-400">Loading challenge...</p>
            </div>
          ) : !challenge ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 dark:text-gray-400 mb-2 font-bold">No team challenge yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Choose a challenge and invite friends to get started!
              </p>
            </div>
          ) : (
            <div>
              {/* Challenge Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 to-pink-500/10 border-2 border-orange-500/30 dark:border-orange-500/20 mb-6">
                {/* Challenge Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">
                      {challenge.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span>🎯 {challenge.goal_steps.toLocaleString()} steps</span>
                      <span>⏱️ {challenge.time_limit_hours}h limit</span>
                      <span>💎 {challenge.points} XP</span>
                    </div>
                  </div>
                </div>

                {/* Team Status Summary */}
                <div className="flex items-center gap-4 mb-4 text-xs">
                  <span className="text-green-600 dark:text-green-400 font-bold">
                    ✅ {challenge.acceptedCount} accepted
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-400 font-bold">
                    ⏳ {challenge.pendingCount} pending
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 font-bold">
                    👥 {challenge.invitations.length} invited
                  </span>
                </div>
              </div>

              {/* Team Members List */}
              <div className="mb-6">
                <div className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase mb-3">
                  Team Members ({challenge.invitations.length} invited)
                </div>
                <div className="space-y-2">
                  {challenge.invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 rounded-xl bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {inv.invited_user.avatar_url ? (
                            <img 
                              src={inv.invited_user.avatar_url} 
                              alt={inv.invited_user.display_name} 
                              className="w-full h-full rounded-full object-cover" 
                            />
                          ) : (
                            inv.invited_user.display_name.charAt(0).toUpperCase()
                          )}
                        </div>

                        {/* Name */}
                        <div className="flex-1">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {inv.invited_user.display_name}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Invited {new Date(inv.invited_at).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${getStatusColor(inv.status)}`}>
                          <span>{getStatusEmoji(inv.status)}</span>
                          <span>{inv.status.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Start Challenge Button */}
                <button
                  onClick={startChallenge}
                  disabled={starting}
                  className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-xl font-black text-base shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {starting ? (
                    '⏳ Starting...'
                  ) : challenge.acceptedCount > 0 ? (
                    `🚀 Start Challenge (${challenge.acceptedCount + 1} members)`
                  ) : (
                    '🚀 Start Challenge (Solo for now)'
                  )}
                </button>

                {/* Invite More Button (if < 5 members) */}
                {challenge.invitations.length < 5 && (
                  <button
                    onClick={onClose}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    + Invite More Friends ({5 - challenge.invitations.length} spots left)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold hover:scale-105 active:scale-95 transition-transform"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
