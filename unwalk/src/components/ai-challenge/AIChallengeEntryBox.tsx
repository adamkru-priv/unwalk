interface AIChallengeEntryBoxProps {
  onStartClick: () => void;
  onLeaderboardClick: () => void;
}

export function AIChallengeEntryBox({ onStartClick, onLeaderboardClick }: AIChallengeEntryBoxProps) {
  return (
    <div className="relative group cursor-pointer" onClick={onStartClick}>
      {/* Animated gradient border effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
      
      {/* Main card */}
      <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 shadow-2xl">
        {/* Glowing orb decoration */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full blur-2xl opacity-60 animate-pulse"></div>
        
        <div className="relative z-10 flex items-center gap-4">
          {/* Content */}
          <div className="flex-1">
            <h3 className="text-2xl font-black text-white mb-1">AI Sprint Race</h3>
            <p className="text-sm text-cyan-400 font-bold mb-3">
              30s-60s • Real-time battle
            </p>
            
            {/* Racing stripes decoration */}
            <div className="flex gap-1 mb-3">
              <div className="h-1 w-12 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full"></div>
              <div className="h-1 w-8 bg-gradient-to-r from-pink-400 to-purple-600 rounded-full"></div>
              <div className="h-1 w-6 bg-gradient-to-r from-yellow-400 to-orange-600 rounded-full"></div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartClick();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl shadow-lg hover:shadow-cyan-500/50 transition-all hover:scale-105 active:scale-95"
              >
                <span className="text-sm font-black text-white uppercase tracking-wide">Start Race</span>
                <span className="text-lg">⚡</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLeaderboardClick();
                }}
                className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl shadow-lg hover:shadow-yellow-500/50 transition-all hover:scale-110 active:scale-95"
                aria-label="View Leaderboard"
              >
                <span className="text-xl">🏆</span>
              </button>
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="text-4xl text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all">
            →
          </div>
        </div>

        {/* Bottom racing texture */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
      </div>
    </div>
  );
}
