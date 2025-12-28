import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useChallengeStore } from '../../../stores/useChallengeStore';
import type { UserChallenge } from '../../../types';

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  steps: number;
  percentage: number;
}

interface PendingInvitation {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  invited_at: string;
  invited_user: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface PendingChallenge {
  challenge_id: string;
  title: string;
  goal_steps: number;
  time_limit_hours: number;
  points: number;
  invitations: PendingInvitation[];
  acceptedCount: number;
  pendingCount: number;
  currentUserId?: string; // 🎯 NEW: Current user ID to mark "You"
}

interface TeamHUDProps {
  teamChallenge: UserChallenge | null;
  teamMembers: TeamMember[];
  onClick: () => void; // Choose challenge
  onInviteMoreClick?: (challengeId: string, challengeTitle: string, alreadyInvitedUserIds: string[]) => void;
  onChallengeStarted?: () => void; // 🎯 NEW: Callback after challenge starts
  onChallengeCancelled?: () => void; // 🎯 NEW: Callback after challenge cancelled
}

export function TeamHUD({ teamChallenge, teamMembers, onClick, onInviteMoreClick, onChallengeStarted, onChallengeCancelled }: TeamHUDProps) {
  const [pendingChallenge, setPendingChallenge] = useState<PendingChallenge | null>(null);
  const [starting, setStarting] = useState(false);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);

  const loadPendingChallenge = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load pending invitations
      const { data, error } = await supabase
        .from('team_challenge_invitations')
        .select(`
          id,
          status,
          invited_at,
          challenge_id,
          invited_user:users!invited_user(id, display_name, avatar_url),
          challenge:admin_challenges!challenge_id(id, title, goal_steps, time_limit_hours, points)
        `)
        .eq('invited_by', user.id)
        .order('invited_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setPendingChallenge(null);
        return;
      }

      // Get latest challenge - fix typing
      const latestChallengeId = data[0].challenge_id;
      const challengeInfo = data[0].challenge as any;
      
      const challengeData: PendingChallenge = {
        challenge_id: latestChallengeId,
        title: challengeInfo.title,
        goal_steps: challengeInfo.goal_steps,
        time_limit_hours: challengeInfo.time_limit_hours,
        points: challengeInfo.points,
        invitations: [],
        acceptedCount: 0,
        pendingCount: 0,
        currentUserId: user.id
      };

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

