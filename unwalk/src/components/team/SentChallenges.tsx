import { teamService, type ChallengeAssignment } from '../../lib/auth';
import { getInitials, getColorFromName } from './utils';

interface SentChallengesProps {
  challenges: ChallengeAssignment[];
  onRefresh: () => void;
}

export function SentChallenges({ challenges, onRefresh }: SentChallengesProps) {
  const handleCancelChallenge = async (assignmentId: string) => {
    if (!confirm('Cancel this challenge assignment?')) return;
    
    try {
      const { error } = await teamService.cancelChallengeAssignment(assignmentId);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Failed to cancel challenge:', err);
      alert('Failed to cancel challenge. It may have been already accepted.');
    }
  };

  const getCategoryRank = (assignment: ChallengeAssignment) => {
    const isCompleted = assignment.user_challenge_status === 'completed' || assignment.user_challenge_status === 'claimed';
    const isActive = assignment.status === 'accepted' && !!assignment.user_challenge_id && !isCompleted;

    // active -> pending -> completed -> rejected
    if (isActive) return 0;
    if (assignment.status === 'pending') return 1;
    if (assignment.status === 'accepted' && isCompleted) return 2;
    if (assignment.status === 'rejected') return 3;

    // accepted but not started (no user_challenge_id) should sit between pending and completed
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

  if (challenges.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📤</div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Sent Challenges</h3>
        <p className="text-gray-500 dark:text-white/50 text-sm">
          Send your first challenge to a team member!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedChallenges.map((assignment) => {
        const progress = assignment.current_steps && assignment.challenge_goal_steps
          ? Math.round((assignment.current_steps / assignment.challenge_goal_steps) * 100)
          : 0;

        // ✅ Check if challenge is completed or claimed
        const isCompleted = assignment.user_challenge_status === 'completed' || assignment.user_challenge_status === 'claimed';

        return (
          <div
            key={assignment.id}
            className="bg-gray-50 dark:bg-[#151A25] border border-gray-200 dark:border-white/5 rounded-2xl p-4"
          >
            <div className="flex gap-3 mb-3">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                <img
                  src={assignment.challenge_image_url}
                  alt={assignment.challenge_title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1 truncate">
                  {assignment.challenge_title}
                </h3>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: getColorFromName(assignment.recipient_name) }}
                  >
                    {getInitials(assignment.recipient_name)}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-white/60">
                    {assignment.recipient_name || 'Unknown'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {assignment.status === 'pending' && (
                  <>
                    <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                      Pending
                    </span>
                    <button
                      onClick={() => handleCancelChallenge(assignment.id)}
                      className="text-red-400 hover:text-red-300 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {assignment.status === 'accepted' && (
                  <span className={`${
                    isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'
                  } text-xs font-bold px-2 py-1 rounded whitespace-nowrap`}>
                    {isCompleted ? '✓ Completed' : assignment.user_challenge_id ? 'Active' : 'Accepted'}
                  </span>
                )}
                {assignment.status === 'rejected' && (
                  <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                    Declined
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar - show for active challenges */}
            {assignment.status === 'accepted' && assignment.user_challenge_id && !isCompleted && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/5">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-500 dark:text-white/60">Progress</span>
                  <span className="text-gray-900 dark:text-white font-bold">{progress}%</span>
                </div>
                <div className="bg-gray-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-white/50 mt-1">
                  {assignment.current_steps?.toLocaleString()} / {assignment.challenge_goal_steps.toLocaleString()} steps
                </div>
              </div>
            )}

            {/* Completion info - show for completed challenges */}
            {assignment.status === 'accepted' && isCompleted && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-400">✓ Challenge completed!</span>
                  <span className="text-green-400 font-bold">{progress}%</span>
                </div>
                <div className="bg-gray-200 dark:bg-white/10 rounded-full h-2 overflow-hidden mt-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-white/50 mt-1">
                  {assignment.current_steps?.toLocaleString()} / {assignment.challenge_goal_steps.toLocaleString()} steps
                </div>
              </div>
            )}

            {assignment.message && (
              <p className="text-xs text-gray-600 dark:text-white/50 italic mt-3 bg-gray-100 dark:bg-white/5 rounded-lg p-2">
                "{assignment.message}"
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
