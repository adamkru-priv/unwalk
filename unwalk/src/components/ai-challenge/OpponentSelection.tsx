interface OpponentSelectionProps {
  duration: 30;
  onSelectOpponent: (difficulty: 'easy' | 'medium' | 'hard') => void;
  onBack: () => void;
}

const opponents = {
  30: [
    { 
      difficulty: 'easy' as const, 
      name: 'Turtle', 
      minSteps: 30,
      maxSteps: 45,
      emoji: '🐢', 
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      glowColor: 'rgba(16, 185, 129, 0.4)',
      borderColor: 'border-emerald-400/40'
    },
    { 
      difficulty: 'medium' as const, 
      name: 'Runner', 
      minSteps: 50,
      maxSteps: 70,
      emoji: '🏃', 
      gradient: 'from-amber-500 via-yellow-500 to-orange-400',
      glowColor: 'rgba(245, 158, 11, 0.4)',
      borderColor: 'border-amber-400/40'
    },
    { 
      difficulty: 'hard' as const, 
      name: 'Speedster', 
      minSteps: 75,
      maxSteps: 100,
      emoji: '⚡', 
      gradient: 'from-orange-500 via-red-500 to-pink-500',
      glowColor: 'rgba(249, 115, 22, 0.4)',
      borderColor: 'border-orange-400/40'
    },
  ],
};

const difficultyLabels = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
};

export function OpponentSelection({ duration, onSelectOpponent, onBack }: OpponentSelectionProps) {
  const opponentsList = opponents[duration];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 relative overflow-hidden" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      {/* Dynamic grid background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <button
        onClick={onBack}
        className="relative z-10 mb-3 text-white/60 hover:text-white flex items-center gap-2 transition-colors text-sm"
      >
        ← Back
      </button>

      <div className="relative z-10 text-center mb-5">
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
          Select Opponent
        </h1>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/20 backdrop-blur-sm rounded-full border border-cyan-400/30">
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
          <p className="text-cyan-300 font-black text-sm">{duration}s SPRINT</p>
        </div>
      </div>

      <div className="relative z-10 space-y-2.5 max-w-md mx-auto">
        {opponentsList.map((opponent, index) => (
          <button
            key={opponent.difficulty}
            onClick={() => onSelectOpponent(opponent.difficulty)}
            className="group w-full relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg"
          >
            {/* Animated gradient background */}
            <div 
              className={`absolute inset-0 bg-gradient-to-r ${opponent.gradient} opacity-90 group-hover:opacity-100 transition-opacity`}
            ></div>
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <div className="relative p-3.5 flex items-center justify-between">
              {/* Left side - Icon and Info */}
              <div className="flex items-center gap-3">
                {/* Icon with difficulty badge */}
                <div className="relative">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                    <span className="text-3xl">{opponent.emoji}</span>
                  </div>
                  {/* Difficulty number badge */}
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-900 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                    <span className="text-[10px] font-black text-white">{index + 1}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="text-left">
                  <h3 className="text-xl font-black text-white leading-tight">{opponent.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5 mb-1">
                    <div className="px-1.5 py-0.5 bg-white/25 backdrop-blur-sm rounded">
                      <p className="text-[10px] font-black text-white uppercase tracking-wide">{difficultyLabels[opponent.difficulty]}</p>
                    </div>
                  </div>
                  <p className="text-white/90 text-xs font-bold">{opponent.minSteps} - {opponent.maxSteps} steps</p>
                </div>
              </div>

              {/* Right side - Arrow */}
              <div className="text-3xl text-white/50 group-hover:text-white/90 group-hover:translate-x-1 transition-all">
                →
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom hint */}
      <div className="relative z-10 text-center mt-4">
        <p className="text-white/30 text-[10px] uppercase tracking-wider font-bold">Choose your challenge level</p>
      </div>
    </div>
  );
}
