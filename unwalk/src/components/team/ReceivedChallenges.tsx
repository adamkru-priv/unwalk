import { teamService, type ChallengeAssignment } from '../../lib/auth';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { getActiveUserChallenge } from '../../lib/api';
import { getInitials, getColorFromName, formatDuration } from './utils';
import { useToastStore } from '../../stores/useToastStore';
import { useState } from 'react';
import { createPortal } from 'react-dom';

interface ReceivedChallengesProps {
  challenges: ChallengeAssignment[];
  onRefresh: () => void;
}

export function ReceivedChallenges({ challenges, onRefresh }: ReceivedChallengesProps) {
  const setCurrentScreen = useChallengeStore((state) => state.setCurrentScreen);
  const toast = useToastStore();
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);

  const handleAcceptChallenge = async (assignmentId: string) => {
    try {
      const { error: acceptError } = await teamService.acceptChallengeAssignment(assignmentId);
      if (acceptError) throw acceptError;
      
      const { error: startError } = await teamService.startChallengeAssignment(assignmentId);
      if (startError) throw startError;
      
      const activeChallenge = await getActiveUserChallenge();
      if (activeChallenge) {
        useChallengeStore.getState().setActiveChallenge(activeChallenge);
      }
      
      toast.addToast({ message: 'Challenge started! 🚀', type: 'success' });
      setCurrentScreen('home');
      
      onRefresh();
    } catch (err: any) {
      console.error('Failed to accept/start challenge:', err);
      alert(err.message || 'Failed to start challenge. You might already have an active challenge.');
    }
  };

  const handleRejectChallenge = async (assignmentId: string) => {
    try {
      const { error } = await teamService.rejectChallengeAssignment(assignmentId);
      if (error) throw error;
      
      toast.addToast({ message: 'Challenge declined', type: 'success' });
      onRefresh();
    } catch (err: any) {
      console.error('Failed to reject challenge:', err);
      alert('Failed to reject challenge. Please try again.');
    }
  };

  const handleDeleteChallenge = async (assignmentId: string, challengeTitle: string) => {
    if (!confirm(`Delete "${challengeTitle}"?\n\nThis will remove it from your received challenges list.`)) return;
    
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

  const calculateDuration = (startedAt: string | null | undefined, completedAt: string | null | undefined) => {
    if (!startedAt) return null;
    
    const endTime = completedAt ? new Date(completedAt).getTime() : Date.now();
    const startTime = new Date(startedAt).getTime();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);
    
    return formatDuration(durationSeconds);
  };

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
    const hasStarted = !!assignment.user_challenge_id;
    const isActive = assignment.status === 'accepted' && hasStarted && !isCompleted && assignment.user_challenge_status === 'active';

    if (isActive) return 0;
    if (assignment.status === 'pending') return 1;
    if (assignment.status === 'accepted' && isCompleted) return 2;
    if (assignment.status === 'rejected') return 3;

    if (assignment.status === 'accepted') return 1.5;

    return 99;
  };

  const sortedChallenges = [...challenges].sort((a, b) => {
    const ra = getCategoryRank(a);
    const rb = getCategoryRank(b);
    if (ra !== rb) return ra - rb;

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
    <>
      {expandedImageUrl && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/95"
          onClick={() => setExpandedImageUrl(null)}
        >
          <div className="relative w-full max-w-lg max-h-[60vh]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedImageUrl(null);
              }}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <img 
              src={expandedImageUrl} 
              alt="Challenge" 
              className="w-full h-auto max-h-[60vh] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>,
        document.body
      )}

      <div className="space-y-6">
        {/* PENDING CHALLENGES - Challenges for You with Accept/Decline */}
        {pendingChallenges.length > 0 && (
          <section>
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 border border-purple-300 dark:border-purple-500/30 rounded-3xl p-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
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
                        onClick={() => setExpandedImageUrl(assignment.challenge_image_url)}
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

        {/* ACCEPTED CHALLENGES - Clean list without emojis */}
        {acceptedChallenges.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-400 dark:text-white/60 mb-3 px-1 uppercase tracking-wider">
              Your Challenges
            </h2>
            <div className="space-y-3">
              {acceptedChallenges.map((assignment) => {
                const progress = assignment.current_steps && assignment.challenge_goal_steps
                  ? Math.round((assignment.current_steps / assignment.challenge_goal_steps) * 100)
                  : 0;

                const isCompleted = assignment.user_challenge_status === 'completed' || assignment.user_challenge_status === 'claimed';
                const isRejected = assignment.status === 'rejected' || assignment.user_challenge_status === 'rejected';
                const hasStarted = !!assignment.user_challenge_id;
                const isActive = hasStarted && assignment.user_challenge_status === 'active';

                const duration = calculateDuration(assignment.user_challenge_started_at, assignment.user_challenge_completed_at);
                const canDelete = isCompleted || isRejected;

                return (
                  <div
                    key={assignment.id}
                    className="relative bg-gray-50 dark:bg-[#151A25] border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden"
                  >
                    {/* Swipe to delete */}
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
                          Delete
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
                      {/* Clean layout */}
                      <div className="flex gap-3 items-center">
                        {/* Challenge image */}
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
                        </div>

                        {/* Challenge info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-0.5 truncate">
                            {assignment.challenge_title}
                          </h3>
                          <div className="flex items-center gap-2 mb-1">
                            <div 
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: getColorFromName(assignment.sender_name) }}
                            >
                              {getInitials(assignment.sender_name)}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-white/50 truncate">
                              from {assignment.sender_name || 'Unknown'}
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

                        {/* Status badge */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
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
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
