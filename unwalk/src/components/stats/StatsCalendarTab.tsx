import { useState, useEffect, useRef } from 'react';
import { useHealthKit } from '../../hooks/useHealthKit';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { useAIInsights } from '../../hooks/useAI'; // 🎯 NEW: AI hook

interface DayData {
  date: string;
  steps: number;
  dayOfWeek: string;
  dayOfMonth: number;
  month: string;
  year: number;
}

interface WeekData {
  weekNumber: number;
  days: (DayData | null)[];
  monthLabel?: string;
}

interface ChartBarData {
  label: string;
  steps: number;
  isCurrentPeriod: boolean;
}

interface ChartSection {
  title: string;
  data: ChartBarData[];
  totalSteps: number;
}

const DAILY_GOAL = 10000;
const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function StatsCalendarTab() {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ currentStreak: 0, bestSteps: 0 });
  const [monthData, setMonthData] = useState<ChartSection | null>(null);
  const [yearData, setYearData] = useState<ChartSection | null>(null);

  // 🎯 NEW: AI Insights state
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const { getInsights, loading: aiLoading } = useAIInsights();

  const { getStepsHistory, isAuthorized } = useHealthKit();
  const todaySteps = useChallengeStore((s) => s.todaySteps);
  const userProfile = useChallengeStore((s) => s.userProfile);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    loadChartData();
  }, [todaySteps]);

  useEffect(() => {
    if (!loading && weeks.length > 0 && calendarRef.current) {
      setTimeout(() => {
        if (calendarRef.current) {
          const currentWeekIndex = weeks.findIndex(week => {
            return week.days.some(day => {
              if (!day) return false;
              const today = new Date().toISOString().split('T')[0];
              return day.date === today;
            });
          });

          if (currentWeekIndex >= 0) {
            const weekHeight = 100;
            const headerHeight = 60;
            const targetScroll = currentWeekIndex * weekHeight + headerHeight - 100;

            calendarRef.current.scrollTop = Math.max(0, targetScroll);
          }
        }
      }, 100);
    }
  }, [loading, weeks]);

  const loadAIInsights = async () => {
    try {
      const history = await getStepsHistory(7);
      const weeklySteps = history.map(h => h.steps);

      const totalChallenges = 10;
      const completedChallenges = 7;

      const insights = await getInsights({
        weeklySteps,
        streak: stats.currentStreak,
        totalChallenges,
        completedChallenges,
        level: userProfile?.level || 1,
        xp: userProfile?.xp || 0
      });

      if (insights) {
        setAiInsights(insights);
        setShowAIInsights(true);
      }
    } catch (error) {
      console.error('Failed to load AI insights:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const registrationDate = userProfile?.created_at ? new Date(userProfile.created_at) : null;
      const today = new Date();

      let startDate: Date;
      let maxDaysLimit = 365;

      const isLocalhost = window.location.hostname === 'localhost';

      if (isLocalhost || userProfile?.email === 'adam.krusz@gmail.com') {
        startDate = new Date('2025-01-01T00:00:00Z');
        maxDaysLimit = 999;
      } else if (registrationDate) {
        startDate = registrationDate;
      } else {
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const diffTime = Math.abs(today.getTime() - startDate.getTime());
      const daysSinceStart = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const days = Math.min(daysSinceStart, maxDaysLimit);

      const history = await getStepsHistory(days);
      const todayDateString = today.toISOString().split('T')[0];

      const allDays: DayData[] = history.map((item, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - index));
        const dateString = date.toISOString().split('T')[0];
        const steps = dateString === todayDateString ? todaySteps : item.steps;

        return {
          date: dateString,
          steps,
          dayOfWeek: DAYS_OF_WEEK[date.getDay() === 0 ? 6 : date.getDay() - 1],
          dayOfMonth: date.getDate(),
          month: MONTHS[date.getMonth()],
          year: date.getFullYear()
        };
      });

      const extendedDays: DayData[] = [];

      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      const firstDayOfStartMonth = new Date(startYear, startMonth, 1);

      for (let d = new Date(firstDayOfStartMonth); d < startDate; d.setDate(d.getDate() + 1)) {
        extendedDays.push({
          date: d.toISOString().split('T')[0],
          steps: -1,
          dayOfWeek: DAYS_OF_WEEK[d.getDay() === 0 ? 6 : d.getDay() - 1],
          dayOfMonth: d.getDate(),
          month: MONTHS[d.getMonth()],
          year: d.getFullYear()
        });
      }

      extendedDays.push(...allDays);

      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

      for (let d = new Date(today); d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().split('T')[0];
        if (dateString === todayDateString) continue;

        extendedDays.push({
          date: dateString,
          steps: -1,
          dayOfWeek: DAYS_OF_WEEK[d.getDay() === 0 ? 6 : d.getDay() - 1],
          dayOfMonth: d.getDate(),
          month: MONTHS[d.getMonth()],
          year: d.getFullYear()
        });
      }

      const realDays = allDays.filter(d => d.steps >= 0);

      let currentStreak = 0;
      const todayIndex = realDays.length - 1;
      const isTodayComplete = realDays[todayIndex]?.steps >= DAILY_GOAL;
      const startIndex = isTodayComplete ? todayIndex : todayIndex - 1;

      for (let i = startIndex; i >= 0; i--) {
        if (realDays[i].steps >= DAILY_GOAL) {
          currentStreak++;
        } else {
          break;
        }
      }

      let bestDaySteps = 0;
      for (const day of realDays) {
        if (day.steps > bestDaySteps) {
          bestDaySteps = day.steps;
        }
      }

      setStats({
        currentStreak,
        bestSteps: bestDaySteps
      });

      const weeksData: WeekData[] = [];
      let currentWeek: (DayData | null)[] = [];
      let weekNumber = 0;
      let lastMonth = '';

      const firstDay = new Date(extendedDays[0].date);
      const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push(null);
      }

      for (let i = 0; i < extendedDays.length; i++) {
        const day = extendedDays[i];
        const monthKey = `${day.month} ${day.year}`;

        if (lastMonth !== '' && monthKey !== lastMonth && currentWeek.length > 0) {
          while (currentWeek.length < 7) {
            currentWeek.push(null);
          }

          weeksData.push({
            weekNumber: weekNumber++,
            days: [...currentWeek],
            monthLabel: undefined
          });

          currentWeek = [];
          const newDayOfWeek = new Date(day.date).getDay() === 0 ? 6 : new Date(day.date).getDay() - 1;
          for (let j = 0; j < newDayOfWeek; j++) {
            currentWeek.push(null);
          }
        }

        lastMonth = monthKey;
        currentWeek.push(day);

        if (currentWeek.length === 7 || i === extendedDays.length - 1) {
          while (currentWeek.length < 7) {
            currentWeek.push(null);
          }

          weeksData.push({
            weekNumber: weekNumber++,
            days: [...currentWeek],
            monthLabel: undefined
          });
          currentWeek = [];
        }
      }

      let lastSeenMonth = '';
      for (let i = 0; i < weeksData.length; i++) {
        const week = weeksData[i];
        const firstDayInWeek = week.days.find(d => d !== null);

        if (firstDayInWeek) {
          const monthKey = `${firstDayInWeek.month} ${firstDayInWeek.year}`;

          if (monthKey !== lastSeenMonth) {
            week.monthLabel = monthKey;
            lastSeenMonth = monthKey;
          }
        }
      }

      setWeeks(weeksData);

    } catch (error) {
      console.error('❌ Failed to load steps history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      await Promise.all([
        loadMonthData(),
        loadYearData()
      ]);
    } catch (error) {
      console.error('❌ Failed to load chart data:', error);
    }
  };

  const loadMonthData = async () => {
    const history = await getStepsHistory(365);
    const todayDateString = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

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

    const data: ChartBarData[] = MONTHS.map((label, index) => ({
      label,
      steps: monthSteps[index],
      isCurrentPeriod: index === currentMonth
    }));

    const totalSteps = data.reduce((sum, d) => sum + d.steps, 0);

    setMonthData({
      title: 'Month',
      data,
      totalSteps
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

    const data: ChartBarData[] = Array.from(yearStepsMap.entries())
      .filter(([year]) => year >= 2025)
      .sort((a, b) => a[0] - b[0])
      .map(([year, steps]) => ({
        label: year.toString(),
        steps,
        isCurrentPeriod: year === currentYear
      }));

    const totalSteps = data.reduce((sum, d) => sum + d.steps, 0);

    setYearData({
      title: 'Year',
      data,
      totalSteps
    });
  };

  const renderChart = (section: ChartSection | null) => {
    if (!section) return null;

    const maxSteps = Math.max(...section.data.map(d => d.steps), 1);

    return (
      <div className="bg-white dark:bg-[#151A25] rounded-2xl p-5 border border-gray-200 dark:border-white/5">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{section.title}</h3>

        <div className="relative mb-4" style={{ height: '212px' }}>
          <div className="absolute bottom-0 left-0 right-0 flex items-end gap-2" style={{ height: '168px' }}>
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

  return (
    <div className="space-y-4">
      {/* Stats Bar - NEW: Compact single line with AI robot */}
      {!loading && (
        <div className="bg-white dark:bg-[#151A25] rounded-2xl p-4 border border-gray-200 dark:border-white/5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-1">
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Goal</div>
                <div className="text-sm font-black text-blue-500">{(DAILY_GOAL / 1000).toFixed(0)}k</div>
              </div>
              <div className="w-px h-8 bg-gray-300 dark:bg-gray-700" />
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Best</div>
                <div className="text-sm font-black text-purple-500">{(stats.bestSteps / 1000).toFixed(1)}k</div>
              </div>
              <div className="w-px h-8 bg-gray-300 dark:bg-gray-700" />
              <div className="text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Streak</div>
                <div className="text-sm font-black text-orange-500">{stats.currentStreak}d</div>
              </div>
            </div>
            
            {/* 🤖 AI Robot - Get Insights */}
            <button
              onClick={loadAIInsights}
              disabled={aiLoading}
              className="group flex-shrink-0"
              title="Get AI insights!"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-400 to-pink-400 blur-sm opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="relative bg-gradient-to-br from-purple-500 via-purple-400 to-pink-400 rounded-lg p-1.5 shadow-lg group-hover:scale-110 group-active:scale-95 transition-all duration-300">
                  {aiLoading ? (
                    <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="text-xl block leading-none">🤖</span>
                  )}
                </div>
                {!aiLoading && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-300 animate-ping" />}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 🎯 AI Insights Modal */}
      {showAIInsights && aiInsights && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAIInsights(false)}
        >
          <div 
            className="w-full max-w-2xl bg-white dark:bg-[#151A25] rounded-2xl border-2 border-purple-500/30 dark:border-purple-500/40 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">🤖</span>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    AI Insights
                  </h3>
                </div>
                
                <button
                  onClick={() => setShowAIInsights(false)}
                  className="text-gray-500 dark:text-gray-400 text-2xl font-bold w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                {/* Trend Badge - NA GÓRZE */}
                <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800">
                  <span className="text-4xl">{aiInsights.trendEmoji || '➡️'}</span>
                  <span className={`text-2xl font-black ${
                    aiInsights.trend === 'improving' 
                      ? 'text-green-600 dark:text-green-400' 
                      : aiInsights.trend === 'declining'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {aiInsights.trend === 'improving' && 'Improving'}
                    {aiInsights.trend === 'declining' && 'Declining'}
                    {aiInsights.trend === 'stable' && 'Stable'}
                  </span>
                </div>

                {/* Key Insights - KRÓTKO */}
                <div className="space-y-2">
                  {aiInsights.keyInsight && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <span className="text-2xl flex-shrink-0">📊</span>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white flex-1 leading-relaxed">
                        {aiInsights.keyInsight}
                      </p>
                    </div>
                  )}
                  {aiInsights.secondInsight && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                      <span className="text-2xl flex-shrink-0">💡</span>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 leading-relaxed">
                        {aiInsights.secondInsight}
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick Action - WYRAŹNIE */}
                {aiInsights.quickAction && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
                    <p className="text-xs font-black uppercase mb-2 opacity-90">🎯 Do This Now:</p>
                    <p className="text-base font-bold leading-relaxed">
                      {aiInsights.quickAction}
                    </p>
                  </div>
                )}

                {/* Motivation - KRÓTKO */}
                {aiInsights.motivation && (
                  <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-center">
                    <p className="text-sm font-semibold text-orange-900 dark:text-orange-300 leading-relaxed">
                      {aiInsights.motivation}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowAIInsights(false)}
              className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border-t border-gray-200 dark:border-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white dark:bg-[#151A25] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
        <div ref={calendarRef} className="max-h-[40vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            </div>
          ) : weeks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 p-8 text-center">
              <div className="text-6xl mb-4">📊</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                No steps data available
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                {!isAuthorized 
                  ? 'Please grant Health permissions to see your steps history.'
                  : 'Start walking to see your steps history here!'}
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Days header */}
              <div className="sticky top-0 bg-white dark:bg-[#151A25] pb-3 z-10 border-b border-gray-200 dark:border-white/5">
                <div className="grid grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map((day, i) => (
                    <div key={i} className="text-center text-sm font-bold text-gray-700 dark:text-gray-300">
                      {day}
                    </div>
                  ))}
                </div>
              </div>

              {/* Weeks */}
              {weeks.map((week, weekIndex) => (
                <div key={week.weekNumber}>
                  {week.monthLabel && (
                    <div className={`text-lg font-bold text-gray-900 dark:text-white mb-2 ${weekIndex > 0 ? 'mt-6' : 'mt-2'}`}>
                      {week.monthLabel}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-7 gap-2">
                    {week.days.map((day, dayIndex) => {
                      if (!day) {
                        return <div key={dayIndex} className="aspect-square" />;
                      }
                      
                      const isEmptyPlaceholder = day.steps === -1;
                      const isGoalMet = day.steps >= DAILY_GOAL;
                      const hasSteps = day.steps > 0;
                      const isToday = day.date === new Date().toISOString().split('T')[0];
                      const progress = Math.min(day.steps / DAILY_GOAL, 1);
                      
                      return (
                        <div key={dayIndex} className="flex flex-col items-center gap-1">
                          <div className="relative">
                            {isEmptyPlaceholder ? (
                              <svg width="40" height="40">
                                <circle
                                  cx="20"
                                  cy="20"
                                  r="16"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  className="text-gray-300 dark:text-gray-800 opacity-30"
                                />
                              </svg>
                            ) : (
                              <svg width="40" height="40" className="transform -rotate-90">
                                <circle
                                  cx="20"
                                  cy="20"
                                  r="16"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  className="text-gray-200 dark:text-gray-700"
                                />
                                {hasSteps && (
                                  <circle
                                    cx="20"
                                    cy="20"
                                    r="16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 16}`}
                                    strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress)}`}
                                    className={isGoalMet ? 'text-green-500' : 'text-blue-500'}
                                  />
                                )}
                              </svg>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className={`text-[11px] font-bold ${
                                isEmptyPlaceholder
                                  ? 'text-gray-400 dark:text-gray-700 opacity-40'
                                  : isToday 
                                    ? 'text-yellow-500' 
                                    : hasSteps 
                                      ? 'text-gray-900 dark:text-white' 
                                      : 'text-gray-400 dark:text-gray-600'
                              }`}>
                                {day.dayOfMonth}
                              </span>
                            </div>
                          </div>
                          
                          {!isEmptyPlaceholder && (
                            <div className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center">
                              {hasSteps ? `${(day.steps / 1000).toFixed(1)}k` : '0'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Month & Year Charts */}
      {!loading && (
        <>
          {renderChart(monthData)}
          {renderChart(yearData)}
        </>
      )}
    </div>
  );
}
