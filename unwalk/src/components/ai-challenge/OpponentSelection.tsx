interface OpponentSelectionProps {
  duration: 30 | 60;
  onSelectOpponent: (difficulty: 'easy' | 'medium' | 'hard') => void;
  onBack: () => void;
}

const opponents = {
  30: [
    { 
      difficulty: 'easy' as const, 
      name: 'Turtle', 
      steps: 60, 
      emoji: '🐢', 
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      glowColor: 'rgba(16, 185, 129, 0.4)',
      borderColor: 'border-emerald-400/40'
    },
    { 
      difficulty: 'medium' as const, 
      name: 'Runner', 
      steps: 100, 
      emoji: '🏃', 
      gradient: 'from-amber-500 via-yellow-500 to-orange-400',
      glowColor: 'rgba(245, 158, 11, 0.4)',
      borderColor: 'border-amber-400/40'
    },
    { 
      difficulty: 'hard' as const, 
      name: 'Speedster', 
      steps: 150, 
      emoji: '⚡', 
      gradient: 'from-orange-500 via-red-500 to-pink-500',
      glowColor: 'rgba(249, 115, 22, 0.4)',
      borderColor: 'border-orange-400/40'
    },
  ],
  60: [
    { 
      difficulty: 'easy' as const, 
      name: 'Turtle', 
      steps: 120, 
      emoji: '🐢', 
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      glowColor: 'rgba(16, 185, 129, 0.4)',
      borderColor: 'border-emerald-400/40'
    },
    { 
      difficulty: 'medium' as const, 
      name: 'Runner', 
      steps: 200, 
      emoji: '🏃', 
      gradient: 'from-amber-500 via-yellow-500 to-orange-400',
      glowColor: 'rgba(245, 158, 11, 0.4)',
      borderColor: 'border-amber-400/40'
    },
    { 
      difficulty: 'hard' as const, 
      name: 'Speedster', 
      steps: 300, 
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 relative overflow-hidden" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
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
        className="relative z-10 mb-4 text-white/60 hover:text-white flex items-center gap-2 transition-colors"
      >
        ← Back
      </button>

      <div className="relative z-10 text-center mb-8">
        <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
          Select Opponent
        </h1>
        <div className="inline-flex items-center gap-3 px-5 py-2 bg-cyan-500/20 backdrop-blur-sm rounded-full border-2 border-cyan-400/30">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          <p className="text-cyan-300 font-black text-base">{duration}s SPRINT</p>
        </div>
      </div>

      <div className="relative z-10 space-y-3 max-w-md mx-auto">
        {opponentsList.map((opponent, index) => (
          <button
            key={opponent.difficulty}
            onClick={() => onSelectOpponent(opponent.difficulty)}
            className="group w-full relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            {/* Animated gradient background */}
            <div 
              className={`absolute inset-0 bg-gradient-to-r ${opponent.gradient} opacity-90 group-hover:opacity-100 transition-opacity`}
            ></div>
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            {/* Glow effect on hover */}
            <div 
              className="absolute -inset-0.5 opacity-0 group-hover:opacity-100 blur-lg transition-opacity"
              style={{ background: `radial-gradient(circle at center, ${opponent.glowColor}, transparent 70%)` }}
            ></div>

            <div className="relative p-5 flex items-center justify-between">
              {/* Left side - Icon and Info */}
              <div className="flex items-center gap-3">
                {/* Icon with difficulty badge */}
                <div className="relative">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-xl">
                    <span className="text-4xl">{opponent.emoji}</span>
                  </div>
                  {/* Difficulty number badge */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                    <span className="text-xs font-black text-white">{index + 1}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="text-left">
                  <h3 className="text-2xl font-black text-white mb-0.5">{opponent.name}</h3>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="px-2 py-0.5 bg-white/30 backdrop-blur-sm rounded-md">
                      <p className="text-xs font-black text-white uppercase">{difficultyLabels[opponent.difficulty]}</p>
                    </div>
                  </div>
                  <p className="text-white/90 text-sm font-bold">{opponent.steps} steps target</p>
                </div>
              </div>

              {/* Right side - Arrow */}
              <div className="text-4xl text-white/40 group-hover:text-white/90 group-hover:translate-x-2 transition-all">
                →
              </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
          </button>
        ))}
      </div>

      {/* Bottom hint */}
      <div className="relative z-10 text-center mt-6">
        <p className="text-white/30 text-xs uppercase tracking-wider font-bold">Choose your challenge level</p>
      </div>
    </div>
  );
}
