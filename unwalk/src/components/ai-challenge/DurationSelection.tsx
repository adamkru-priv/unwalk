interface DurationSelectionProps {
  onSelectDuration: (duration: 30 | 60) => void;
  onBack: () => void;
}

export function DurationSelection({ onSelectDuration, onBack }: DurationSelectionProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-8 relative overflow-hidden">
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
        className="relative z-10 mb-6 text-white/60 hover:text-white flex items-center gap-2 transition-colors"
      >
        ← Back
      </button>

      <div className="relative z-10 text-center mb-12">
        <div className="inline-block mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full blur-xl opacity-60 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl">
              <span className="text-5xl">⚡</span>
            </div>
          </div>
        </div>
        <h1 className="text-5xl font-black text-white mb-3 tracking-tight">
          Sprint Mode
        </h1>
        <p className="text-cyan-400 text-lg font-bold">Choose your race duration</p>
      </div>

      <div className="relative z-10 space-y-4 max-w-md mx-auto">
        {/* 30 Second Challenge */}
        <button
          onClick={() => onSelectDuration(30)}
          className="group w-full relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/0 via-white/10 to-blue-600/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="relative p-8 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30">
                <span className="text-4xl">⚡</span>
              </div>
              <div className="text-left">
                <h3 className="text-4xl font-black text-white mb-1">30s</h3>
                <p className="text-cyan-100 text-sm font-bold uppercase tracking-wider">Lightning Sprint</p>
              </div>
            </div>
            <div className="text-5xl text-white/40 group-hover:text-white/90 group-hover:translate-x-2 transition-all">
              →
            </div>
          </div>
        </button>

        {/* 1 Minute Challenge */}
        <button
          onClick={() => onSelectDuration(60)}
          className="group w-full relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400/0 via-white/10 to-red-600/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="relative p-8 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30">
                <span className="text-4xl">🔥</span>
              </div>
              <div className="text-left">
                <h3 className="text-4xl font-black text-white mb-1">60s</h3>
                <p className="text-orange-100 text-sm font-bold uppercase tracking-wider">Endurance Race</p>
              </div>
            </div>
            <div className="text-5xl text-white/40 group-hover:text-white/90 group-hover:translate-x-2 transition-all">
              →
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
