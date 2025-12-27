interface HeroHeaderProps {
  xp?: number;
  level?: number;
}

export function HeroHeader({ xp, level }: HeroHeaderProps) {
  const calculateLevelProgress = (currentXP: number, currentLevel: number): number => {
    const calculateXPForLevel = (lvl: number) => {
      if (lvl <= 1) return 0;
      return Math.floor(100 * (Math.pow(1.5, lvl - 1) - 1) / 0.5);
    };
    
    if (currentLevel >= 50) return 100;
    
    const currentLevelXP = calculateXPForLevel(currentLevel);
    const nextLevelXP = calculateXPForLevel(currentLevel + 1);
    const xpInCurrentLevel = currentXP - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;
    
    return Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForLevel) * 100));
  };

  const getLevelEmoji = (lvl: number) => {
    if (lvl < 10) return '🌱';
    if (lvl < 20) return '🗺️';
    if (lvl < 30) return '⚔️';
    if (lvl < 40) return '🏆';
    return '👑';
  };

  const progress = xp !== undefined && level !== undefined ? calculateLevelProgress(xp, level) : 0;

  return (
    <div className="px-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">
          Let's get moving
        </h1>
        
        {level !== undefined && (
          <div className="flex items-center gap-2 bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/10 rounded-full px-3 py-1.5">
            <span className="text-base">{getLevelEmoji(level)}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-gray-900 dark:text-white">{level}</span>
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
