import { useState, useEffect, useRef } from 'react';
import { useChallengeStore } from '../../stores/useChallengeStore';

interface AIChallengeActiveProps {
  duration: 30;
  opponentSteps: number;
  opponentName: string;
  opponentEmoji: string;
  onFinish: (playerSteps: number, aiSteps: number, won: boolean) => void;
}

export function AIChallengeActive({
  duration,
  opponentSteps,
  opponentName,
  opponentEmoji,
  onFinish,
}: AIChallengeActiveProps) {
  const [timeLeft, setTimeLeft] = useState<number>(duration);
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [playerSteps, setPlayerSteps] = useState(0);
  const [aiSteps, setAiSteps] = useState(0);
  const [buttonPosition, setButtonPosition] = useState({ top: '50%', left: '20%' });
  const [isBomb, setIsBomb] = useState(false);
  const [bombsUsed, setBombsUsed] = useState(0);
  const [showBombExplosion, setShowBombExplosion] = useState(false);

  // Use refs to completely isolate timer from React re-renders
  const timerRef = useRef<number | null>(null);
  const aiTimerRef = useRef<number | null>(null);
  const bombTimerRef = useRef<number | null>(null);
  const playerStepsRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const hasFinishedRef = useRef(false);
  const clickCountRef = useRef(0);

  const todaySteps = useChallengeStore((s) => s.todaySteps);
  const setTodaySteps = useChallengeStore((s) => s.setTodaySteps);

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Sync playerStepsRef whenever playerSteps changes
  useEffect(() => {
    playerStepsRef.current = playerSteps;
  }, [playerSteps]);

  // Auto-hide bomb after 1 second
  useEffect(() => {
    if (isBomb) {
      // Clear any existing bomb timer
      if (bombTimerRef.current) {
        clearTimeout(bombTimerRef.current);
      }

      // Set timer to hide bomb after 1 second
      bombTimerRef.current = setTimeout(() => {
        setIsBomb(false);
        console.log('💨 Bomb avoided! It disappeared.');
      }, 1000);

      return () => {
        if (bombTimerRef.current) {
          clearTimeout(bombTimerRef.current);
        }
      };
    }
  }, [isBomb]);

  const handleButtonClick = () => {
    if (!isLocalhost) return;

    clickCountRef.current += 1;

    if (isBomb) {
      // Bomb was clicked - show explosion effect!
      setShowBombExplosion(true);
      
      // Hide explosion after animation
      setTimeout(() => {
        setShowBombExplosion(false);
      }, 800);
      
      // Subtract 3 steps
      setPlayerSteps(prev => Math.max(0, prev - 3));
      setTodaySteps(Math.max(0, todaySteps - 3));
      setIsBomb(false);
      
      // Clear the bomb timer since it was clicked
      if (bombTimerRef.current) {
        clearTimeout(bombTimerRef.current);
      }
      console.log('💥 Bomb clicked! -3 steps');
    } else {
      // Normal click - add 1 step
      setPlayerSteps(prev => prev + 1);
      setTodaySteps(todaySteps + 1);
    }

    // Move button randomly after any click
    const shouldMove = Math.random() > 0.6;
    if (shouldMove) {
      const zones = [
        { top: 25, topRange: 15, left: 10, leftRange: 15 },
        { top: 25, topRange: 15, left: 75, leftRange: 15 },
        { top: 70, topRange: 15, left: 10, leftRange: 15 },
        { top: 70, topRange: 15, left: 75, leftRange: 15 },
      ];

      const selectedZone = zones[Math.floor(Math.random() * zones.length)];
      const newTop = selectedZone.top + (Math.random() * selectedZone.topRange);
      const newLeft = selectedZone.left + (Math.random() * selectedZone.leftRange);

      setButtonPosition({
        top: `${newTop}%`,
        left: `${newLeft}%`
      });
    }
  };

  // Trigger bomb randomly after successful clicks (separate from click handler)
  useEffect(() => {
    if (!started || isBomb) return;

    // Only trigger after player has made some clicks
    if (clickCountRef.current >= 3 && bombsUsed < 2) {
      // Check periodically if we should spawn a bomb
      const bombCheckInterval = setInterval(() => {
        if (!isBomb && bombsUsed < 2) {
          const shouldSpawnBomb = Math.random() < 0.08; // 8% chance every 500ms
          if (shouldSpawnBomb) {
            setIsBomb(true);
            setBombsUsed(prev => prev + 1);
            console.log('💣 Bomb spawned! Click it or avoid it!');
          }
        }
      }, 500);

      return () => clearInterval(bombCheckInterval);
    }
  }, [started, isBomb, bombsUsed, clickCountRef.current]);

  // Countdown before start
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setStarted(true);
    }
  }, [countdown]);

  // Main timer - runs ONCE when started
  useEffect(() => {
    if (!started) return;

    // Store start time
    startTimeRef.current = Date.now();
    hasFinishedRef.current = false;

    // Clear any existing timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (aiTimerRef.current) clearInterval(aiTimerRef.current);

    // Timer based on elapsed time, not state
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = duration - elapsed;

      if (remaining <= 0 && !hasFinishedRef.current) {
        hasFinishedRef.current = true;
        if (timerRef.current) clearInterval(timerRef.current);
        if (aiTimerRef.current) clearInterval(aiTimerRef.current);

        setTimeLeft(0);
        // Use ref to get latest playerSteps
        onFinish(playerStepsRef.current, opponentSteps, playerStepsRef.current >= opponentSteps);
      } else if (remaining > 0) {
        setTimeLeft(remaining);
      }
    }, 100); // Update every 100ms for smooth display

    // AI steps timer
    aiTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const currentAiSteps = Math.floor(opponentSteps * progress);
      setAiSteps(currentAiSteps);

      if (progress >= 1 && aiTimerRef.current) {
        clearInterval(aiTimerRef.current);
      }
    }, 100);

    // Cleanup
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (aiTimerRef.current) clearInterval(aiTimerRef.current);
      if (bombTimerRef.current) clearTimeout(bombTimerRef.current);
    };
  }, [started]);

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-96 h-96 rounded-full border-4 border-cyan-500/20 animate-ping"></div>
          <div className="absolute w-72 h-72 rounded-full border-4 border-cyan-400/30 animate-ping" style={{ animationDelay: '0.2s' }}></div>
          <div className="absolute w-48 h-48 rounded-full border-4 border-cyan-300/40 animate-ping" style={{ animationDelay: '0.4s' }}></div>
        </div>
        <div className="text-center relative z-10">
          <div className="text-[10rem] font-black text-white mb-4 animate-pulse" style={{
            textShadow: '0 0 60px rgba(6, 182, 212, 0.8), 0 0 30px rgba(6, 182, 212, 0.6)'
          }}>
            {countdown}
          </div>
          <p className="text-4xl text-cyan-400 font-black uppercase tracking-wider">Get Ready!</p>
        </div>
      </div>
    );
  }

  const isWinning = playerSteps > aiSteps;
  const playerProgress = Math.min((playerSteps / opponentSteps) * 100, 100);
  const aiProgress = Math.min((aiSteps / opponentSteps) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 relative overflow-hidden flex flex-col" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
      {/* Bomb Explosion Effect */}
      {showBombExplosion && (
        <div className="fixed inset-0 z-[100] pointer-events-none animate-bombShake">
          {/* Red flash overlay */}
          <div className="absolute inset-0 bg-red-600 animate-bombFlash"></div>
          
          {/* Explosion waves */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-orange-500 animate-explosionWave1 opacity-80"></div>
            <div className="absolute w-32 h-32 rounded-full bg-red-500 animate-explosionWave2 opacity-60"></div>
            <div className="absolute w-32 h-32 rounded-full bg-yellow-500 animate-explosionWave3 opacity-40"></div>
          </div>
          
          {/* Explosion particles */}
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-orange-500 rounded-full animate-particle1"></div>
            <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-red-500 rounded-full animate-particle2"></div>
            <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-yellow-500 rounded-full animate-particle3"></div>
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-orange-400 rounded-full animate-particle4"></div>
            <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-red-400 rounded-full animate-particle5"></div>
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-yellow-400 rounded-full animate-particle6"></div>
            <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-orange-600 rounded-full animate-particle7"></div>
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-red-600 rounded-full animate-particle8"></div>
          </div>
          
          {/* Big explosion emoji */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-[20rem] animate-explosionEmoji">💥</div>
          </div>
          
          {/* -3 indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-9xl font-black text-red-500 animate-scoreDecrease" style={{
              textShadow: '0 0 40px rgba(239, 68, 68, 1), 0 0 80px rgba(239, 68, 68, 0.8)'
            }}>
              -3
            </div>
          </div>
        </div>
      )}

      {/* Dynamic background based on who's winning */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={`absolute top-1/3 left-1/4 w-96 h-96 rounded-full blur-3xl transition-all duration-1000 ${
            isWinning ? 'bg-cyan-500/30 scale-125' : 'bg-cyan-500/10 scale-100'
          }`}
        ></div>
        <div 
          className={`absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full blur-3xl transition-all duration-1000 ${
            !isWinning ? 'bg-orange-500/30 scale-125' : 'bg-orange-500/10 scale-100'
          }`}
        ></div>
      </div>

      {/* Timer at top */}
      <div className="relative z-10 text-center mb-6 mt-4">
        <div className="inline-flex flex-col items-center gap-1 px-8 py-3 bg-black/60 backdrop-blur-xl border-2 border-cyan-500/50 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-yellow-500' : 'bg-green-500'
            }`}></div>
            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Time Left</span>
          </div>
          <div className="min-w-[100px] flex justify-center">
            <div className={`text-6xl font-black transition-colors duration-300 ${
              timeLeft <= 5 ? 'text-red-500 animate-pulse' : timeLeft <= 10 ? 'text-yellow-400' : 'text-white'
            }`} style={{ 
              textShadow: timeLeft <= 5 
                ? '0 0 30px rgba(239, 68, 68, 0.8)' 
                : timeLeft <= 10
                ? '0 0 30px rgba(250, 204, 21, 0.6)'
                : '0 0 30px rgba(6, 182, 212, 0.5)',
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"'
            }}>
              {timeLeft}
            </div>
          </div>
          <div className="text-xs font-bold text-white/40">seconds</div>
        </div>
      </div>

      {/* Player Card - Compact & Modern */}
      <div className="relative z-10 mb-4">
        <div className={`bg-gradient-to-r ${
          isWinning 
            ? 'from-cyan-500/20 to-blue-500/20 border-cyan-400/50' 
            : 'from-slate-800/40 to-slate-700/40 border-slate-600/30'
        } backdrop-blur-xl rounded-3xl p-6 border-2 transition-all duration-500`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">👤</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white/60 uppercase tracking-wider">You</div>
                {isWinning && <div className="text-xl">🔥</div>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black text-white" style={{
                textShadow: '0 0 20px rgba(6, 182, 212, 0.5)'
              }}>{playerSteps}</div>
              <div className="text-xs text-white/50 font-bold uppercase">Steps</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-3 bg-black/30 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300 ease-out"
              style={{ 
                width: `${playerProgress}%`,
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.6)'
              }}
            ></div>
          </div>
          <div className="text-right mt-2 text-xs text-white/40 font-bold">
            {Math.round(playerProgress)}% • Target: {opponentSteps}
          </div>
        </div>
      </div>

      {/* VS Divider */}
      <div className="relative z-10 text-center my-4">
        <div className="inline-block px-6 py-2 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full">
          <span className="text-lg font-black text-white/40">VS</span>
        </div>
      </div>

      {/* AI Card - Compact & Modern */}
      <div className="relative z-10 mb-6">
        <div className={`bg-gradient-to-r ${
          !isWinning 
            ? 'from-orange-500/20 to-red-500/20 border-orange-400/50' 
            : 'from-slate-800/40 to-slate-700/40 border-slate-600/30'
        } backdrop-blur-xl rounded-3xl p-6 border-2 transition-all duration-500`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">{opponentEmoji}</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white/60 uppercase tracking-wider">{opponentName}</div>
                {!isWinning && <div className="text-xl">🔥</div>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black text-white" style={{
                textShadow: '0 0 20px rgba(249, 115, 22, 0.5)'
              }}>{aiSteps}</div>
              <div className="text-xs text-white/50 font-bold uppercase">Steps</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-3 bg-black/30 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-300 ease-out"
              style={{ 
                width: `${aiProgress}%`,
                boxShadow: '0 0 20px rgba(249, 115, 22, 0.6)'
              }}
            ></div>
          </div>
          <div className="text-right mt-2 text-xs text-white/40 font-bold">
            {Math.round(aiProgress)}% • Target: {opponentSteps}
          </div>
        </div>
      </div>

      {/* Status text */}
      <div className="relative z-10 text-center mt-auto pb-4">
        <p className={`text-xl font-black uppercase tracking-wider transition-all duration-300 ${
          isWinning ? 'text-cyan-400' : 'text-orange-400'
        }`}>
          {isWinning ? "🏁 You're Leading!" : "⚡ Catch Up!"}
        </p>
        <p className="text-sm text-white/40 mt-1 font-medium">
          {Math.abs(playerSteps - aiSteps)} steps {isWinning ? 'ahead' : 'behind'}
        </p>
      </div>

      {/* Floating button - either +1 or -3 bomb */}
      {isLocalhost && (
        <button
          onClick={handleButtonClick}
          className={`fixed z-50 w-16 h-16 ${
            isBomb 
              ? 'bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/50' 
              : 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/50'
          } active:scale-90 text-white rounded-full shadow-2xl flex items-center justify-center text-xl font-black transition-all border-3 border-white/30`}
          style={{ 
            top: buttonPosition.top, 
            left: buttonPosition.left,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {isBomb ? '💣-3' : '+1'}
        </button>
      )}

      <style>{`
        @keyframes bombShake {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-10px, -5px); }
          20% { transform: translate(10px, 5px); }
          30% { transform: translate(-8px, 3px); }
          40% { transform: translate(8px, -3px); }
          50% { transform: translate(-6px, -2px); }
          60% { transform: translate(6px, 2px); }
          70% { transform: translate(-4px, 1px); }
          80% { transform: translate(4px, -1px); }
          90% { transform: translate(-2px, 0px); }
        }

        @keyframes bombFlash {
          0% { opacity: 0; }
          10% { opacity: 0.8; }
          30% { opacity: 0.4; }
          50% { opacity: 0.6; }
          100% { opacity: 0; }
        }

        @keyframes explosionWave1 {
          0% { transform: scale(0); opacity: 0.8; }
          100% { transform: scale(15); opacity: 0; }
        }

        @keyframes explosionWave2 {
          0% { transform: scale(0); opacity: 0.6; }
          100% { transform: scale(18); opacity: 0; }
        }

        @keyframes explosionWave3 {
          0% { transform: scale(0); opacity: 0.4; }
          100% { transform: scale(21); opacity: 0; }
        }

        @keyframes explosionEmoji {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          20% { transform: scale(1.5) rotate(180deg); opacity: 1; }
          80% { transform: scale(1.5) rotate(360deg); opacity: 1; }
          100% { transform: scale(2) rotate(360deg); opacity: 0; }
        }

        @keyframes scoreDecrease {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          20% { transform: translateY(-50px) scale(1.2); opacity: 1; }
          80% { transform: translateY(-100px) scale(1); opacity: 1; }
          100% { transform: translateY(-150px) scale(0.8); opacity: 0; }
        }

        @keyframes particle1 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(-200px, -200px); opacity: 0; }
        }

        @keyframes particle2 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(200px, -180px); opacity: 0; }
        }

        @keyframes particle3 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(-180px, 200px); opacity: 0; }
        }

        @keyframes particle4 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(180px, 190px); opacity: 0; }
        }

        @keyframes particle5 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(-220px, 0); opacity: 0; }
        }

        @keyframes particle6 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(220px, 0); opacity: 0; }
        }

        @keyframes particle7 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(0, -220px); opacity: 0; }
        }

        @keyframes particle8 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(0, 220px); opacity: 0; }
        }

        .animate-bombShake {
          animation: bombShake 0.6s ease-in-out;
        }

        .animate-bombFlash {
          animation: bombFlash 0.6s ease-in-out;
        }

        .animate-explosionWave1 {
          animation: explosionWave1 0.8s ease-out;
        }

        .animate-explosionWave2 {
          animation: explosionWave2 0.8s ease-out 0.1s;
        }

        .animate-explosionWave3 {
          animation: explosionWave3 0.8s ease-out 0.2s;
        }

        .animate-explosionEmoji {
          animation: explosionEmoji 0.8s ease-out;
        }

        .animate-scoreDecrease {
          animation: scoreDecrease 0.8s ease-out;
        }

        .animate-particle1 {
          animation: particle1 0.8s ease-out;
        }

        .animate-particle2 {
          animation: particle2 0.8s ease-out;
        }

        .animate-particle3 {
          animation: particle3 0.8s ease-out;
        }

        .animate-particle4 {
          animation: particle4 0.8s ease-out;
        }

        .animate-particle5 {
          animation: particle5 0.8s ease-out;
        }

        .animate-particle6 {
          animation: particle6 0.8s ease-out;
        }

        .animate-particle7 {
          animation: particle7 0.8s ease-out;
        }

        .animate-particle8 {
          animation: particle8 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}
