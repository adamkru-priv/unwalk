import type { UserChallenge } from '../../../types';

interface RunnerHUDProps {
  activeChallenge: UserChallenge | null;
  onClick: () => void;
  xpReward?: number;
}

export function RunnerHUD({ 
  activeChallenge, 
  onClick,
  xpReward = 0
}: RunnerHUDProps) {
  if (!activeChallenge) {
    // No active challenge - show empty state
    return (
      <div className="w-full px-4">
        <div className="bg-white dark:bg-[#151A25] rounded-3xl p-8 shadow-xl">
          <div className="text-center">
            <div className="text-6xl mb-4">🏃</div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
              No Active Challenge
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start a challenge to see your progress
            </p>
            <button
              onClick={onClick}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-2xl font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-transform"
            >
              Browse Challenges
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentSteps = activeChallenge.current_steps || 0;
  const goalSteps = activeChallenge.admin_challenge?.goal_steps || 1;
  const progressPercent = Math.min(100, Math.round((currentSteps / goalSteps) * 100));

  // Calculate SVG circle properties for progress ring
  const size = 280;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Calculate deadline (hours remaining)
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
    
    // If more than 1 day, show days and hours
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    
    // If less than 1 day, show hours and minutes
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    // If less than 1 hour, show only minutes
    return `${minutes}m`;
  };

  const deadline = calculateDeadline();

  return (
    <div className="w-full px-4">
      <div 
        className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl cursor-pointer"
        onClick={onClick}
      >
        {/* Giant Progress Ring */}
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
              {/* Progress ring */}
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
              {/* Gradient definition */}
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center content - Steps */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-black text-gray-900 dark:text-white mb-1">
                {currentSteps.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold">
                / {goalSteps.toLocaleString()} steps
              </div>
              <div className="mt-2 text-lg font-black text-blue-600 dark:text-blue-400">
                {progressPercent}%
              </div>
            </div>
          </div>
        </div>

        {/* Challenge Title */}
        <div className="text-center mb-4">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
            {activeChallenge.admin_challenge?.title}
          </h3>
        </div>

        {/* Compact Stats Row */}
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

        {/* Simple CTA Button */}
        <button 
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl active:scale-98 transition-all duration-200"
        >
          View Details
        </button>

        {/* Social Challenge Badge (if applicable) */}
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
  );
}
