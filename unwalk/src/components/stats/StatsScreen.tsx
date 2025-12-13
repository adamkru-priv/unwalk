import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { WeeklyStats } from '../home/WeeklyStats';

export function StatsScreen() {
  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-20 font-sans">
      {/* Header */}
      <AppHeader />

      <main className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        {/* Weekly Stats */}
        <WeeklyStats dailyGoal={10000} />

        {/* Monthly Overview */}
        <section className="bg-[#151A25] border border-white/5 rounded-3xl p-5">
          <h3 className="text-lg font-bold text-white mb-4">📅 This Month</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0B101B] border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">127k</div>
              <div className="text-sm text-gray-400">Total Steps</div>
            </div>
            <div className="bg-[#0B101B] border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">101.6km</div>
              <div className="text-sm text-gray-400">Distance</div>
            </div>
            <div className="bg-[#0B101B] border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-1">12</div>
              <div className="text-sm text-gray-400">Active Days</div>
            </div>
            <div className="bg-[#0B101B] border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold text-orange-400 mb-1">5</div>
              <div className="text-sm text-gray-400">Streak Days</div>
            </div>
          </div>
        </section>

        {/* All Time */}
        <section className="bg-[#151A25] border border-white/5 rounded-3xl p-5">
          <h3 className="text-lg font-bold text-white mb-4">🏆 All Time</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-400">Total Challenges</span>
              <span className="text-white font-bold">7</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <span className="text-gray-400">Completed</span>
              <span className="text-green-400 font-bold">5</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <span className="text-gray-400">Total Steps</span>
              <span className="text-white font-bold">1.2M</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <span className="text-gray-400">Total Distance</span>
              <span className="text-white font-bold">960km</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <span className="text-gray-400">Best Streak</span>
              <span className="text-orange-400 font-bold">🔥 14 days</span>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="home" />
    </div>
  );
}
