import { teamService, type ChallengeAssignment } from '../../lib/auth';
import { getInitials, getColorFromName, formatDuration } from './utils';
import { useState } from 'react';
import { useToastStore } from '../../stores/useToastStore';
import { createPortal } from 'react-dom';

interface SentChallengesProps {
  challenges: ChallengeAssignment[];
  onRefresh: () => void;
}

export function SentChallenges({ challenges, onRefresh }: SentChallengesProps) {
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const toast = useToastStore();

  const handleCancelChallenge = async (assignmentId: string) => {
    if (!confirm('Cancel this challenge assignment?')) return;
    
    try {
      const { error } = await teamService.cancelChallengeAssignment(assignmentId);
      if (error) throw error;
      toast.addToast({ message: 'Challenge cancelled', type: 'success' });
      onRefresh();
    } catch (err) {
      console.error('Failed to cancel challenge:', err);
      alert('Failed to cancel challenge. It may have been already accepted.');
    }
  };

  // 🎯 NEW: Delete completed/cancelled challenges
  const handleDeleteChallenge = async (assignmentId: string, challengeTitle: string) => {
    if (!confirm(`Delete "${challengeTitle}"?\n\nThis will remove it from your sent challenges list.`)) return;
    
    try {
      const { supabase } = await import('../../lib/supabase');
      
      const { error } = await supabase
        .from('challenge_assignments')
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
      
      toast.addToast({ message: 'Challenge deleted', type: 'success' });
      onRefresh();
    } catch (err) {
      console.error('Failed to delete challenge:', err);
      toast.addToast({ message: 'Failed to delete challenge', type: 'error' });
    }
  };

  // 🎯 NEW: Calculate duration between start and end
  const calculateDuration = (startedAt: string | null | undefined, completedAt: string | null | undefined) => {
    if (!startedAt) return null;
    
    const endTime = completedAt ? new Date(completedAt).getTime() : Date.now();
    const startTime = new Date(startedAt).getTime();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);
    
    return formatDuration(durationSeconds);
  };

  // 🎯 NEW: Format date with time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    <>
      {/* 🎯 NEW: Image Modal */}
      {expandedImageUrl && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/95"
          onClick={() => setExpandedImageUrl(null)}
        >
          <div className="relative max-w-2xl w-full max-h-[70vh]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedImageUrl(null);
              }}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <img 
              src={expandedImageUrl} 
              alt="Challenge" 
              className="w-full h-full object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>,
        document.body
      )}

      <div className="space-y-3">
        {sortedChallenges.map((assignment) => {
          const progress = assignment.current_steps && assignment.challenge_goal_steps
            ? Math.round((assignment.current_steps / assignment.challenge_goal_steps) * 100)
            : 0;

          const isCompleted = assignment.user_challenge_status === 'completed' || assignment.user_challenge_status === 'claimed';
          const isRejected = assignment.status === 'rejected';
          const isActive = assignment.status === 'accepted' && assignment.user_challenge_id && !isCompleted;
          const isPending = assignment.status === 'pending';
          
          // 🎯 NEW: Calculate duration and format dates
          const duration = calculateDuration(assignment.user_challenge_started_at, assignment.user_challenge_completed_at);
          const canDelete = isCompleted || isRejected;
          const canCancel = isPending || (isActive && progress < 100);

          return (
            <div
              key={assignment.id}
              className="relative bg-gray-50 dark:bg-[#151A25] border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden"
            >
              {/* 🎯 Swipe to delete - for completed/rejected challenges */}
              {canDelete && (
                <div
                  className={`absolute inset-0 bg-red-500 flex items-center justify-end px-6 transition-transform duration-200 ${
                    swipedItemId === assignment.id ? 'translate-x-0' : 'translate-x-full'
                  }`}
                >
                  <button
                    onClick={() => handleDeleteChallenge(assignment.id, assignment.challenge_title)}
                    className="text-white font-bold text-sm"
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}

              {/* Main content */}
              <div
                className={`relative bg-gray-50 dark:bg-[#151A25] p-4 transition-transform duration-200 ${
                  swipedItemId === assignment.id && canDelete ? '-translate-x-20' : 'translate-x-0'
                }`}
                onTouchStart={(e) => {
                  if (!canDelete) return;
                  const touch = e.touches[0];
                  (e.currentTarget as any)._touchStart = touch.clientX;
                }}
                onTouchMove={(e) => {
                  if (!canDelete) return;
                  const touch = e.touches[0];
                  const start = (e.currentTarget as any)._touchStart;
                  if (start) {
                    const diff = start - touch.clientX;
                    if (diff > 50) {
                      setSwipedItemId(assignment.id);
                    } else if (diff < -10) {
                      setSwipedItemId(null);
                    }
                  }
                }}
                onTouchEnd={() => {
                  if (!canDelete) return;
                  (event!.currentTarget as any)._touchStart = null;
                }}
                onClick={() => {
                  if (swipedItemId === assignment.id) {
                    setSwipedItemId(null);
                  }
                }}
              >
                {/* Compact unified layout */}
                <div className="flex gap-3 items-center">
                  {/* Challenge image - fixed size - 🎯 CLICKABLE */}
                  <div 
                    className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedImageUrl(assignment.challenge_image_url);
                    }}
                  >
                    <img
                      src={assignment.challenge_image_url}
                      alt={assignment.challenge_title}
                      className="w-full h-full object-cover"
                    />
                    {/* 🎯 Zoom icon on hover */}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center transition-all">
                      <svg className="w-5 h-5 text-white opacity-0 hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </div>
                  </div>

                  {/* Challenge info - grows to fill space */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-0.5 truncate">
                      {assignment.challenge_title}
                    </h3>
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: getColorFromName(assignment.recipient_name) }}
                      >
                        {getInitials(assignment.recipient_name)}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-white/50 truncate">
                        to {assignment.recipient_name || 'Unknown'}
                      </span>
                    </div>
                    
                    {/* Clean info without emojis */}
                    <div className="text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
                      <div>
                        {(assignment.challenge_goal_steps / 1000).toFixed(0)}k steps
                        {assignment.challenge_time_limit_hours && (
                          <span className="ml-2">• {assignment.challenge_time_limit_hours}h</span>
                        )}
                      </div>
                      
                      {assignment.user_challenge_started_at && duration && (
                        <div>Duration: {duration}</div>
                      )}
                      
                      {assignment.user_challenge_started_at && (
                        <div className="truncate">
                          Started: {formatDateTime(assignment.user_challenge_started_at)}
                        </div>
                      )}
                      
                      {assignment.user_challenge_completed_at && (
                        <div className="truncate">
                          Finished: {formatDateTime(assignment.user_challenge_completed_at)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status badge - fixed width */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {isPending && (
                      <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                        Pending
                      </span>
                    )}
                    {isActive && (
                      <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                        {progress}%
                      </span>
                    )}
                    {isCompleted && (
                      <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                        Done
                      </span>
                    )}
                    {isRejected && (
                      <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                        Declined
                      </span>
                    )}
                    
                    {canCancel && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelChallenge(assignment.id);
                        }}
                        className="text-red-400 hover:text-red-300 text-xs font-bold"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
