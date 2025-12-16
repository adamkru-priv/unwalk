import { teamService, type ChallengeAssignment } from '../../lib/auth';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { getActiveUserChallenge } from '../../lib/api';
import { getInitials, getColorFromName, formatDuration } from './utils';
import { useToastStore } from '../../stores/useToastStore';

interface ReceivedChallengesProps {
  challenges: ChallengeAssignment[];
  onRefresh: () => void;
}

export function ReceivedChallenges({ challenges, onRefresh }: ReceivedChallengesProps) {
  const setCurrentScreen = useChallengeStore((state) => state.setCurrentScreen);
  const toast = useToastStore();

  const handleStartChallenge = async (assignmentId: string) => {
    try {
      const { error } = await teamService.startChallengeAssignment(assignmentId);
      if (error) throw error;
      
      // Load fresh active challenge and update store
      const activeChallenge = await getActiveUserChallenge();
      if (activeChallenge) {
        useChallengeStore.getState().setActiveChallenge(activeChallenge);
      }
      
      // Refresh team data and redirect to dashboard
      onRefresh();
      setCurrentScreen('dashboard');
    } catch (err: any) {
      console.error('Failed to start challenge:', err);
      alert(err.message || 'Failed to start challenge. You might already have an active challenge.');
    }
  };

  const handleDeclineChallenge = async (assignmentId: string, challengeTitle: string) => {
    if (!confirm(`Decline "${challengeTitle}"?\n\nThis challenge will be removed from your list.`)) {
      return;
    }

    try {
      const { error } = await teamService.declineChallenge(assignmentId);
      if (error) throw error;
      
      toast.addToast({ message: 'Challenge declined', type: 'success' });
      onRefresh();
    } catch (err: any) {
      console.error('Failed to decline challenge:', err);
      toast.addToast({ message: err.message || 'Failed to decline challenge', type: 'error' });
    }
  };

  if (challenges.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📥</div>
        <h3 className="text-xl font-bold text-white mb-2">No Received Challenges</h3>
        <p className="text-white/50 text-sm">
          You haven't received any challenges yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {challenges.map((assignment) => {
        const progress = assignment.current_steps && assignment.challenge_goal_steps
          ? Math.round((assignment.current_steps / assignment.challenge_goal_steps) * 100)
          : 0;

        // Calculate blur - blur until completed
        const isCompleted = assignment.user_challenge_status === 'completed';
        const blurAmount = isCompleted ? 0 : Math.max(0, 20 - (progress * 0.2));

        // Calculate time duration (if started)
        const timeRunning = assignment.user_challenge_started_at 
          ? Math.floor((Date.now() - new Date(assignment.user_challenge_started_at).getTime()) / 1000)
          : null;

        return (
          <div
            key={assignment.id}
            className="bg-[#151A25] border border-white/5 rounded-2xl overflow-hidden"
          >
            {/* Challenge Image with Blur */}
            <div className="relative w-full h-32">
              <img
                src={assignment.challenge_image_url}
                alt={assignment.challenge_title}
                className="w-full h-full object-cover transition-all duration-500"
                style={{ filter: `blur(${blurAmount}px)` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                {assignment.status === 'pending' && (
                  <span className="bg-amber-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    Pending
                  </span>
                )}
                {assignment.status === 'accepted' && !assignment.user_challenge_id && (
                  <span className="bg-blue-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    Accepted
                  </span>
                )}
                {assignment.status === 'accepted' && assignment.user_challenge_id && (
                  <span className={`${
                    assignment.user_challenge_status === 'completed' 
                      ? 'bg-green-500/90' 
                      : 'bg-purple-500/90'
                  } backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full`}>
                    {assignment.user_challenge_status === 'completed' ? '✓ Completed' : 'Active'}
                  </span>
                )}
                {assignment.status === 'rejected' && (
                  <span className="bg-red-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    Declined
                  </span>
                )}
              </div>

              {/* Challenge Title & Sender */}
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="font-bold text-white text-base mb-1.5 truncate drop-shadow-lg">
                  {assignment.challenge_title}
                </h3>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: getColorFromName(assignment.sender_name) }}
                  >
                    {getInitials(assignment.sender_name)}
                  </div>
                  <span className="text-xs text-white/90 drop-shadow">
                    from {assignment.sender_name || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            {/* Challenge Details */}
            <div className="p-4">
              {/* Time & Progress Info */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white/5 rounded-xl p-2.5">
                  <div className="text-xs text-white/50 mb-0.5">Goal</div>
                  <div className="text-sm font-bold text-white">
                    {(assignment.challenge_goal_steps / 1000).toFixed(0)}k steps
                  </div>
                </div>
                {timeRunning !== null && assignment.user_challenge_status === 'active' && (
                  <div className="bg-blue-500/10 rounded-xl p-2.5">
                    <div className="text-xs text-blue-400 mb-0.5">⏱️ Running</div>
                    <div className="text-sm font-bold text-blue-400">
                      {formatDuration(timeRunning)}
                    </div>
                  </div>
                )}
                {isCompleted && assignment.user_challenge_completed_at && assignment.user_challenge_started_at && (
                  <div className="bg-green-500/10 rounded-xl p-2.5">
                    <div className="text-xs text-green-400 mb-0.5">⏱️ Finished in</div>
                    <div className="text-sm font-bold text-green-400">
                      {formatDuration(
                        Math.floor((new Date(assignment.user_challenge_completed_at).getTime() - 
                                   new Date(assignment.user_challenge_started_at).getTime()) / 1000)
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* START & DECLINE BUTTONS - dla zaakceptowanych ale nierozpoczętych */}
              {assignment.status === 'accepted' && !assignment.user_challenge_id && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleStartChallenge(assignment.id)}
                    className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    START Challenge
                  </button>
                  <button
                    onClick={() => handleDeclineChallenge(assignment.id, assignment.challenge_title)}
                    className="w-full text-xs text-white/40 hover:text-red-400 transition-colors py-1"
                  >
                    Decline
                  </button>
                </div>
              )}

              {/* PROGRESS BAR - dla aktywnych */}
              {assignment.status === 'accepted' && assignment.user_challenge_id && assignment.user_challenge_status === 'active' && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-white/60">Progress</span>
                    <span className="text-white font-bold">{progress}%</span>
                  </div>
                  <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-white/50 mt-1 mb-3">
                    {assignment.current_steps?.toLocaleString()} / {assignment.challenge_goal_steps.toLocaleString()} steps
                  </div>
                  
                  {/* VIEW CHALLENGE BUTTON - kliknij aby przejść do dashboard */}
                  <button
                    onClick={() => setCurrentScreen('dashboard')}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    View Challenge
                  </button>
                </div>
              )}

              {/* Message */}
              {assignment.message && (
                <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                  <div className="text-xs text-white/40 mb-1">Message:</div>
                  <p className="text-xs text-white/70 italic">
                    "{assignment.message}"
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
