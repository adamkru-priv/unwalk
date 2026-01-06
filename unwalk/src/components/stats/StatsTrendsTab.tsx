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
    
    // 🎯 Get data from January 2025 onwards
    const startYear = 2025;
    const startMonth = 0; // January
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData: ChartBarData[] = [];
    
    // Calculate how many months from Jan 2025 to now
    const monthsSinceStart = (currentYear - startYear) * 12 + (currentMonth - startMonth) + 1;
    
    for (let i = 0; i < monthsSinceStart; i++) {
      const year = startYear + Math.floor((startMonth + i) / 12);
      const month = (startMonth + i) % 12;
      
      // Calculate steps for this month
      let monthSteps = 0;
      for (let j = 0; j < history.length; j++) {
        const date = new Date();
        date.setDate(date.getDate() - (history.length - 1 - j));
        
        if (date.getFullYear() === year && date.getMonth() === month) {
          const dateString = date.toISOString().split('T')[0];
          const steps = dateString === todayDateString ? todaySteps : (history[j]?.steps || 0);
          monthSteps += steps;
        }
      }
      
      const isCurrentPeriod = year === currentYear && month === currentMonth;
      
      monthlyData.push({
        label: `${monthNames[month]} ${year}`, // 🎯 FIX: Add year to label
        steps: monthSteps,
        isCurrentPeriod
      });
    }
    
    const totalSteps = monthlyData.reduce((sum, d) => sum + d.steps, 0);
    const avgSteps = Math.round(totalSteps / monthlyData.length);
    
    setMonthData({
      title: 'Month',
      data: monthlyData,
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
    
    // 🎯 Determine chart type for different styling
    const isMonthChart = section.title === 'Month';
    const isYearChart = section.title === 'Year';
    
    // 🎯 Different colors for different chart types
    const getBarColor = () => {
      if (isYearChart) {
        return {
          current: 'bg-gradient-to-t from-purple-500 to-purple-400',
          other: 'bg-gradient-to-t from-purple-500/70 to-purple-400/70'
        };
      }
      // Default blue for Week and Month
      return {
        current: 'bg-gradient-to-t from-blue-500 to-blue-400',
        other: 'bg-gradient-to-t from-blue-500/70 to-blue-400/70'
      };
    };
    
    const colors = getBarColor();
    
    return (
      <div className="bg-white dark:bg-[#151A25] rounded-2xl p-5 border border-gray-200 dark:border-white/5">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{section.title}</h3>
        
        {/* 🎯 Scrollable container for Month chart */}
        <div className={`relative mb-4 ${isMonthChart ? 'overflow-x-auto' : ''}`} style={{ height: '212px' }}>
          <div 
            className={`absolute bottom-0 left-0 flex items-end gap-2 ${isMonthChart ? 'pr-4' : 'right-0 justify-center'}`}
            style={{ 
              height: '168px',
              minWidth: isMonthChart ? `${section.data.length * 60}px` : 'auto' // 🎯 Fixed width per bar for scrolling
            }}
          >
            {section.data.map((bar, index) => {
              const heightPx = maxSteps > 0 ? (bar.steps / maxSteps) * 148 : 0;
              
              return (
                <div 
                  key={index} 
                  className="flex flex-col-reverse items-center gap-1" 
                  style={{ width: isMonthChart ? '50px' : '40px' }} // 🎯 Wider bars for Month chart
                >
                  <div className={`text-[10px] font-bold whitespace-nowrap ${
                    bar.isCurrentPeriod
                      ? isYearChart ? 'text-purple-500 dark:text-purple-400' : 'text-blue-500 dark:text-blue-400'
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
                        bar.isCurrentPeriod ? colors.current : colors.other
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
