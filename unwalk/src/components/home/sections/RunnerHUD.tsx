import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { UserChallenge } from '../../../types';
import { useChallengeStore } from '../../../stores/useChallengeStore';
import { useHealthKit } from '../../../hooks/useHealthKit';
import { updateChallengeProgress } from '../../../lib/api';

interface RunnerHUDProps {
  activeChallenge: UserChallenge | null;
  onClick: () => void;
  xpReward?: number;
  onRefresh?: () => Promise<void>;
}

export function RunnerHUD({ 
  activeChallenge, 
  onClick,
  xpReward = 0,
  onRefresh
}: RunnerHUDProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);
  
  const { isNative, syncSteps, isAuthorized } = useHealthKit();

  const handleAddSteps = async (steps: number) => {
    if (isUpdating || !activeChallenge) return;
    
    try {
      setIsUpdating(true);
      const goalSteps = activeChallenge.admin_challenge?.goal_steps || 0;
      const newSteps = Math.min(activeChallenge.current_steps + steps, goalSteps);
      
      const updatedChallenge = await updateChallengeProgress(activeChallenge.id, newSteps);
      setActiveChallenge(updatedChallenge);

      if (newSteps >= goalSteps && goalSteps > 0) {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error('Failed to update steps:', error);
      alert('Failed to update progress. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // 🎯 OPTIMISTIC UI: Refresh in background without blocking UI
      if (isNative && isAuthorized) {
        await syncSteps();
      }
      
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('[RunnerHUD] Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!activeChallenge) {
    // 🎯 SIMPLIFIED: Compact empty state - just title, description, and CTA
    return (
      <div className="w-full px-4">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl p-6 shadow-xl border border-blue-200 dark:border-blue-500/30">
          {/* Compact Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-4xl">🎯</span>
            </div>
          </div>

          {/* Title & Description (without ? icon - moved to modal) */}
          <div className="text-center mb-5">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
              Ready for a Challenge?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Track your progress with real-time updates
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={onClick}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl active:scale-98 transition-all duration-200"
          >
            Start Challenge →
          </button>
        </div>
      </div>
    );
  }

  const currentSteps = activeChallenge.current_steps || 0;
  const goalSteps = activeChallenge.admin_challenge?.goal_steps || 1;
  const progressPercent = Math.min(100, Math.round((currentSteps / goalSteps) * 100));

  const size = 280;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const calculateDeadline = () => {
    if (!activeChallenge.admin_challenge?.time_limit_hours || !activeChallenge.started_at) {
      return null;
    }
    
    const startTime = new Date(activeChallenge.started_at).getTime();
    const limitMs = activeChallenge.admin_challenge.time_limit_hours * 60 * 60 * 1000;
    const deadlineTime = startTime + limitMs;
    const now = Date.now();
    const remainingMs = deadlineTime - now;
    
    if (remainingMs <= 0) return 'Expired';
    
    const totalMinutes = Math.floor(remainingMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    return `${minutes}m`;
  };

  const deadline = calculateDeadline();

  // Calculate distance metrics
  // @ts-ignore - Reserved for future display
  const distanceKm = (currentSteps * 0.000762).toFixed(2);
  // @ts-ignore - Reserved for future display
  const currentDistanceKm = (currentSteps * 0.000762).toFixed(2);
  // @ts-ignore - Used for display
  const goalDistanceKm = (goalSteps * 0.000762).toFixed(2);
  // @ts-ignore - Reserved for future progress bar
  const progressPercentage = Math.min((currentSteps / goalSteps) * 100, 100);
  // @ts-ignore - timeElapsed reserved for future feature
  const timeElapsed = activeChallenge.active_time_seconds || 0;

  const handleEndChallenge = async () => {
    if (!activeChallenge) return;
    
    if (!confirm('🏁 End this challenge?\n\nThis will mark it as completed and you can claim your rewards.')) return;

    try {
      const { supabase } = await import('../../../lib/supabase');
      
      const { error } = await supabase
        .from('user_challenges')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', activeChallenge.id);
      
      if (error) throw error;
      
      setActiveChallenge(null);
      
      window.location.reload();
    } catch (err) {
      console.error('Failed to end challenge:', err);
      alert('Failed to end challenge. Please try again.');
    }
  };

  return (
    <>
      {showImageModal && activeChallenge?.admin_challenge?.image_url && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
          }}
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowImageModal(false);
              }}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="relative rounded-2xl overflow-hidden bg-black" style={{ height: '70vh' }}>
              {/* 🎯 FIXED: Show clear image at 100%, blurred below 100% */}
              <img
                src={activeChallenge.admin_challenge.image_url}
                alt={activeChallenge.admin_challenge.title}
                className="absolute inset-0 w-full h-full object-cover transition-all duration-1000"
                style={{
                  filter: progressPercent >= 100 ? 'blur(0px)' : 'blur(20px)',
                }}
              />
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 z-20">
                <h2 className="text-3xl font-black text-white drop-shadow-lg mb-4">
                  {activeChallenge.admin_challenge.title}
                </h2>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white/90">Progress</span>
                    <span className="text-2xl font-black text-white">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 shadow-lg"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                
                <div className="text-white/90 text-base font-semibold">
                  {currentSteps.toLocaleString()} / {goalSteps.toLocaleString()} steps
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="w-full px-4" id="active-challenge">
        <div className="bg-white dark:bg-[#151A25] rounded-3xl pt-6 px-6 pb-12 shadow-xl relative">
          <div className="text-center mb-4">
            <h2 className="text-xl font-black text-gray-800 dark:text-white">My Challenge</h2>
          </div>

          <div 
            className="flex justify-center mb-6 cursor-pointer group"
            onClick={handleRefresh}
          >
            <div className="relative transition-transform duration-200 group-hover:scale-105" style={{ width: size, height: size }}>
              {/* 🎯 NEW: Animated background - "filling water" effect */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-400/30 via-purple-400/20 to-transparent transition-all duration-1000 ease-out"
                  style={{ 
                    height: `${progressPercent}%`,
                    animation: 'wave 3s ease-in-out infinite'
                  }}
                />
                {/* 🎯 Floating footsteps animation */}
                {progressPercent > 10 && (
                  <>
                    <div className="absolute bottom-[20%] left-[30%] text-2xl animate-float" style={{ animationDelay: '0s' }}>
                      👣
                    </div>
                    <div className="absolute bottom-[40%] right-[25%] text-xl animate-float" style={{ animationDelay: '1s' }}>
                      👣
                    </div>
                    <div className="absolute bottom-[60%] left-[40%] text-lg animate-float" style={{ animationDelay: '2s', opacity: 0.6 }}>
                      👣
                    </div>
                  </>
                )}
              </div>

              <svg className="transform -rotate-90 relative z-10" width={size} height={size}>
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
                  stroke="url(#gradient)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))'
                  }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <div className="text-5xl font-black text-gray-900 dark:text-white mb-1">
                  {currentSteps.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold">
                  / {goalSteps.toLocaleString()} steps
                </div>
                <div className="mt-2 text-lg font-black text-blue-600 dark:text-blue-400">
                  {progressPercent}%
                </div>
                {isRefreshing && (
                  <div className="mt-2 text-xs text-blue-400 dark:text-blue-300 animate-pulse">
                    Updating...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-center mb-4">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
              {activeChallenge.admin_challenge?.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Goal: {goalSteps.toLocaleString()} steps • Reward: {xpReward} XP
            </p>
            
            {/* ✅ TYLKO DEADLINE - jak w Team Challenge */}
            {deadline && (
              <p className={`text-sm font-medium mt-1 ${deadline === 'Expired' ? 'text-red-500' : 'text-orange-500'}`}>
                ⏱️ {deadline} left
              </p>
            )}
            {!deadline && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ⏱️ Unlimited Time
              </p>
            )}
          </div>

          {/* 🎯 NEW: Challenge from - ALWAYS VISIBLE if assigned by someone */}
          {activeChallenge.assigned_by && (
            <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-xl">🤝</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold uppercase tracking-wide">Challenge from</div>
                  <div className="text-base text-gray-900 dark:text-white font-bold truncate">
                    {activeChallenge.assigned_by_name || 'Team Member'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl active:scale-98 transition-all duration-200 flex items-center justify-center gap-2 mb-4"
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
              {activeChallenge.admin_challenge?.image_url && !activeChallenge.admin_challenge.image_url.includes('placeholder') ? (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImageModal(true);
                  }}
                  className="relative h-48 rounded-xl overflow-hidden cursor-pointer group/img"
                >
                  <div 
                    className="absolute inset-0 w-full h-full"
                    style={{
                      backgroundImage: `url(${activeChallenge.admin_challenge.image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'blur(20px)',
                    }}
                  />
                  
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                    <h4 className="text-white font-black text-lg">{activeChallenge.admin_challenge.title}</h4>
                  </div>
                  
                  <div className="absolute top-3 right-3 opacity-0 group-hover/img:opacity-100 transition-opacity">
                    <div className="bg-black/80 rounded-lg px-3 py-2 text-white text-xs font-bold">
                      🔍 Click to enlarge
                    </div>
                  </div>
                </div>
              ) : activeChallenge.admin_challenge?.image_url?.includes('placeholder') ? (
                <div className="h-48 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex flex-col items-center justify-center border border-blue-400/30">
                  <span className="text-6xl mb-3">🎯</span>
                  <h4 className="text-gray-900 dark:text-white font-black text-lg">{activeChallenge.admin_challenge.title}</h4>
                </div>
              ) : null}

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

              {/* End Challenge link - tylko w rozwiniętych details */}
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
