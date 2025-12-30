import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (activeChallenge) {
      handleRefresh();
    }
  }, [activeChallenge?.id]);

  if (!activeChallenge) {
    const size = 280;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    
    return (
      <div className="w-full px-4">
        <div className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl">
          <div className="text-center mb-4">
            <h2 className="text-xl font-black text-gray-800 dark:text-white">My Challenge</h2>
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
                <div className="text-6xl mb-2">🏃</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold text-center px-4">
                  No Active Challenge
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mb-4">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
              Solo Challenges
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Start your personal journey
            </p>
          </div>

          <button
            onClick={onClick}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl active:scale-98 transition-all duration-200"
          >
            🏆 Browse Challenges
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

  const distanceKm = (currentSteps * 0.000762).toFixed(2);
  const goalDistanceKm = (goalSteps * 0.000762).toFixed(2);

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
              <div 
                className="absolute inset-0 w-full h-full"
                style={{
                  backgroundImage: `url(${activeChallenge.admin_challenge.image_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(20px)',
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

      <div className="w-full px-4">
        <div className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl relative">
          <div className="text-center mb-4">
            <h2 className="text-xl font-black text-gray-800 dark:text-white">My Challenge</h2>
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

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isRefreshing ? (
                  <div className="text-blue-600 dark:text-blue-400 animate-spin">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                ) : (
                  <>
                    <div className="text-5xl font-black text-gray-900 dark:text-white mb-1">
                      {currentSteps.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold">
                      / {goalSteps.toLocaleString()} steps
                    </div>
                    <div className="mt-2 text-lg font-black text-blue-600 dark:text-blue-400">
                      {progressPercent}%
                    </div>
                  </>
                )}
                <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  👆 Tap to refresh
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mb-4">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
              {activeChallenge.admin_challenge?.title}
            </h3>
          </div>

          <div className="flex items-center justify-center gap-6 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">💎</span>
              <div>
                <div className="font-black text-gray-900 dark:text-white">{xpReward} XP</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Reward</div>
              </div>
            </div>

            <div className="w-px h-8 bg-gray-300 dark:bg-gray-700"></div>

            {deadline && (
              <div className="flex items-center gap-2">
                <span className="text-lg">⏱️</span>
                <div>
                  <div className="font-black text-gray-900 dark:text-white">{deadline}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Deadline</div>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl active:scale-98 transition-all duration-200 flex items-center justify-center gap-2"
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
              {activeChallenge.admin_challenge?.image_url && (
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
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-gray-800 rounded-xl p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase mb-1">Distance</div>
                  <div className="text-xl font-black text-gray-900 dark:text-white">{distanceKm} km</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">/ {goalDistanceKm} km</div>
                </div>

                <div className="bg-gray-50 dark:bg-[#0B101B] border border-gray-200 dark:border-gray-800 rounded-xl p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase mb-1">Time</div>
                  <div className="text-xl font-black text-gray-900 dark:text-white">
                    {Math.floor(timeElapsed / 3600)}h {Math.floor((timeElapsed % 3600) / 60)}m
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">active</div>
                </div>

                <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-xl p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase mb-1">Reward</div>
                  <div className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-1">
                    💎 {xpReward}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">on completion</div>
                </div>

                {deadline && (
                  <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase mb-1">Deadline</div>
                    <div className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-1">
                      ⏱️ {deadline}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">remaining</div>
                  </div>
                )}
              </div>

              <div className="pt-2 space-y-2">
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

          {activeChallenge.assigned_by && (
            <div className="mt-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🤝</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase">Challenge from</div>
                  <div className="text-sm text-gray-900 dark:text-white font-bold truncate">
                    {activeChallenge.assigned_by_name || 'Team Member'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
