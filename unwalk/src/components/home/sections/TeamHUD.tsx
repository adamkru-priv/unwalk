import { useChallengeStore } from '../../../stores/useChallengeStore';
import { useState, useEffect } from 'react';
import { useTeamChallenge } from './TeamHUD/useTeamChallenge';
import { useTeamChallengeActions } from './TeamHUD/useTeamChallengeActions';
import type { TeamHUDProps } from './TeamHUD/types';
import { useHealthKit } from '../../../hooks/useHealthKit';
import { TeamChallengeSlots } from './TeamHUD/TeamChallengeSlots';

export function TeamHUD({ teamChallenge, teamMembers, onClick, onInviteMoreClick, onChallengeStarted, onChallengeCancelled, onChallengeEnded, onRefresh }: TeamHUDProps) {
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0); // 🎯 NEW: Counter to force re-render
  const [isHost, setIsHost] = useState(false); // 🎯 NEW: Track if current user is host
  
  const { isNative, syncSteps, isAuthorized } = useHealthKit();
  
  const { pendingChallenge, setPendingChallenge, cancelInvitation, cancelling } = useTeamChallenge(teamChallenge);
  const { starting, cancelChallenge, startChallenge, endChallenge } = useTeamChallengeActions({
    onChallengeStarted,
    onChallengeCancelled,
    onChallengeEnded
  });

  // 🎯 NEW: Check if current user is host of the team challenge
  const checkIfHost = async () => {
    if (!teamChallenge) {
      console.log('[TeamHUD] No team challenge - not checking host status');
      setIsHost(false);
      return;
    }

    try {
      const { supabase } = await import('../../../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[TeamHUD] No authenticated user');
        setIsHost(false);
        return;
      }

      console.log('[TeamHUD] Checking if user is host...');
      console.log('[TeamHUD] User ID:', user.id);
      console.log('[TeamHUD] Team ID:', teamChallenge.team_id);

      // 🎯 NEW APPROACH: Check if user created the team challenge (first user_challenge with this team_id)
      // Host is the one who created the user_challenge with this team_id
      const { data: teamChallenges, error } = await supabase
        .from('user_challenges')
        .select('user_id, started_at')
        .eq('team_id', teamChallenge.team_id)
        .eq('status', 'active')
        .order('started_at', { ascending: true });

      if (error) {
        console.error('[TeamHUD] Failed to check host status:', error);
        setIsHost(false);
        return;
      }

      // The first user who started the challenge (earliest started_at) is the host
      const hostUserId = teamChallenges?.[0]?.user_id;
      const userIsHost = hostUserId === user.id;

      console.log('[TeamHUD] First challenge user_id (host):', hostUserId);
      console.log('[TeamHUD] Current user is host:', userIsHost);
      setIsHost(userIsHost);
    } catch (error) {
      console.error('[TeamHUD] Error checking host status:', error);
      setIsHost(false);
    }
  };

  // 🎯 Check host status when teamChallenge changes
  useEffect(() => {
    checkIfHost();
  }, [teamChallenge?.id, teamChallenge?.admin_challenge_id]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Sync HealthKit steps if on iOS
      if (isNative && isAuthorized) {
        await syncSteps();
      }
      
      // Call parent refresh callback
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('[TeamHUD] Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!teamChallenge) return;
    
    if (!confirm(`Remove ${memberName} from the team challenge?`)) {
      return;
    }
    
    try {
      const { supabase } = await import('../../../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      console.log('[TeamHUD] Removing member:', memberName, 'ID:', memberId);
      console.log('[TeamHUD] Current challenge ID:', teamChallenge.id);
      console.log('[TeamHUD] Admin challenge ID:', teamChallenge.admin_challenge_id);
      
      // 🎯 STEP 1: Delete from user_challenges
      const { data: deletedChallenge, error: deleteError } = await supabase
        .from('user_challenges')
        .delete()
        .eq('id', memberId)
        .select();
      
      if (deleteError) {
        console.error('❌ [TeamHUD] Failed to delete user_challenge:', deleteError);
        throw deleteError;
      }
      
      console.log('✅ [TeamHUD] Deleted user_challenge:', deletedChallenge);
      
      if (!deletedChallenge || deletedChallenge.length === 0) {
        console.warn('⚠️ [TeamHUD] No user_challenge deleted! Possible RLS issue or wrong ID');
        alert('Failed to remove member - no records deleted. Check permissions.');
        return;
      }
      
      // Get the user_id from deleted challenge to find team_members record
      const removedUserId = deletedChallenge[0].user_id;
      console.log('[TeamHUD] Removed user_id:', removedUserId);
      
      // 🎯 STEP 2: Clear active_challenge_id in team_members (DON'T delete the record!)
      // This way the user remains in your team but is no longer in this specific challenge
      // 🔧 FIX: Remove .eq('active_challenge_id', ...) condition so it ALWAYS updates
      const { data: updatedTeamMember, error: teamMemberError } = await supabase
        .from('team_members')
        .update({ 
          active_challenge_id: null,
          challenge_status: null,
          challenge_role: null
        })
        .eq('user_id', user.id) // Host's ID
        .eq('member_id', removedUserId) // Removed member's ID
        .select();
      
      if (teamMemberError) {
        console.error('❌ [TeamHUD] Failed to update team_member:', teamMemberError);
        // Don't throw - user_challenge is already deleted, this is just cleanup
      } else {
        console.log('✅ [TeamHUD] Updated team_member (cleared challenge):', updatedTeamMember);
        
        if (!updatedTeamMember || updatedTeamMember.length === 0) {
          console.warn('⚠️ [TeamHUD] No team_member record found to update! Member may have been removed from team.');
        }
      }
      
      console.log('✅ [TeamHUD] Member removed successfully from challenge');
      
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('❌ [TeamHUD] Failed to remove member:', error);
      alert('Failed to remove member. Please try again.');
    }
  };

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

  const handleAddSteps = async (steps: number) => {
    if (isUpdating || !teamChallenge) return;
    
    try {
      setIsUpdating(true);
      const { supabase } = await import('../../../lib/supabase');
      
      const currentSteps = teamChallenge.current_steps || 0;
      const goalSteps = teamChallenge.admin_challenge?.goal_steps || 0;
      const newSteps = Math.min(currentSteps + steps, goalSteps);
      
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
      
      if (onChallengeStarted) {
        await onChallengeStarted();
      }
    } catch (error) {
      console.error('❌ [TeamHUD] Failed to update steps:', error);
      alert('Failed to update progress. Please try again.');
      setIsUpdating(false);
    }
  };

  if (!teamChallenge) {
    const size = 280;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;

    if (!pendingChallenge) {
      return (
        <div className="w-full px-4">
          <div className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl">
            <div className="text-center mb-4">
              <h3 className="text-xl font-black text-gray-800 dark:text-white">
                My Team Challenge
              </h3>
            </div>

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
                Team
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Walk together with friends
              </p>
            </div>

            <button
              onClick={onClick}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl active:scale-98 transition-all duration-200"
            >
              Start here
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full px-4">
        <div className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl">
          <div className="text-center mb-4">
            <h3 className="text-xl font-black text-gray-800 dark:text-white">
              My Team Challenge
            </h3>
          </div>

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

          <div className="mb-6 bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-3 tracking-wide">
              Team Members ({pendingChallenge.invitations.length + 1})
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-900 dark:text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    👤
                  </div>
                  <span className="font-semibold text-sm">You (Host)</span>
                </span>
                <div className="text-xs font-bold text-green-600 dark:text-green-400">
                  ✅
                </div>
              </div>

              {pendingChallenge.invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-2">
                  <span className="text-gray-900 dark:text-white flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {inv.invited_user.avatar_url ? (
                        <img src={inv.invited_user.avatar_url} alt={inv.invited_user.display_name || 'User'} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        (inv.invited_user.display_name || '?').charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-medium text-sm truncate">{inv.invited_user.display_name || 'Unknown User'}</span>
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-xs font-bold">
                      {inv.status === 'accepted' && <span className="text-green-600 dark:text-green-400">✅</span>}
                      {inv.status === 'pending' && <span className="text-yellow-600 dark:text-yellow-400">⏳</span>}
                      {inv.status === 'rejected' && <span className="text-red-600 dark:text-red-400">❌</span>}
                    </div>
                    {inv.status === 'pending' && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Cancel invitation for ${inv.invited_user.display_name || 'this user'}?`)) {
                            await cancelInvitation(inv.id);
                          }
                        }}
                        disabled={cancelling === inv.id}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold disabled:opacity-50 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        {cancelling === inv.id ? '...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

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

  if (teamChallenge) {
    const totalSteps = teamMembers.reduce((sum, m) => sum + m.steps, 0);
    const goalSteps = teamChallenge.admin_challenge?.goal_steps || 1;
    const progressPercent = Math.min(100, Math.round((totalSteps / goalSteps) * 100));

    const xpReward = teamChallenge.admin_challenge?.points || 0;

    const sortedMembers = [...teamMembers].sort((a, b) => b.steps - a.steps);

    const size = 280;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

    return (
      <div className="w-full px-4">
        <div className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl relative">
          <div className="text-center mb-4">
            <h3 className="text-xl font-black text-gray-800 dark:text-white">
              My Team Challenge
            </h3>
          </div>

          <div 
            className="flex justify-center mb-6 cursor-pointer group"
            onClick={handleRefresh}
          >
            <div className="relative transition-transform duration-200 group-hover:scale-105" style={{ width: size, height: size }}>
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
                <defs>
                  <linearGradient id="gradient-team" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>

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
                {isRefreshing && (
                  <div className="mt-2 text-xs text-orange-400 dark:text-orange-300 animate-pulse">
                    Updating...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-center mb-4">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
              {teamChallenge.admin_challenge?.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Goal: {goalSteps.toLocaleString()} steps • Reward: {xpReward} XP
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              👥 {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} walking together
            </p>
          </div>

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

          <div 
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              isExpanded ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="space-y-3">
              <TeamChallengeSlots 
                key={`slots-${teamChallenge.id}-${refreshCounter}`}
                members={sortedMembers.map(m => {
                  // 🎯 Get current user ID to check
                  const isCurrentUser = m.isCurrentUser || false;
                  
                  // 🎯 Check if this member is the host
                  // Host is determined by checkIfHost() - the first user who started the challenge
                  const memberIsHost = m.isHost || false;
                  
                  console.log('[TeamHUD] Member:', m.name, 'isCurrentUser:', isCurrentUser, 'isHost:', memberIsHost, 'id:', m.id);
                  return {
                    id: m.id,
                    name: m.name,
                    avatar: m.avatar,
                    steps: m.steps,
                    percentage: m.percentage,
                    isCurrentUser,
                    isHost: memberIsHost
                  };
                })}
                challengeId={teamChallenge.admin_challenge_id}
                maxMembers={5}
                isHost={isHost}
                onInviteClick={onInviteMoreClick && teamMembers.length < 6 ? async () => {
                  // 🎯 Don't pass alreadyInvitedUserIds - let modal fetch fresh from DB
                  onInviteMoreClick(
                    teamChallenge.admin_challenge_id,
                    teamChallenge.admin_challenge?.title || 'Team Challenge',
                    [] // 🎯 Empty array - modal will fetch current members from DB
                  );
                } : undefined}
                onRemoveMember={isHost ? handleRemoveMember : undefined}
                onCancelInvitation={isHost ? async (invitationId: string) => {
                  try {
                    console.log('[TeamHUD] Cancelling invitation:', invitationId);
                    const { supabase } = await import('../../../lib/supabase');
                    
                    const { error } = await supabase
                      .from('team_members')
                      .update({ 
                        challenge_status: 'rejected',
                        active_challenge_id: null 
                      })
                      .eq('id', invitationId);
                    
                    if (error) throw error;
                    
                    console.log('✅ [TeamHUD] Invitation cancelled');
                    
                    if (onRefresh) {
                      console.log('[TeamHUD] Calling onRefresh to reload data...');
                      await onRefresh();
                      setRefreshCounter(prev => prev + 1);
                      console.log('✅ [TeamHUD] Data refreshed - counter incremented');
                    }
                  } catch (error) {
                    console.error('❌ [TeamHUD] Failed to cancel invitation:', error);
                    alert('Failed to cancel invitation. Please try again.');
                  }
                } : undefined}
              />

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

              {/* End Challenge link - tylko dla hosta */}
              {isHost && (
                <div className="text-center pt-2">
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
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
