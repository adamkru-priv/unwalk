interface StepsHUDProps {
  todaySteps: number;
  dailyStepGoal: number; // 🎯 NEW: Daily step goal (default 10,000)
  onClick: () => void;
  onDailyTipClick?: () => void; // 🆕 Callback do otwierania Daily Tip
}

export function StepsHUD({ todaySteps, dailyStepGoal = 10000, onClick, onDailyTipClick }: StepsHUDProps) {
  const progressPercent = Math.min(100, Math.round((todaySteps / dailyStepGoal) * 100));

  // Calculate SVG circle properties - same as RunnerHUD/TeamHUD
  const size = 280;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="w-full px-4">
      <div 
        className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl relative"
      >
        {/* 💡 Daily Tip Badge - prawy górny róg */}
        {onDailyTipClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDailyTipClick();
            }}
            className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-2 rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-1.5 z-10"
          >
            <span className="text-sm">💡</span>
            Daily Tip
          </button>
        )}

        {/* Label above the circle */}
        <div className="text-center mb-4" onClick={onClick}>
          <h3 className="text-xl font-black text-gray-800 dark:text-white">
            My Steps
          </h3>
        </div>

        {/* Giant Progress Ring */}
        <div className="flex justify-center mb-6" onClick={onClick}>
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
              {/* Progress ring - Green gradient for steps */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="url(#gradient-steps)"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.5))'
                }}
              />
              {/* Gradient definition - Green for daily steps */}
              <defs>
                <linearGradient id="gradient-steps" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#84cc16" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center content - Today's Steps */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-black text-gray-900 dark:text-white mb-1">
                {todaySteps.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold">
                / {dailyStepGoal.toLocaleString()} steps
              </div>
              <div className="mt-2 text-lg font-black text-green-600 dark:text-green-400">
                {progressPercent}%
              </div>
            </div>
          </div>
        </div>

        {/* Today's Goal Label */}
        <div className="text-center mb-4" onClick={onClick}>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
            Today's Goal
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {progressPercent >= 100 ? '🎉 Goal completed!' : `${(dailyStepGoal - todaySteps).toLocaleString()} steps to go`}
          </p>
        </div>

        {/* Simple CTA Button */}
        <button 
          onClick={onClick}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl active:scale-98 transition-all duration-200"
        >
          View Details
        </button>
      </div>
    </div>
  );
}