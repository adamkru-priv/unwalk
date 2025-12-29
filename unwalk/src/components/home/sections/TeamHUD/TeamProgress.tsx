interface TeamProgressProps {
  currentSteps: number;
  goalSteps: number;
  points: number;
}

export function TeamProgress({ currentSteps, goalSteps, points }: TeamProgressProps) {
  const progressPercentage = Math.min((currentSteps / goalSteps) * 100, 100);

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-32 h-32 transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="64"
          cy="64"
          r="56"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-white/10"
        />
        {/* Progress circle */}
        <circle
          cx="64"
          cy="64"
          r="56"
          fill="none"
          stroke="url(#teamGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 56}`}
          strokeDashoffset={`${2 * Math.PI * 56 * (1 - progressPercentage / 100)}`}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="teamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-white">
          {progressPercentage.toFixed(0)}%
        </div>
        <div className="text-xs text-white/60 mt-1">
          {currentSteps.toLocaleString()} / {goalSteps.toLocaleString()}
        </div>
        <div className="text-sm text-blue-300 font-semibold mt-1 flex items-center gap-1">
          <span>🏆</span>
          <span>{points} XP</span>
        </div>
      </div>
    </div>
  );
}
