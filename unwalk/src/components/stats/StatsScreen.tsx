import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';

export function StatsScreen() {
  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-20 font-sans">
      {/* Header */}
      <AppHeader />

      <main className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        {/* Simple Weekly Overview */}
        <section className="bg-[#151A25] border border-white/5 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">📊 Last 7 Days</h3>
            <div className="text-sm text-white/60">2/7 goals</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">39.2k</div>
              <div className="text-sm text-white/60">Total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">5.6k</div>
              <div className="text-sm text-white/60">Daily Avg</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">31km</div>
              <div className="text-sm text-white/60">Distance</div>
            </div>
          </div>

          {/* Simple progress bar */}
          <div className="bg-[#0B101B] rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-400 h-full" style={{ width: '29%' }}></div>
          </div>
          <div className="text-right text-sm text-white/60 mt-2">29% weekly goal</div>
        </section>

        {/* Monthly Overview */}
        <section className="bg-[#151A25] border border-white/5 rounded-3xl p-6">
          <h3 className="text-xl font-bold text-white mb-5">📅 This Month</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0B101B] border border-white/5 rounded-2xl p-5 text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">127k</div>
              <div className="text-sm text-white/60">Total Steps</div>
            </div>
            <div className="bg-[#0B101B] border border-white/5 rounded-2xl p-5 text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">102km</div>
              <div className="text-sm text-white/60">Distance</div>
            </div>
            <div className="bg-[#0B101B] border border-white/5 rounded-2xl p-5 text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">12</div>
              <div className="text-sm text-white/60">Active Days</div>
            </div>
            <div className="bg-[#0B101B] border border-white/5 rounded-2xl p-5 text-center">
              <div className="text-4xl font-bold text-orange-400 mb-2">5</div>
              <div className="text-sm text-white/60">Streak 🔥</div>
            </div>
          </div>
        </section>

        {/* All Time - simplified */}
        <section className="bg-[#151A25] border border-white/5 rounded-3xl p-6">
          <h3 className="text-xl font-bold text-white mb-5">🏆 All Time</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Total Steps</span>
              <span className="text-xl font-bold text-white">1.2M</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-white/70">Total Distance</span>
              <span className="text-xl font-bold text-white">960km</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-white/70">Challenges Completed</span>
              <span className="text-xl font-bold text-green-400">5/7</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-white/70">Best Streak</span>
              <span className="text-xl font-bold text-orange-400">🔥 14 days</span>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="home" />
    </div>
  );
}
