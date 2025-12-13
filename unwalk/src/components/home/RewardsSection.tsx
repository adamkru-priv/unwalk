interface Reward {
  id: string;
  title: string;
  icon: string;
  unlocked: boolean;
  gradient: string;
}

export function RewardsSection() {
  // Mock rewards - Apple-style badges
  const rewards: Reward[] = [
    {
      id: '1',
      title: 'First Steps',
      icon: '👣',
      unlocked: true,
      gradient: 'from-blue-400 to-blue-600',
    },
    {
      id: '2',
      title: 'Week Warrior',
      icon: '✓',
      unlocked: true,
      gradient: 'from-orange-600 to-red-700',
    },
    {
      id: '3',
      title: '10K Master',
      icon: '⭐',
      unlocked: false,
      gradient: 'from-gray-600 to-gray-700',
    },
    {
      id: '4',
      title: 'Marathon',
      icon: '🏃',
      unlocked: false,
      gradient: 'from-gray-600 to-gray-700',
    },
    {
      id: '5',
      title: 'Streak 7',
      icon: '🔥',
      unlocked: false,
      gradient: 'from-gray-600 to-gray-700',
    },
    {
      id: '6',
      title: 'Explorer',
      icon: '🌍',
      unlocked: false,
      gradient: 'from-gray-600 to-gray-700',
    },
  ];

  const unlockedCount = rewards.filter(r => r.unlocked).length;

  return (
    <div className="bg-[#1a2332] border border-gray-700/50 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🏆</span>
          <span>Badges</span>
        </h3>
        <div className="text-sm text-gray-400 font-medium">
          {unlockedCount}/{rewards.length}
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-3 gap-6 mb-5">
        {rewards.map((reward) => (
          <div
            key={reward.id}
            className="flex flex-col items-center gap-3"
          >
            {/* Badge Circle */}
            <div className="relative">
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  reward.unlocked
                    ? `bg-gradient-to-br ${reward.gradient} shadow-xl`
                    : 'bg-gradient-to-br from-gray-700 to-gray-800 opacity-30'
                }`}
              >
                {/* Icon */}
                <div className={`text-5xl ${!reward.unlocked && 'grayscale opacity-50'}`}>
                  {reward.icon}
                </div>

                {/* NEW Badge - top right corner */}
                {reward.unlocked && reward.id === '1' && (
                  <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                    NEW
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div className={`text-sm text-center font-medium ${
              reward.unlocked ? 'text-white' : 'text-gray-500'
            }`}>
              {reward.title}
            </div>
          </div>
        ))}
      </div>

      {/* Progress Hint */}
      <div className="pt-4 border-t border-gray-700/50">
        <div className="text-sm text-gray-400 text-center flex items-center justify-center gap-2">
          <span>💡</span>
          <span>Walk 10,000 steps to unlock <span className="text-white font-semibold">10K Master</span></span>
        </div>
      </div>
    </div>
  );
}
