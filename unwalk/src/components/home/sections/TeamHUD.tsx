import { useChallengeStore } from '../../../stores/useChallengeStore';
import { useState } from 'react';
import { useTeamChallenge } from './TeamHUD/useTeamChallenge';
import { useTeamChallengeActions } from './TeamHUD/useTeamChallengeActions';
import type { TeamHUDProps } from './TeamHUD/types';
import { useHealthKit } from '../../../hooks/useHealthKit'; // 🎯 NEW: HealthKit hook

export function TeamHUD({ teamChallenge, teamMembers, onClick, onInviteMoreClick, onChallengeStarted, onChallengeCancelled, onChallengeEnded }: TeamHUDProps) {
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const [isExpanded, setIsExpanded] = useState(false); // 🎯 NEW: Track expanded state
  const [isUpdating, setIsUpdating] = useState(false); // 🎯 NEW: Track updating state
  
  // 🎯 NEW: Check if running on native iOS
  const { isNative } = useHealthKit();
  
  // 🎯 Use custom hooks
  const { pendingChallenge, setPendingChallenge } = useTeamChallenge(teamChallenge);
  const { starting, cancelChallenge, startChallenge, endChallenge } = useTeamChallengeActions({
    onChallengeStarted,
    onChallengeCancelled,
    onChallengeEnded // 🎯 FIX: Use callback instead of reload
  });

  const handleCancelChallenge = async () => {
    const success = await cancelChallenge(pendingChallenge!);
    if (success) {
      setPendingChallenge(null);
    }
  };

  const handleStartChallenge = async () => {
    const success = await startChallenge(pendingChallenge!);
    if (success) {
      setCurrentScreen('dashboard');
    }
  };

  const handleEndChallenge = async () => {
    if (teamChallenge) {
      await endChallenge(teamChallenge.id);
    }
  };

  // 🎯 FIX: Handle adding steps without reloading entire page
  const handleAddSteps = async (steps: number) => {
    if (isUpdating || !teamChallenge) return;
    
    try {
      setIsUpdating(true);
      const { supabase } = await import('../../../lib/supabase');
      
      // 🎯 FIX: Update user_challenges table directly (not team_challenge_participants)
      const currentSteps = teamChallenge.current_steps || 0;
      const goalSteps = teamChallenge.admin_challenge?.goal_steps || 0;
      const newSteps = Math.min(currentSteps + steps, goalSteps); // Don't exceed goal
      
      console.log('📊 [TeamHUD] Adding steps:', steps, '- Current:', currentSteps, '→ New:', newSteps);
      
      const { error } = await supabase
        .from('user_challenges')
        .update({ current_steps: newSteps })
        .eq('id', teamChallenge.id);
      
      if (error) {
        console.error('❌ [TeamHUD] Failed to update steps:', error);
        throw error;
      }
      
      console.log('✅ [TeamHUD] Steps updated successfully');
      
      // 🎯 FIX: Use callback instead of reload to keep current slide
      if (onChallengeStarted) {
        await onChallengeStarted();
      }
    } catch (error) {
      console.error('❌ [TeamHUD] Failed to update steps:', error);
      alert('Failed to update progress. Please try again.');
    } finally {
      setIsUpdating(false);
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
            {/* Single label above the circle */}
            <div className="text-center mb-4">
              <h3 className="text-xl font-black text-gray-800 dark:text-white">
                My Team Challenge
              </h3>
            </div>

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
          {/* Single label above the circle */}
          <div className="text-center mb-4">
            <h3 className="text-xl font-black text-gray-800 dark:text-white">
              My Team Challenge
            </h3>
          </div>

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
      <div className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl">
        {/* Single label above the circle */}
        <div className="text-center mb-4">
          <h3 className="text-xl font-black text-gray-800 dark:text-white">
            My Team Challenge
          </h3>
        </div>

        {/* Giant Progress Ring - SAME STYLE */}
        <div 
          className="flex justify-center mb-6 cursor-pointer group"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="relative transition-transform duration-200 group-hover:scale-105" style={{ width: size, height: size }}>
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
              {/* Tap hint */}
              <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                👆 Tap for details
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
            👥 {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} walking together
          </p>
        </div>

        {/* Compact Stats Row - SAME STYLE AS RunnerHUD */}
        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
          {/* XP Reward */}
          <div className="flex items-center gap-2">
            <div>
              <div className="font-black text-gray-900 dark:text-white">{xpReward} XP</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Reward</div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-300 dark:bg-gray-700"></div>

          {/* Deadline */}
          <div className="flex items-center gap-2">
            <div>
              <div className="font-black text-gray-900 dark:text-white">{deadline_text}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Left</div>
            </div>
          </div>
        </div>

        {/* Toggle Details Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl active:scale-98 transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isExpanded ? 'Hide Details' : 'View Details'}
          <svg 
            className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 🎯 NEW: Expanded Details Panel */}
        <div 
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            isExpanded ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="space-y-3">
            {/* Team Members List - Detailed */}
            <div className="bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 rounded-xl p-4">
              <div className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase mb-3">
                Team Leaderboard
              </div>
              <div className="space-y-2">
                {sortedMembers.map((member, index) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-white/50 dark:bg-black/20">
                    <span className="text-gray-700 dark:text-gray-300 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          member.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm flex items-center gap-1">
                          {member.name}
                          {index === 0 && <span className="text-base">👑</span>}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {member.percentage}% contribution
                        </div>
                      </div>
                    </span>
                    <div className="text-right">
                      <div className="font-black text-gray-900 dark:text-white">
                        {member.steps.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        steps
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Distance */}
              <div className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-gray-800 rounded-xl p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase mb-1">Team Distance</div>
                <div className="text-xl font-black text-gray-900 dark:text-white">
                  {(totalSteps * 0.000762).toFixed(2)} km
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  / {(goalSteps * 0.000762).toFixed(2)} km
                </div>
              </div>

              {/* Time Remaining */}
              <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase mb-1">Time Left</div>
                <div className="text-xl font-black text-gray-900 dark:text-white">
                  {deadline_text}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  to complete
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {/* 🎯 NEW: Step Simulator (Web/PWA only) */}
              {progressPercent < 100 && !isNative && (
                <div className="bg-blue-900/80 backdrop-blur-sm rounded-xl p-3 border border-blue-700/50">
                  <p className="text-xs font-semibold text-blue-200 mb-2">Step Simulator (Web/Test Only)</p>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSteps(100);
                      }}
                      disabled={isUpdating}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      +100
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSteps(500);
                      }}
                      disabled={isUpdating}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      +500
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSteps(1000);
                      }}
                      disabled={isUpdating}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      +1K
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSteps(5000);
                      }}
                      disabled={isUpdating}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      +5K
                    </button>
                  </div>
                </div>
              )}

              {/* Invite More Friends Button */}
              {teamMembers.length < 5 && onInviteMoreClick && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onInviteMoreClick(
                      teamChallenge.admin_challenge_id,
                      teamChallenge.admin_challenge?.title || 'Team Challenge',
                      teamMembers.filter(m => m.name !== 'You').map(m => m.id)
                    );
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg active:scale-98 transition-all duration-200"
                >
                  Invite Friends ({5 - teamMembers.length} spots left)
                </button>
              )}

              {/* End Challenge Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEndChallenge();
                }}
                className="w-full bg-gradient-to-r from-red-500/10 to-orange-500/10 hover:from-red-500/20 hover:to-orange-500/20 border border-red-500/30 text-red-600 dark:text-red-400 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
              >
                🏁 End Challenge
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
