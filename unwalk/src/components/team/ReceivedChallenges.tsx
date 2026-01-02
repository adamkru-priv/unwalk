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

  const handleAcceptChallenge = async (assignmentId: string) => {
    try {
      const { error } = await teamService.acceptChallengeAssignment(assignmentId);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      console.error('Failed to accept challenge:', err);
      alert('Failed to accept challenge. You might already have an active challenge.');
    }
  };

  const handleRejectChallenge = async (assignmentId: string) => {
    try {
      const { error } = await teamService.rejectChallengeAssignment(assignmentId);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      console.error('Failed to reject challenge:', err);
      alert('Failed to reject challenge. Please try again.');
    }
  };

  const handleStartChallenge = async (assignmentId: string) => {
    try {
      const { error } = await teamService.startChallengeAssignment(assignmentId);
      if (error) throw error;
      
      const activeChallenge = await getActiveUserChallenge();
      if (activeChallenge) {
        useChallengeStore.getState().setActiveChallenge(activeChallenge);
      }
      
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

  const getCategoryRank = (assignment: ChallengeAssignment) => {
    const isCompleted = assignment.user_challenge_status === 'completed' || assignment.user_challenge_status === 'claimed';
    const hasStarted = !!assignment.user_challenge_id;
    const isActive = assignment.status === 'accepted' && hasStarted && !isCompleted && assignment.user_challenge_status === 'active';

    // active - pending - completed - rejected
    if (isActive) return 0;
    if (assignment.status === 'pending') return 1;
    if (assignment.status === 'accepted' && isCompleted) return 2;
    if (assignment.status === 'rejected') return 3;

    // accepted but not started
    if (assignment.status === 'accepted') return 1.5;

    return 99;
  };

  const sortedChallenges = [...challenges].sort((a, b) => {
    const ra = getCategoryRank(a);
    const rb = getCategoryRank(b);
    if (ra !== rb) return ra - rb;

    // tie-breaker: by title (stable-ish)
    return (a.challenge_title || '').localeCompare(b.challenge_title || '');
  });

  const pendingChallenges = sortedChallenges.filter((c) => c.status === 'pending');
  const acceptedChallenges = sortedChallenges.filter((c) => c.status !== 'pending');

  if (challenges.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📥</div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Received Challenges</h3>
        <p className="text-gray-500 dark:text-white/50 text-sm">
          You haven't received any challenges yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PENDING CHALLENGES - Challenges for You with Accept/Decline */}
      {pendingChallenges.length > 0 && (
        <section>
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 border border-purple-300 dark:border-purple-500/30 rounded-3xl p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>🎯</span>
              <span>Challenges for You</span>
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {pendingChallenges.length}
              </span>
            </h2>
            
            <div className="space-y-3">
              {pendingChallenges.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-white/90 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden"
                >
                  <div className="relative h-32">
                    <img
                      src={assignment.challenge_image_url}
                      alt={assignment.challenge_title}
                      className="w-full h-full object-cover transition-all duration-500"
                      style={{ filter: 'blur(20px)' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-3">
                      <div className="text-white flex-1">
                        <div className="text-sm font-bold mb-1 drop-shadow-lg">{assignment.challenge_title}</div>
                        <div className="text-xs text-white/70">
                          {(assignment.challenge_goal_steps / 1000).toFixed(0)}k steps
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: getColorFromName(assignment.sender_name) }}
                      >
                        {getInitials(assignment.sender_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 dark:text-white/60">From</div>
                        <div className="font-bold text-gray-900 dark:text-white text-sm truncate">
                          {assignment.sender_name || 'Team Member'}
                        </div>
                      </div>
                    </div>

                    {assignment.message && (
                      <p className="text-xs text-gray-600 dark:text-white/70 italic mb-3 bg-gray-100 dark:bg-white/5 rounded-lg p-2">
                        "{assignment.message}"
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptChallenge(assignment.id)}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2.5 rounded-xl font-bold text-sm transition-all"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectChallenge(assignment.id)}
                        className="flex-1 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white py-2.5 rounded-xl font-medium text-sm transition-all"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ACCEPTED CHALLENGES - Already accepted/started */}
      {acceptedChallenges.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-400 dark:text-white/60 mb-3 px-1 uppercase tracking-wider">
            Your Challenges
          </h2>
          <div className="space-y-3">
            {acceptedChallenges.map((assignment) => {
              // ✅ DEBUG: Log assignment data
              console.log('🔍 [ReceivedChallenges] Assignment:', {
                title: assignment.challenge_title,
                status: assignment.status,
                user_challenge_id: assignment.user_challenge_id,
                user_challenge_status: assignment.user_challenge_status,
                current_steps: assignment.current_steps,
                started_at: assignment.user_challenge_started_at
              });

              const progress = assignment.current_steps && assignment.challenge_goal_steps
                ? Math.round((assignment.current_steps / assignment.challenge_goal_steps) * 100)
                : 0;

              // Calculate blur - blur until completed or claimed
              const isCompleted = assignment.user_challenge_status === 'completed' || assignment.user_challenge_status === 'claimed';
              const blurAmount = isCompleted ? 0 : Math.max(0, 20 - (progress * 0.2));

              // Calculate time duration (if started)
              const timeRunning = assignment.user_challenge_started_at 
                ? Math.floor((Date.now() - new Date(assignment.user_challenge_started_at).getTime()) / 1000)
                : null;

              // ✅ Check if challenge has been started (has user_challenge_id)
              const hasStarted = !!assignment.user_challenge_id;
              const isActive = hasStarted && assignment.user_challenge_status === 'active';

              // ✅ COMPLETED CHALLENGES - Render kompaktowy widok
              if (hasStarted && isCompleted) {
                return (
                  <div
                    key={assignment.id}
                    className="bg-gray-50 dark:bg-[#151A25] border border-gray-200 dark:border-white/5 rounded-xl p-3"
                  >
                    <div className="flex gap-3 items-center">
                      {/* Small image */}
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={assignment.challenge_image_url}
                          alt={assignment.challenge_title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Challenge info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-0.5 truncate">
                          {assignment.challenge_title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: getColorFromName(assignment.sender_name) }}
                          >
                            {getInitials(assignment.sender_name)}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-white/50">
                            from {assignment.sender_name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Badge */}
                      <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                        ✓ Done
                      </span>
                    </div>
                  </div>
                );
              }

              // ✅ DECLINED CHALLENGES - Render kompaktowy widok (jak completed)
              if (assignment.status === 'rejected' || assignment.user_challenge_status === 'rejected') {
                return (
                  <div
                    key={assignment.id}
                    className="bg-gray-50 dark:bg-[#151A25] border border-gray-200 dark:border-white/5 rounded-xl p-3 opacity-60"
                  >
                    <div className="flex gap-3 items-center">
                      {/* Small image */}
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={assignment.challenge_image_url}
                          alt={assignment.challenge_title}
                          className="w-full h-full object-cover grayscale"
                        />
                      </div>
                      
                      {/* Challenge info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-0.5 truncate">
                          {assignment.challenge_title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: getColorFromName(assignment.sender_name) }}
                          >
                            {getInitials(assignment.sender_name)}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-white/50">
                            from {assignment.sender_name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Badge */}
                      <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                        Declined
                      </span>
                    </div>
                  </div>
                );
              }

              // ✅ ACTIVE / NOT STARTED CHALLENGES - Render duży widok (jak było)
              return (
                <div
                  key={assignment.id}
                  className="bg-gray-50 dark:bg-[#151A25] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden"
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
                        <span className="bg-purple-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                          Active
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
                      <div className="bg-gray-100 dark:bg-white/5 rounded-xl p-2.5">
                        <div className="text-xs text-gray-500 dark:text-white/50 mb-0.5">Goal</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {(assignment.challenge_goal_steps / 1000).toFixed(0)}k steps
                        </div>
                      </div>
                      {timeRunning !== null && isActive && (
                        <div className="bg-blue-500/10 rounded-xl p-2.5">
                          <div className="text-xs text-blue-400 mb-0.5">⏱️ Running</div>
                          <div className="text-sm font-bold text-blue-400">
                            {formatDuration(timeRunning)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* START & DECLINE BUTTONS - dla zaakceptowanych ale nierozpoczętych */}
                    {assignment.status === 'accepted' && !hasStarted && (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleStartChallenge(assignment.id)}
                          className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          START Challenge
                        </button>
                        <button
                          onClick={() => handleDeclineChallenge(assignment.id, assignment.challenge_title)}
                          className="w-full text-xs text-gray-400 dark:text-white/40 hover:text-red-400 transition-colors py-1"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {/* PROGRESS BAR + VIEW BUTTON - tylko dla ACTIVE challenges */}
                    {hasStarted && isActive && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-gray-500 dark:text-white/60">Progress</span>
                          <span className="text-gray-900 dark:text-white font-bold">{progress}%</span>
                        </div>
                        <div className="bg-gray-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-white/50 mt-1 mb-3">
                          {assignment.current_steps?.toLocaleString() || '0'} / {assignment.challenge_goal_steps.toLocaleString()} steps
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
                      <div className="bg-gray-100 dark:bg-white/5 rounded-lg p-2.5 border border-gray-200 dark:border-white/5 mt-3">
                        <div className="text-xs text-gray-400 dark:text-white/40 mb-1">Message:</div>
                        <p className="text-xs text-gray-700 dark:text-white/70 italic">
                          "{assignment.message}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
