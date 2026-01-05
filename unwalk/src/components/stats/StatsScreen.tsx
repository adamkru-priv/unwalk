import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { StatsCalendarTab } from './StatsCalendarTab';

export function StatsScreen() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B101B] text-gray-900 dark:text-white pb-20 font-sans selection:bg-blue-500/30">
      <AppHeader />

      <main className="px-4 py-4 space-y-4">
        {/* Calendar with charts */}
        <StatsCalendarTab />
      </main>

      <BottomNavigation currentScreen="stats" />
    </div>
  );
}