      console.log('🎯 Pending Challenge loaded:', challengeData.title);
      setPendingChallenge(challengeData);
    } catch (error) {
      console.error('Failed to load pending challenge:', error);
    }
  }, []);

  useEffect(() => {
    loadPendingChallenge();
  }, [loadPendingChallenge]);

  // 🎯 FIX: Clear pending challenge when teamChallenge becomes active
  useEffect(() => {
    console.log('🔍 TeamHUD useEffect - teamChallenge:', teamChallenge ? 'ACTIVE' : 'NULL');
    if (teamChallenge) {
      // Challenge is now active - clear pending state
      console.log('✅ Active challenge detected - clearing pending state');
      setPendingChallenge(null);
    } else {
      // No active challenge - check for pending invitations
      console.log('🔄 No active challenge - loading pending invitations');
      loadPendingChallenge();
    }
  }, [teamChallenge, loadPendingChallenge]);

  const handleCancelChallenge = async () => {
    if (!pendingChallenge) return;
    
    if (!confirm(`🗑️ Cancel "${pendingChallenge.title}" and delete all invitations?`)) {
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete all invitations for this challenge
      const { error } = await supabase
        .from('team_challenge_invitations')
        .delete()
        .eq('invited_by', user.id)
        .eq('challenge_id', pendingChallenge.challenge_id);

      if (error) throw error;

      alert('✅ Challenge cancelled');
      setPendingChallenge(null); // Clear UI

      // 🎯 NEW: Trigger callback after challenge cancelled
      if (onChallengeCancelled) {
        onChallengeCancelled();
      }
    } catch (error) {
      console.error('Failed to cancel challenge:', error);
      alert('❌ Failed to cancel challenge. Please try again.');
    }
  };

  const handleStartChallenge = async () => {
    if (!pendingChallenge || starting) return;
    
    try {
      setStarting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 🎯 FIX: Check if user already has an active challenge
      const { data: existingChallenge } = await supabase
        .from('user_challenges')
        .select('id, admin_challenge:admin_challenges(title)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (existingChallenge) {
        const challengeData = existingChallenge.admin_challenge as any;
        const currentTitle = challengeData?.title || 'Unknown';
        if (!confirm(`⚠️ You already have an active challenge: "${currentTitle}".\n\nEnd it first to start "${pendingChallenge.title}"?`)) {
          return;
        }

        // End existing challenge
        await supabase
          .from('user_challenges')
          .update({ status: 'completed' })
          .eq('id', existingChallenge.id);
      }

      // Create user_challenge for this team challenge
      const { data: newChallenge, error } = await supabase
        .from('user_challenges')
        .insert({
          device_id: user.id,
          user_id: user.id,
          admin_challenge_id: pendingChallenge.challenge_id,
          status: 'active'
        })
        .select(`
          *,
          admin_challenge:admin_challenges(*)
        `)
        .single();

      if (error) throw error;

      console.log('✅ Team challenge started!', newChallenge);

      // 🎯 FIX: Call callback ONCE to refresh parent data
      if (onChallengeStarted) {
        console.log('🔄 Calling onChallengeStarted callback...');
        await onChallengeStarted();
      }

      // Navigate to dashboard AFTER data refresh
      setCurrentScreen('dashboard');
    } catch (error) {
      console.error('Failed to start challenge:', error);
      alert('Failed to start challenge. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleEndChallenge = async () => {
    if (!teamChallenge) return;
    
    if (!confirm('Are you sure you want to end this team challenge?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('user_challenges')
        .update({ status: 'completed' })
        .eq('id', teamChallenge.id);

      if (error) throw error;

      // Refresh page
      window.location.reload();
    } catch (error) {
      console.error('Failed to end challenge:', error);
      alert('Failed to end challenge. Please try again.');
    }
  };

  // ============================================
  // NO ACTIVE TEAM CHALLENGE
  // ============================================
  if (!teamChallenge) {
    const size = 280;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;

    // 🎯 STATE 1: No pending challenge - show "Choose Challenge" button
    if (!pendingChallenge) {
      return (
        <div className="w-full px-4">
          <div className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl">
            {/* Giant Empty Progress Ring */}
            <div className="flex justify-center mb-6">
              <div className="relative" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90" width={size} height={size}>
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-gray-200 dark:text-gray-800"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-6xl mb-2">👥</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold text-center px-4">
                    No Team Challenge
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mb-4">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                Team Challenges
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Walk together with friends
              </p>
            </div>

            <button
              onClick={onClick}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl active:scale-98 transition-all duration-200"
            >
              🏆 Choose Challenge
            </button>
          </div>
        </div>
      );
    }

    // 🎯 STATE 2: Has pending challenge - show invitations and start button
    return (
      <div className="w-full px-4">
        <div className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl">
          {/* Giant Empty Progress Ring (0% - not started yet) */}
          <div className="flex justify-center mb-6">
            <div className="relative" style={{ width: size, height: size }}>
              <svg className="transform -rotate-90" width={size} height={size}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  className="text-gray-200 dark:text-gray-800"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-6xl mb-2">👥</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold text-center px-4">
                  Not Started
                </div>
              </div>
            </div>
          </div>

          {/* Challenge Info */}
          <div className="text-center mb-4">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
              {pendingChallenge.title}
            </h3>
            <div className="flex items-center justify-center gap-3 text-xs text-gray-600 dark:text-gray-400">
              <span>🎯 {pendingChallenge.goal_steps.toLocaleString()} steps</span>
              <span>⏱️ {pendingChallenge.time_limit_hours}h</span>
              <span>💎 {pendingChallenge.points} XP</span>
            </div>
          </div>

          {/* Team Members List - Compact */}
          <div className="mb-6 bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-3 tracking-wide">
              Team Members ({pendingChallenge.invitations.length + 1})
            </div>
            <div className="space-y-2">
              {/* You (current user) - always first */}
              <div className="flex items-center justify-between">
                <span className="text-gray-900 dark:text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    👤
                  </div>
                  <span className="font-semibold text-sm">You</span>
                </span>
                <div className="text-xs font-bold text-green-600 dark:text-green-400">
                  ✅
                </div>
              </div>

              {/* Invited members */}
              {pendingChallenge.invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between">
                  <span className="text-gray-900 dark:text-white flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {inv.invited_user.avatar_url ? (
                        <img src={inv.invited_user.avatar_url} alt={inv.invited_user.display_name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        inv.invited_user.display_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-medium text-sm truncate max-w-[140px]">{inv.invited_user.display_name}</span>
                  </span>
                  <div className="text-xs font-bold flex-shrink-0">
                    {inv.status === 'accepted' && <span className="text-green-600 dark:text-green-400">✅</span>}
                    {inv.status === 'pending' && <span className="text-yellow-600 dark:text-yellow-400">⏳</span>}
                    {inv.status === 'rejected' && <span className="text-red-600 dark:text-red-400">❌</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button 
              onClick={handleStartChallenge}
              disabled={starting}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white py-3.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {starting ? 'Starting...' : 'Start Challenge'}
            </button>
            
            {pendingChallenge.invitations.length < 4 && onInviteMoreClick && (
              <button
                onClick={() => {
                  const alreadyInvitedUserIds = pendingChallenge.invitations.map(inv => inv.invited_user.id);
                  onInviteMoreClick(
                    pendingChallenge.challenge_id,
                    pendingChallenge.title,
                    alreadyInvitedUserIds
                  );
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200"
              >
                Invite More ({4 - pendingChallenge.invitations.length} spots left)
              </button>
            )}

            {/* Cancel Challenge - small text link */}
            <div className="text-center pt-2">
              <button
                onClick={handleCancelChallenge}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors underline"
              >
                Cancel Challenge
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // ACTIVE TEAM CHALLENGE - WITH PROGRESS
  // ============================================
  
  // Calculate combined team stats
  const totalSteps = teamMembers.reduce((sum, m) => sum + m.steps, 0);
  const goalSteps = teamChallenge.admin_challenge?.goal_steps || 1;
  const progressPercent = Math.min(100, Math.round((totalSteps / goalSteps) * 100));

  // Calculate deadline
  const startedAt = new Date(teamChallenge.started_at);
  const timeLimitHours = teamChallenge.admin_challenge?.time_limit_hours || 0;
  const deadline = new Date(startedAt.getTime() + timeLimitHours * 60 * 60 * 1000);
  const now = new Date();
  const timeRemaining = deadline.getTime() - now.getTime();
  
  const formatDeadline = () => {
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (timeRemaining <= 0) return 'Expired';
    if (days > 0) return `${days}d ${hours}h`; // 🎯 FIX: Don't show minutes when days exist
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return 'Ending soon';
  };

  const deadline_text = formatDeadline();
  const xpReward = teamChallenge.admin_challenge?.points || 0;

  // Sort members by contribution (descending)
  const sortedMembers = [...teamMembers].sort((a, b) => b.steps - a.steps);

  // Calculate SVG circle properties - SAME AS RunnerHUD
  const size = 280;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="w-full px-4">
      <div 
        className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl cursor-pointer"
        onClick={onClick}
      >
        {/* Giant Progress Ring - SAME STYLE */}
        <div className="flex justify-center mb-6">
          <div className="relative" style={{ width: size, height: size }}>
            {/* Background ring */}
            <svg className="transform -rotate-90" width={size} height={size}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="transparent"
                className="text-gray-200 dark:text-gray-800"
              />
              {/* Progress ring - Team gradient (orange) */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="url(#gradient-team)"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.5))'
                }}
              />
              {/* Gradient definition - Orange/Pink for team */}
              <defs>
                <linearGradient id="gradient-team" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center content - Team Total Steps */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">
                Team Total
              </div>
              <div className="text-5xl font-black text-gray-900 dark:text-white mb-1">
                {totalSteps.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold">
                / {goalSteps.toLocaleString()} steps
              </div>
              <div className="mt-2 text-lg font-black text-orange-600 dark:text-orange-400">
                {progressPercent}%
              </div>
            </div>
          </div>
        </div>

        {/* Title - SAME STYLE */}
        <div className="text-center mb-4">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
            {teamChallenge.admin_challenge?.title}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            👥 {teamMembers.length} members walking together
          </p>
        </div>

        {/* Compact Stats Row - SAME STYLE AS RunnerHUD */}
        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
          {/* XP Reward */}
          <div className="flex items-center gap-2">
            <span className="text-lg">💎</span>
            <div>
              <div className="font-black text-gray-900 dark:text-white">{xpReward} XP</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Reward</div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-300 dark:bg-gray-700"></div>

          {/* Deadline */}
          <div className="flex items-center gap-2">
            <span className="text-lg">⏱️</span>
            <div>
              <div className="font-black text-gray-900 dark:text-white">{deadline_text}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Left</div>
            </div>
          </div>
        </div>

        {/* Team Members List - Compact */}
        <div className="mb-4 bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 rounded-xl p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase mb-2">
            Team Members
          </div>
          <div className="space-y-1.5">
            {sortedMembers.map((member, index) => (
              <div key={member.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      member.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="truncate max-w-[120px]">{member.name}</span>
                  {index === 0 && <span className="text-xs">👑</span>}
                </span>
                <div className="text-right">
                  <div className="font-bold text-gray-900 dark:text-white text-xs">
                    {member.steps.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {member.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* View Details Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setCurrentScreen('dashboard');
          }}
          className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl active:scale-98 transition-all duration-200 mb-4"
        >
          View Team Details
        </button>

        {/* End Challenge - Small text link at bottom */}
        <div className="text-center">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleEndChallenge();
            }}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors underline"
          >
            End Challenge
          </button>
        </div>
      </div>
    </div>
  );
}
