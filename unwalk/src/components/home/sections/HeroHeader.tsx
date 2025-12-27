import { useChallengeStore } from '../../../stores/useChallengeStore';

interface HeroHeaderProps {
  xp?: number;
  level?: number;
}

export function HeroHeader({ xp, level }: HeroHeaderProps) {
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);

  const calculateXPForLevel = (lvl: number) => {
    if (lvl <= 1) return 0;
    return Math.floor(100 * (Math.pow(1.5, lvl - 1) - 1) / 0.5);
  };

  const getLevelEmoji = (lvl: number) => {
    if (lvl < 10) return '🌱';
    if (lvl < 20) return '🗺️';
    if (lvl < 30) return '⚔️';
    if (lvl < 40) return '🏆';
    return '👑';
  };

  // ✅ NEW: Calculate progress based on TOTAL XP (not XP in current level)
  const calculateTotalXPProgress = (currentXP: number, currentLevel: number): number => {
    if (currentLevel >= 50) return 100;
    
    const nextLevelXP = calculateXPForLevel(currentLevel + 1);
    
    // Progress from 0 to next level requirement
    return Math.min(100, Math.max(0, (currentXP / nextLevelXP) * 100));
  };

  const progress = xp !== undefined && level !== undefined ? calculateTotalXPProgress(xp, level) : 0;
  const nextLevelXP = level !== undefined ? calculateXPForLevel(level + 1) : 0;

  return (
    <div className="px-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">
          Let's get moving
        </h1>

        {level !== undefined && (
          <button
            onClick={() => setCurrentScreen('badges')}
            className="flex items-center gap-2 bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/10 rounded-full px-3 py-1.5 relative group hover:bg-gray-50 dark:hover:bg-[#1A1F2E] transition-all active:scale-95 cursor-pointer"
            title={xp !== undefined ? `Level ${level} • ${xp.toLocaleString()} / ${nextLevelXP.toLocaleString()} XP to reach Level ${level + 1}\n\nClick to view rewards` : 'Click to view rewards'}
          >
            <span className="text-base">{getLevelEmoji(level)}</span>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-gray-900 dark:text-white">{level}</span>
                <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              {xp !== undefined && (
                <span className="text-[9px] text-gray-500 dark:text-white/50 font-medium">
                  {xp.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
                </span>
              )}
            </div>

            {/* Subtle arrow hint */}
            <svg
              className="w-3 h-3 text-gray-400 dark:text-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
