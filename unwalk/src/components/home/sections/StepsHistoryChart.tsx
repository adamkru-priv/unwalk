import { useState, useEffect, useRef } from 'react';
import { useHealthKit } from '../../../hooks/useHealthKit';
import { useChallengeStore } from '../../../stores/useChallengeStore';

interface StepsHistoryChartProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  monthLabel?: string; // Pokazujemy na początku nowego miesiąca
}

const DAILY_GOAL = 10000;
const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function StepsHistoryChart({ isOpen, onClose }: StepsHistoryChartProps) {
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalDays: 0, daysAboveGoal: 0, currentStreak: 0, bestStreak: 0 });
  
  const { getStepsHistory, isAuthorized } = useHealthKit();
  const todaySteps = useChallengeStore((s) => s.todaySteps);

  // ✅ Ref do kontenera kalendarza dla auto-scroll
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, todaySteps]);

  // ✅ Auto-scroll do końca (aktualnego tygodnia) po załadowaniu
  useEffect(() => {
    if (isOpen && !loading && weeks.length > 0 && calendarRef.current) {
      // Poczekaj na render, potem scrolluj do końca z marginesem
      setTimeout(() => {
        if (calendarRef.current) {
          // Zamiast scrollować na sam dół, scrolluj tak aby aktualny tydzień był widoczny
          // ale zostawiając przestrzeń od dołu (150px marginesu)
          const maxScroll = calendarRef.current.scrollHeight - calendarRef.current.clientHeight;
          const targetScroll = maxScroll - 150; // Zostaw 150px miejsca od dołu
          calendarRef.current.scrollTop = Math.max(0, targetScroll);
        }
      }, 100);
    }
  }, [isOpen, loading, weeks]);

  const loadData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      
      // 🎯 CHANGED: Everyone gets data from Jan 1, 2025 (not just adam.krusz@gmail.com)
      const startDate = new Date('2025-01-01T00:00:00Z');
      const maxDaysLimit = 999; // ~3 years of data
      
      console.log('📊 [StepsHistory] ALL USERS: showing history from Jan 1, 2025');
      console.log('📊 [StepsHistory] Start date:', startDate.toISOString());
      console.log('📊 [StepsHistory] Today:', today.toISOString());
      
      const diffTime = Math.abs(today.getTime() - startDate.getTime());
      const daysSinceStart = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      console.log('📊 [StepsHistory] Calculated days since start:', daysSinceStart);
      
      const days = Math.min(daysSinceStart, maxDaysLimit);
      console.log('📊 [StepsHistory] Final days to fetch:', days);
      
      const history = await getStepsHistory(days);
      
      const todayDateString = today.toISOString().split('T')[0];
      
      // Formatuj dane z dzisiejszymi krokami
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

      // ✅ NOWE: Dodaj puste dni dla reszty miesiąca rejestracji i miesiąca obecnego
      const extendedDays: DayData[] = [];
      
      // Miesiąc startowy - dodaj dni od 1-go dnia miesiąca
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();
      const firstDayOfStartMonth = new Date(startYear, startMonth, 1);
      
      // Dodaj dni od początku miesiąca do daty startowej
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
      
      // Dodaj rzeczywiste dane
      extendedDays.push(...allDays);
      
      // Miesiąc obecny - dodaj dni od dzisiaj do końca miesiąca
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
      
      for (let d = new Date(today); d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().split('T')[0];
        // Pomiń dzisiejszy dzień (już jest w danych)
        if (dateString === todayDateString) continue;
        
        extendedDays.push({
          date: dateString,
          steps: -1, // Specjalna wartość oznaczająca "puste kółko"
          dayOfWeek: DAYS_OF_WEEK[d.getDay() === 0 ? 6 : d.getDay() - 1],
          dayOfMonth: d.getDate(),
          month: MONTHS[d.getMonth()],
          year: d.getFullYear()
        });
      }

      // Tylko rzeczywiste dni (bez pustych placeholder'ów)
      const realDays = allDays.filter(d => d.steps >= 0);
      
      // ✅ FIX: Streak - dni po kolei powyżej celu (od dzisiaj wstecz)
      // Jeśli dzisiaj NIE osiągnięto celu (< 100%), nie liczymy dzisiejszego dnia
      let currentStreak = 0;
      const todayIndex = realDays.length - 1;
      
      // Sprawdź czy dzisiaj osiągnięto cel (100%)
      const isTodayComplete = realDays[todayIndex]?.steps >= DAILY_GOAL;
      
      // Zacznij od dzisiaj (jeśli 100%) lub od wczoraj (jeśli < 100%)
      const startIndex = isTodayComplete ? todayIndex : todayIndex - 1;
      
      for (let i = startIndex; i >= 0; i--) {
        if (realDays[i].steps >= DAILY_GOAL) {
          currentStreak++;
        } else {
          break; // Przerwij przy pierwszym dniu poniżej celu
        }
      }
      
      // ✅ NOWE: Najlepsza liczba kroków w całej historii
      let bestDaySteps = 0;
      for (const day of realDays) {
        if (day.steps > bestDaySteps) {
          bestDaySteps = day.steps;
        }
      }
      
      setStats({
        totalDays: 0, // Nie używamy już
        daysAboveGoal: 0, // Nie używamy już
        currentStreak,
        bestStreak: bestDaySteps // Używamy dla "best" (max steps)
      });

      // Pogrupuj w tygodnie (używamy extendedDays zamiast allDays)
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
      
      // ✅ NIE odwracamy kolejności - zachowujemy chronologiczną (starsze → nowsze)
      // Auto-scroll do końca załatwi wyświetlenie aktualnego tygodnia na górze
      
      // Dodaj nagłówki miesięcy
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#151A25] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              Steps History
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          
          {/* 🎯 NEW: Compact stats line with AI robot */}
          {!loading && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Goal</div>
                  <div className="text-sm font-black text-blue-500">{(DAILY_GOAL / 1000).toFixed(0)}k</div>
                </div>
                <div className="w-px h-8 bg-gray-300 dark:bg-gray-700" />
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Best</div>
                  <div className="text-sm font-black text-purple-500">{(stats.bestStreak / 1000).toFixed(1)}k</div>
                </div>
                <div className="w-px h-8 bg-gray-300 dark:bg-gray-700" />
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Streak</div>
                  <div className="text-sm font-black text-orange-500">{stats.currentStreak}d</div>
                </div>
              </div>
              
              {/* 🤖 AI Robot - Daily Tip */}
              <button
                onClick={() => {
                  // TODO: Open Daily Tip modal
                  console.log('Open Daily Tip');
                }}
                className="group flex-shrink-0"
                title="Get AI tips!"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-400 to-pink-400 blur-sm opacity-40 group-hover:opacity-60 transition-opacity" />
                  <div className="relative bg-gradient-to-br from-purple-500 via-purple-400 to-pink-400 rounded-lg p-1.5 shadow-lg group-hover:scale-110 group-active:scale-95 transition-all duration-300">
                    <span className="text-xl block leading-none">🤖</span>
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-300 animate-ping" />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable calendar */}
        <div ref={calendarRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            </div>
          ) : weeks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="text-6xl mb-4">📊</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                No steps data available
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                {!isAuthorized 
                  ? 'Please grant Health Connect permissions to see your steps history.'
                  : 'Start walking to see your steps history here!'}
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Days of week header - sticky */}
              <div className="sticky top-0 bg-white dark:bg-[#151A25] pb-3 z-10 border-b border-gray-200 dark:border-gray-800">
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
                  {/* Month label - mniejszy i wyrównany do lewej */}
                  {week.monthLabel && (
                    <div className={`text-lg font-bold text-gray-900 dark:text-white mb-2 ${weekIndex > 0 ? 'mt-6' : 'mt-2'}`}>
                      {week.monthLabel}
                    </div>
                  )}
                  
                  {/* Week row */}
                  <div className="grid grid-cols-7 gap-2">
                    {week.days.map((day, dayIndex) => {
                      if (!day) {
                        return <div key={dayIndex} className="aspect-square" />;
                      }
                      
                      const isEmptyPlaceholder = day.steps === -1; // Puste szare kółko
                      const isGoalMet = day.steps >= DAILY_GOAL;
                      const hasSteps = day.steps > 0;
                      const isToday = day.date === new Date().toISOString().split('T')[0];
                      const progress = Math.min(day.steps / DAILY_GOAL, 1);
                      
                      return (
                        <div key={dayIndex} className="flex flex-col items-center gap-1">
                          {/* Ring */}
                          <div className="relative">
                            {isEmptyPlaceholder ? (
                              // ✅ Szare puste kółko dla dni przed rejestracją lub po dzisiejszym dniu
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
                              // Normalne kółko z postępem
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
                            {/* Day number inside */}
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
                          
                          {/* Steps count below ring */}
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
    </div>
  );
}
