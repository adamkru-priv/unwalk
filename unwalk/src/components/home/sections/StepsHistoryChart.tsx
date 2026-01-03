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
  const userProfile = useChallengeStore((s) => s.userProfile);

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
      const registrationDate = userProfile?.created_at ? new Date(userProfile.created_at) : null;
      const today = new Date();
      
      let daysSinceRegistration = 365;
      if (registrationDate) {
        const diffTime = Math.abs(today.getTime() - registrationDate.getTime());
        daysSinceRegistration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
      
      const days = Math.min(daysSinceRegistration, 365);
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
      
      // Miesiąc rejestracji - dodaj dni od 1-go dnia miesiąca
      if (registrationDate) {
        const regMonth = registrationDate.getMonth();
        const regYear = registrationDate.getFullYear();
        const firstDayOfRegMonth = new Date(regYear, regMonth, 1);
        
        // Dodaj dni od początku miesiąca rejestracji do daty rejestracji
        for (let d = new Date(firstDayOfRegMonth); d < registrationDate; d.setDate(d.getDate() + 1)) {
          extendedDays.push({
            date: d.toISOString().split('T')[0],
            steps: -1, // Specjalna wartość oznaczająca "puste kółko"
            dayOfWeek: DAYS_OF_WEEK[d.getDay() === 0 ? 6 : d.getDay() - 1],
            dayOfMonth: d.getDate(),
            month: MONTHS[d.getMonth()],
            year: d.getFullYear()
          });
        }
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
      
      // ✅ NOWE: Streak - dni po kolei powyżej celu (od dzisiaj wstecz)
      let currentStreak = 0;
      for (let i = realDays.length - 1; i >= 0; i--) {
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
      <div className="bg-white dark:bg-[#151A25] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[50vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
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
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Goal: {DAILY_GOAL.toLocaleString()} steps
          </div>
        </div>

        {/* Stats Bar */}
        {!loading && (
          <div className="grid grid-cols-2 gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div className="text-center">
              <div className="text-2xl font-black text-orange-500">{stats.currentStreak}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Current Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-purple-500">{stats.bestStreak.toLocaleString()}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Best Steps</div>
            </div>
          </div>
        )}

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
