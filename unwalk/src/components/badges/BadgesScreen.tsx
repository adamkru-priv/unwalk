import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';

interface Badge {
  id: string;
  title: string;
  icon: string;
  unlocked: boolean;
  gradient: string;
  description: string;
}

export function BadgesScreen() {
  // Mock badges - later from API based on achievements
  const badges: Badge[] = [
    {
      id: '1',
      title: 'First Steps',
      icon: '👣',
      unlocked: true,
      gradient: 'from-blue-400 to-blue-600',
      description: 'Complete your first challenge',
    },
    {
      id: '2',
      title: 'Week Warrior',
      icon: '🔥',
      unlocked: true,
      gradient: 'from-orange-400 to-red-600',
      description: 'Stay active for 7 days',
    },
    {
      id: '3',
      title: '10K Master',
      icon: '⭐',
      unlocked: false,
      gradient: 'from-purple-400 to-purple-600',
      description: 'Complete a 10K challenge',
    },
    {
      id: '4',
      title: 'Marathon',
      icon: '🏃',
      unlocked: false,
      gradient: 'from-green-400 to-green-600',
      description: 'Walk 42km in total',
    },
    {
      id: '5',
      title: 'Streak 7',
      icon: '💪',
      unlocked: false,
      gradient: 'from-pink-400 to-pink-600',
      description: 'Maintain a 7-day streak',
    },
    {
      id: '6',
      title: 'Explorer',
      icon: '🌍',
      unlocked: false,
      gradient: 'from-cyan-400 to-cyan-600',
      description: 'Try 5 different challenges',
    },
    {
      id: '7',
      title: 'Distance King',
      icon: '🚀',
      unlocked: false,
      gradient: 'from-indigo-400 to-indigo-600',
      description: 'Walk 100km in total',
    },
    {
      id: '8',
      title: 'Team Player',
      icon: '👥',
      unlocked: false,
      gradient: 'from-amber-400 to-amber-600',
      description: 'Complete a team challenge',
    },
    {
      id: '9',
      title: 'Consistent',
      icon: '📅',
      unlocked: false,
      gradient: 'from-teal-400 to-teal-600',
      description: 'Active 20 days this month',
    },
  ];

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const totalPoints = 250; // Mock - will come from backend

  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-24 font-sans">
      {/* Header */}
      <AppHeader />

      <main className="px-5 pt-6 pb-6 max-w-md mx-auto space-y-6">
        
        {/* Hero Header with Points */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-white mb-1">
            Your Rewards
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm text-white/50">
            <span>{unlockedCount}/{badges.length} badges</span>
            <span>•</span>
            <span className="text-amber-400 font-bold">{totalPoints} points</span>
          </div>
        </div>

        {/* BADGES GRID */}
        <section>
          <div className="grid grid-cols-3 gap-4">
            {badges.map((badge) => (
              <button
                key={badge.id}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#151A25] border border-white/5 hover:bg-[#1A1F2E] transition-all group"
              >
                {/* Badge Circle */}
                <div className="relative">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                      badge.unlocked
                        ? `bg-gradient-to-br ${badge.gradient} shadow-lg shadow-${badge.gradient.split('-')[1]}-500/20`
                        : 'bg-[#0B101B] border-2 border-white/10'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`text-2xl ${!badge.unlocked && 'grayscale opacity-30'}`}>
                      {badge.icon}
                    </div>

                    {/* Lock icon for locked badges */}
                    {!badge.unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white/20" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className={`text-xs font-bold text-center leading-tight ${
                  badge.unlocked ? 'text-white' : 'text-white/40'
                }`}>
                  {badge.title}
                </div>

                {/* Description - always visible */}
                <div className={`text-[10px] leading-snug text-center h-8 flex items-center ${
                  badge.unlocked ? 'text-white/50' : 'text-white/30'
                }`}>
                  {badge.description}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* INFO BOX - Light and minimal */}
        <section>
          <div className="bg-[#151A25] border border-white/5 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-2">✨</div>
            <p className="text-sm text-white/60 leading-relaxed">
              Complete challenges and stay active to unlock more badges and earn points
            </p>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation currentScreen="badges" />
    </div>
  );
}
