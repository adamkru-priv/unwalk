import { useState, useEffect } from 'react';
import { useHealthKit } from '../../hooks/useHealthKit';
import { useChallengeStore } from '../../stores/useChallengeStore';

interface ChartBarData {
  label: string;
  steps: number;
  isCurrentPeriod: boolean;
}

interface ChartSection {
  title: string;
  data: ChartBarData[];
  totalSteps: number;
  avgSteps: number;
  avgLabel: string;
}

export function StatsTrendsTab() {
  const [weekData, setWeekData] = useState<ChartSection | null>(null);
  const [monthData, setMonthData] = useState<ChartSection | null>(null);
  const [yearData, setYearData] = useState<ChartSection | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { getStepsHistory } = useHealthKit();
  const todaySteps = useChallengeStore((s) => s.todaySteps);

  useEffect(() => {
    loadAllChartData();
  }, [todaySteps]);

  const loadAllChartData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadWeekData(),
        loadMonthData(),
        loadYearData()
      ]);
    } catch (error) {
      console.error('❌ Failed to load chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeekData = async () => {
    const history = await getStepsHistory(7);
    const todayDateString = new Date().toISOString().split('T')[0];
    const data: ChartBarData[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateString = date.toISOString().split('T')[0];
      const steps = dateString === todayDateString ? todaySteps : (history[i]?.steps || 0);
      
      const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const label = dayNames[date.getDay()];
      const isCurrentPeriod = dateString === todayDateString;
      
      data.push({ label, steps, isCurrentPeriod });
    }
    
    const totalSteps = data.reduce((sum, d) => sum + d.steps, 0);
    const avgSteps = Math.round(totalSteps / data.length);
    
    setWeekData({
      title: 'Week',
      data,
      totalSteps,
      avgSteps,
      avgLabel: 'Daily Average'
    });
  };

  const loadMonthData = async () => {
    const history = await getStepsHistory(365);
    const todayDateString = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthSteps: number[] = new Array(12).fill(0);
    
    for (let i = 0; i < history.length; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (history.length - 1 - i));
      const month = date.getMonth();
      const year = date.getFullYear();
      
      if (year === currentYear) {
        const dateString = date.toISOString().split('T')[0];
        const steps = dateString === todayDateString ? todaySteps : (history[i]?.steps || 0);
        monthSteps[month] += steps;
      }
    }
    
    const data: ChartBarData[] = monthNames.map((label, index) => ({
      label,
      steps: monthSteps[index],
      isCurrentPeriod: index === currentMonth
    }));
    
    const totalSteps = data.reduce((sum, d) => sum + d.steps, 0);
    const avgSteps = Math.round(totalSteps / data.length);
    
    setMonthData({
      title: 'Month',
      data,
      totalSteps,
      avgSteps,
      avgLabel: 'Monthly Average'
    });
  };

  const loadYearData = async () => {
    const history = await getStepsHistory(365 * 3);
    const todayDateString = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    
    const yearStepsMap = new Map<number, number>();
    
    for (let i = 0; i < history.length; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (history.length - 1 - i));
      const year = date.getFullYear();
      const dateString = date.toISOString().split('T')[0];
      const steps = dateString === todayDateString ? todaySteps : (history[i]?.steps || 0);
      
      yearStepsMap.set(year, (yearStepsMap.get(year) || 0) + steps);
    }
    
    // 🎯 Filter: only show 2025 and 2026
    const data: ChartBarData[] = Array.from(yearStepsMap.entries())
      .filter(([year]) => year >= 2025) // Only 2025 and newer
      .sort((a, b) => a[0] - b[0])
      .map(([year, steps]) => ({
        label: year.toString(),
        steps,
        isCurrentPeriod: year === currentYear
      }));
    
    const totalSteps = data.reduce((sum, d) => sum + d.steps, 0);
    const avgSteps = Math.round(totalSteps / data.length);
    
    setYearData({
      title: 'Year',
      data,
      totalSteps,
      avgSteps,
      avgLabel: 'Yearly Average'
    });
  };

  const renderChart = (section: ChartSection | null) => {
    if (!section) return null;
    
    const maxSteps = Math.max(...section.data.map(d => d.steps), 1);
    
    return (
      <div className="bg-white dark:bg-[#151A25] rounded-2xl p-5 border border-gray-200 dark:border-white/5">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{section.title}</h3>
        
        <div className="relative mb-4" style={{ height: '212px' }}>
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-2" style={{ height: '168px' }}>
            {section.data.map((bar, index) => {
              const heightPx = maxSteps > 0 ? (bar.steps / maxSteps) * 148 : 0;
              
              return (
                <div key={index} className="flex flex-col-reverse items-center gap-1" style={{ width: '40px' }}>
                  <div className={`text-[10px] font-bold ${
                    bar.isCurrentPeriod
                      ? 'text-blue-500 dark:text-blue-400' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {bar.label}
                  </div>
                  
                  {/* Bar with value on top */}
                  <div className="w-full flex flex-col items-center">
                    {bar.steps > 0 && (
                      <div className="text-[9px] font-bold text-gray-600 dark:text-gray-300 mb-1">
                        {bar.steps >= 1000 ? `${Math.round(bar.steps / 1000)}k` : bar.steps}
                      </div>
                    )}
                    <div 
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        bar.isCurrentPeriod
                          ? 'bg-gradient-to-t from-blue-500 to-blue-400' 
                          : 'bg-gradient-to-t from-blue-500/70 to-blue-400/70'
                      }`}
                      style={{ 
                        height: `${Math.max(heightPx, bar.steps > 0 ? 8 : 2)}px`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-white/5">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Steps</div>
            <div className="text-xl font-black text-gray-900 dark:text-white">
              {section.totalSteps.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {renderChart(weekData)}
      {renderChart(monthData)}
      {renderChart(yearData)}
    </div>
  );
}
