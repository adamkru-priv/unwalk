interface DurationSelectionProps {
  onSelectDuration: (duration: 30) => void;
  onBack: () => void;
}

export function DurationSelection({ onSelectDuration, onBack }: DurationSelectionProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 relative overflow-hidden flex flex-col" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      {/* Dynamic grid background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0,240,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <button
        onClick={onBack}
        className="relative z-10 mb-3 text-white/60 hover:text-white flex items-center gap-2 transition-colors"
      >
        ← Back
      </button>

      <div className="relative z-10 text-center mb-4">
        <h1 className="text-3xl font-black text-white mb-1 tracking-tight">
          How to Play
        </h1>
        <p className="text-cyan-400 text-sm font-bold">30 Second Sprint Challenge</p>
      </div>

      {/* Instructions - Compact */}
      <div className="relative z-10 max-w-md mx-auto space-y-2.5 flex-1">
        {/* Instruction 1 */}
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 backdrop-blur-xl rounded-xl p-3.5 border border-cyan-400/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <h3 className="text-sm font-black text-white mb-0.5">Race Against AI</h3>
              <p className="text-white/60 text-xs leading-tight">30 seconds to beat your opponent!</p>
            </div>
          </div>
        </div>

        {/* Instruction 2 */}
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-xl p-3.5 border border-green-400/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-xl">👆</span>
            </div>
            <div>
              <h3 className="text-sm font-black text-white mb-0.5">Tap to Earn Steps</h3>
              <p className="text-white/60 text-xs leading-tight">Tap green <span className="font-bold text-green-400">+1</span> to add steps</p>
            </div>
          </div>
        </div>

        {/* Instruction 3 */}
        <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 backdrop-blur-xl rounded-xl p-3.5 border border-red-400/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-xl">💣</span>
            </div>
            <div>
              <h3 className="text-sm font-black text-white mb-0.5">Watch Out for Bombs!</h3>
              <p className="text-white/60 text-xs leading-tight">Red <span className="font-bold text-red-400">-3</span> button = lose 3 steps!</p>
            </div>
          </div>
        </div>

        {/* Instruction 4 */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-xl p-3.5 border border-purple-400/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-xl">🏆</span>
            </div>
            <div>
              <h3 className="text-sm font-black text-white mb-0.5">Win the Race</h3>
              <p className="text-white/60 text-xs leading-tight">More steps than opponent = victory!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Button - Compact */}
      <div className="relative z-10 mt-4">
        <button
          onClick={() => onSelectDuration(30)}
          className="group w-full relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/0 via-white/10 to-blue-600/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="relative py-4 px-6 flex items-center justify-center gap-2">
            <span className="text-xl font-black text-white uppercase tracking-wider">Continue</span>
            <div className="text-2xl text-white/90 group-hover:translate-x-2 transition-all">
              →
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
