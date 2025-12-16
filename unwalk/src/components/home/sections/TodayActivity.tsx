interface TodayActivityProps {
  todaySteps: number;
  dailyStepGoal: number;
  isGuest: boolean;
}

export function TodayActivity({ todaySteps, dailyStepGoal, isGuest }: TodayActivityProps) {
  if (isGuest) return null;

  const actualDailyGoal = dailyStepGoal || 10000;
  const dailyGoalProgress = Math.min(100, Math.round((todaySteps / actualDailyGoal) * 100));

  return (
    <section className="px-5">
      <div className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black text-gray-900 dark:text-white">{todaySteps.toLocaleString()}</div>
            <div className="text-xs text-gray-500 dark:text-white/60 uppercase tracking-wide font-bold">steps</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-white/50">Daily Goal</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{dailyGoalProgress}%</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500" 
              style={{ width: `${dailyGoalProgress}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
