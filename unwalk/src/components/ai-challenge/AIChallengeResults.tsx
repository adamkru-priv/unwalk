interface AIChallengeResultsProps {
  playerSteps: number;
  aiSteps: number;
  won: boolean;
  opponentName: string;
  opponentEmoji: string;
  duration: 30 | 60;
  onPlayAgain: () => void;
  onBackToHome: () => void;
}

export function AIChallengeResults({
  playerSteps,
  aiSteps,
  won,
  opponentName,
  opponentEmoji,
  duration,
  onPlayAgain,
  onBackToHome,
}: AIChallengeResultsProps) {
  const difference = Math.abs(playerSteps - aiSteps);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 px-6 py-6 relative overflow-hidden flex flex-col justify-between">
      {/* Animated celebration/consolation background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {won ? (
          <>
            <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.3s' }}></div>
            <div className="absolute bottom-1/3 left-1/3 w-56 h-56 bg-green-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.6s' }}></div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-red-900/10 to-transparent"></div>
        )}
      </div>

      {/* Header Section */}
      <div className="relative z-10">
        <div className="text-center mb-6">
          <h1 className={`text-6xl font-black mb-3 ${
            won ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 animate-pulse' : 'text-white'
          }`} style={{
            textShadow: won ? '0 0 40px rgba(250, 204, 21, 0.5)' : 'none'
          }}>
            {won ? 'VICTORY!' : 'DEFEAT'}
          </h1>
          <p className="text-lg text-white/70 font-semibold">
            {won 
              ? `You beat ${opponentName}!` 
              : `${opponentName} was faster!`}
          </p>
        </div>

        {/* Score Comparison - Big Numbers */}
        <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <div className="text-5xl font-black text-white mb-1">{playerSteps}</div>
              <div className="text-xs text-white/50 font-bold uppercase tracking-wider">Your Steps</div>
            </div>
            
            <div className="px-4">
              <div className="text-3xl font-black text-white/30">VS</div>
            </div>
            
            <div className="text-center flex-1">
              <div className="text-5xl font-black text-white mb-1">{aiSteps}</div>
              <div className="text-xs text-white/50 font-bold uppercase tracking-wider">Bot Steps</div>
            </div>
          </div>

          {/* Difference indicator */}
          <div className="text-center pt-4 border-t border-white/10">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              won ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
            }`}>
              <span className="text-2xl">{won ? '🎯' : '😤'}</span>
              <span className={`text-sm font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                {difference} steps difference
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="relative z-10 space-y-3 mb-6">
        {/* Player Card */}
        <div className={`${
          won 
            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400/40' 
            : 'bg-white/5 border-white/10'
        } backdrop-blur-xl rounded-2xl p-4 border-2 transition-all`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                <span className="text-xl">👤</span>
              </div>
              <div>
                <div className="text-sm font-black text-white">YOU</div>
                <div className="text-xs text-white/50">in {duration}s</div>
              </div>
            </div>
            {won && <div className="text-2xl">🏆</div>}
          </div>
        </div>

        {/* AI Card */}
        <div className={`${
          !won 
            ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-400/40' 
            : 'bg-white/5 border-white/10'
        } backdrop-blur-xl rounded-2xl p-4 border-2 transition-all`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <span className="text-xl">{opponentEmoji}</span>
              </div>
              <div>
                <div className="text-sm font-black text-white">{opponentName.toUpperCase()}</div>
                <div className="text-xs text-white/50">in {duration}s</div>
              </div>
            </div>
            {!won && <div className="text-2xl">🏆</div>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="relative z-10 space-y-3">
        <button
          onClick={onPlayAgain}
          className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white py-4 rounded-2xl font-black text-base shadow-2xl shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="text-xl">🔄</span>
          <span>Play Again</span>
        </button>
        
        <button
          onClick={onBackToHome}
          className="w-full bg-white/5 backdrop-blur-lg hover:bg-white/10 text-white/90 py-3.5 rounded-2xl font-semibold text-sm transition-all border border-white/10 hover:border-white/20 hover:scale-[1.02] active:scale-95"
        >
          ← Back to Home
        </button>

        {/* Motivational tip */}
        <div className="text-center pt-2">
          <p className="text-white/40 text-xs italic">
            {won 
              ? "💪 Ready for a tougher challenge?" 
              : "🔥 Practice makes perfect!"}
          </p>
        </div>
      </div>
    </div>
  );
}
