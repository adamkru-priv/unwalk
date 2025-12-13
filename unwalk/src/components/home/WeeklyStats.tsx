import { useMemo } from 'react';

interface WeeklyStatsProps {
  dailyGoal?: number;
}

export function WeeklyStats({ dailyGoal = 10000 }: WeeklyStatsProps) {
  // Mock data - later from Apple Health / Google Fit
  const weekData = useMemo(() => {
    const today = new Date();
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Mock steps data - replace with real data from Health API
      const steps = Math.floor(Math.random() * 15000);
      const distance = (steps * 0.8 / 1000).toFixed(1); // km
      
      days.push({
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        steps,
        distance,
        goalReached: steps >= dailyGoal,
      });
    }
    
    return days;
  }, [dailyGoal]);

  const totalSteps = weekData.reduce((sum, day) => sum + day.steps, 0);
  const avgSteps = Math.floor(totalSteps / 7);
  const maxSteps = Math.max(...weekData.map(d => d.steps));
  const daysGoalReached = weekData.filter(d => d.goalReached).length;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">📊 Last 7 Days</h3>
        <div className="text-sm text-gray-400">
          {daysGoalReached}/7 days goal reached
        </div>
      </div>

      {/* Chart */}
      <div className="mb-4">
        <div className="flex items-end justify-between gap-2 h-40">
          {weekData.map((day, index) => {
            const heightPercent = maxSteps > 0 ? (day.steps / maxSteps) * 100 : 0;
            const isToday = index === 6;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                {/* Steps count */}
                <div className="text-xs text-gray-400 font-medium mb-1">
                  {day.steps >= 1000 ? `${(day.steps / 1000).toFixed(1)}k` : day.steps}
                </div>
                
                {/* Bar */}
                <div className="w-full flex flex-col justify-end flex-1">
                  <div
                    className={`w-full rounded-t-lg transition-all ${
                      day.goalReached
                        ? 'bg-gradient-to-t from-green-500 to-green-400'
                        : 'bg-gradient-to-t from-red-500/70 to-red-400/70'
                    } ${isToday ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-800' : ''}`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                
                {/* Day label */}
                <div className={`text-xs font-medium ${isToday ? 'text-blue-400' : 'text-gray-400'}`}>
                  {day.dayName}
                </div>
                
                {/* Distance */}
                <div className="text-xs text-gray-500">
                  {day.distance}km
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{totalSteps.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">Total Steps</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{avgSteps.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">Daily Average</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{((totalSteps * 0.8) / 1000).toFixed(1)}km</div>
          <div className="text-xs text-gray-400 mt-1">Distance</div>
        </div>
      </div>

      {/* Goal progress bar */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-400">Weekly Goal Progress</span>
          <span className="text-white font-medium">
            {Math.round((daysGoalReached / 7) * 100)}%
          </span>
        </div>
        <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-400 to-green-500 h-full rounded-full transition-all"
            style={{ width: `${(daysGoalReached / 7) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
