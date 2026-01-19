import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface AIChallengeResultsProps {
  playerSteps: number;
  aiSteps: number;
  won: boolean;
  opponentName: string;
  opponentEmoji: string;
  duration: 30;
  difficulty: 'easy' | 'medium' | 'hard';
  onPlayAgain: () => void;
  onBackToHome: () => void;
  onViewLeaderboard: () => void;
}

export function AIChallengeResults({
  playerSteps,
  aiSteps,
  won,
  opponentName,
  opponentEmoji,
  difficulty,
  onPlayAgain,
  onBackToHome,
  onViewLeaderboard,
}: AIChallengeResultsProps) {
  const difference = Math.abs(playerSteps - aiSteps);
  const [saved, setSaved] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  // Show buttons after 2.5 seconds delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButtons(true);
    }, 2500);
    
    return () => clearTimeout(timer);
  }, []);

  // Save score to database on mount
  useEffect(() => {
    const saveScore = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.warn('No user logged in, cannot save score');
          return;
        }

        const { error } = await supabase
          .from('sprint_challenge_scores')
          .insert({
            user_id: user.id,
            score: playerSteps,
            difficulty,
            opponent_name: opponentName,
            opponent_steps: aiSteps,
            won,
          });

        if (error) {
          console.error('Error saving score:', error);
        } else {
          console.log('Score saved successfully!');
          setSaved(true);
        }
      } catch (err) {
        console.error('Error saving score:', err);
      }
    };

    saveScore();
  }, [playerSteps, aiSteps, won, difficulty, opponentName]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 px-6 relative overflow-hidden flex flex-col items-center justify-center" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
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

      {/* Leaderboard button - Small trophy in top right corner */}
      <button
        onClick={onViewLeaderboard}
        className="absolute top-4 right-4 z-50 w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full shadow-2xl shadow-yellow-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <span className="text-2xl">🏆</span>
      </button>

      {/* Main Content - Centered */}
      <div className="relative z-10 w-full max-w-md space-y-4 animate-fadeIn">
        {/* Big Result Header - Smaller */}
        <div className="text-center">
          <div className={`text-5xl mb-2 ${won ? 'animate-pulse' : ''}`}>
            {won ? '🏆' : '😔'}
          </div>
          <h1 className={`text-5xl font-black mb-2 animate-slideDown ${
            won ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500' : 'text-white'
          }`} style={{
            textShadow: won ? '0 0 40px rgba(250, 204, 21, 0.5)' : 'none',
            animationDelay: '0.1s'
          }}>
            {won ? 'VICTORY!' : 'DEFEAT'}
          </h1>
          <p className="text-lg text-white/80 font-bold mb-1.5 animate-slideDown" style={{ animationDelay: '0.2s' }}>
            {won 
              ? `You beat ${opponentName}!` 
              : `${opponentName} was faster!`}
          </p>
          {saved && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30 animate-slideDown" style={{ animationDelay: '0.3s' }}>
              <span className="text-xs">✓</span>
              <span className="text-xs text-green-400 font-bold">Score saved!</span>
            </div>
          )}
        </div>

        {/* Score Display - Smaller and More Compact */}
        <div className="bg-black/60 backdrop-blur-2xl rounded-2xl p-5 border-2 border-white/20 shadow-2xl animate-scaleIn" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-center gap-6 mb-4">
            {/* Player Score */}
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">👤</span>
              </div>
              <div className={`text-5xl font-black mb-1 ${won ? 'text-cyan-400' : 'text-white'}`} style={{
                textShadow: won ? '0 0 30px rgba(6, 182, 212, 0.6)' : 'none'
              }}>
                {playerSteps}
              </div>
              <div className="text-xs text-white/60 font-bold uppercase tracking-wider">You</div>
            </div>

            {/* VS Divider */}
            <div className="text-2xl font-black text-white/20">VS</div>

            {/* AI Score */}
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">{opponentEmoji}</span>
              </div>
              <div className={`text-5xl font-black mb-1 ${!won ? 'text-orange-400' : 'text-white'}`} style={{
                textShadow: !won ? '0 0 30px rgba(249, 115, 22, 0.6)' : 'none'
              }}>
                {aiSteps}
              </div>
              <div className="text-xs text-white/60 font-bold uppercase tracking-wider">{opponentName}</div>
            </div>
          </div>

          {/* Difference Badge - Smaller */}
          <div className="text-center pt-3 border-t border-white/10">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
              won ? 'bg-green-500/20 border-2 border-green-500/40' : 'bg-red-500/20 border-2 border-red-500/40'
            }`}>
              <span className="text-lg">{won ? '🎯' : '😤'}</span>
              <span className={`text-sm font-bold ${won ? 'text-green-300' : 'text-red-300'}`}>
                {difference} steps difference
              </span>
            </div>
          </div>
        </div>

        {/* Buttons - Without View Leaderboard */}
        <div className={`space-y-2.5 transition-all duration-500 ${
          showButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}>
          <button
            onClick={onPlayAgain}
            disabled={!showButtons}
            className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white py-3.5 rounded-2xl font-black text-base shadow-2xl shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="text-xl">🔄</span>
            <span>Play Again</span>
          </button>
          
          <button
            onClick={onBackToHome}
            disabled={!showButtons}
            className="w-full bg-white/5 backdrop-blur-lg hover:bg-white/10 text-white/90 py-3 rounded-2xl font-semibold text-sm transition-all border border-white/10 hover:border-white/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            ← Back to Home
          </button>

          {/* Motivational tip */}
          <div className="text-center pt-1">
            <p className="text-white/40 text-xs italic">
              {won 
                ? "💪 Ready for a tougher challenge?" 
                : "🔥 Practice makes perfect!"}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .animate-slideDown {
          animation: slideDown 0.5s ease-out forwards;
        }

        .animate-scaleIn {
          animation: scaleIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
