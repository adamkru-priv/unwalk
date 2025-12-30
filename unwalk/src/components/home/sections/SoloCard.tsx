import type { UserChallenge } from '../../../types';

interface SoloCardProps {
  activeChallenge: UserChallenge | null;
  progress: number;
  onClick: () => void;
  variant?: 'carousel' | 'stack';
}

export function SoloCard({ activeChallenge, progress, onClick, variant = 'stack' }: SoloCardProps) {
  const outerClassName =
    variant === 'stack'
      ? 'w-full px-4'
      : 'w-[85%] flex-shrink-0 pl-5 pr-3';

  // ✅ FIX: Use real XP from database, not hardcoded calculation
  const xpReward = activeChallenge?.admin_challenge?.points || 0;

  return (
    <div className={outerClassName}>
      <div
        onClick={onClick}
        className={`relative rounded-3xl overflow-hidden cursor-pointer group transition-all shadow-2xl ${
          variant === 'stack' ? 'aspect-[16/9]' : 'aspect-[3/4]'
        }`}
      >
        {activeChallenge ? (
          // 🔥 NEW SEXY DESIGN - Active Challenge Card
          <>
            {/* Background Image (original, not gradient) */}
            <img
              src={activeChallenge.admin_challenge?.image_url}
              alt={activeChallenge.admin_challenge?.title}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
              style={{
                filter: activeChallenge.admin_challenge?.is_image_hidden
                  ? `blur(${Math.max(0, 20 - progress * 0.2)}px)`
                  : 'none',
              }}
            />
            
            {/* Gradient Overlay - Lighter & More Vibrant */}
            <div className="absolute inset-0 bg-gradient-to-t from-purple-900/95 via-purple-600/50 to-blue-500/40" />
            
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer opacity-50" />

            <div className="absolute inset-0 p-6 flex flex-col">
              {/* Top Section - Badge & XP */}
              <div className="flex items-start justify-between mb-4">
                {/* Active Badge - NO EMOJI */}
                <span className="bg-white/20 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-full border border-white/30 shadow-lg">
                  {activeChallenge.assigned_by ? 'SOCIAL' : 'ACTIVE'}
                </span>
                
                {/* XP Badge - Animated */}
                {xpReward > 0 && (
                  <div className="bg-yellow-400 text-gray-900 px-3 py-1.5 rounded-full shadow-xl animate-bounce">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">💎</span>
                      <span className="text-xs font-black">+{xpReward} XP</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Middle Section - Title & Info */}
              <div className="flex-1 flex flex-col justify-center mb-4">
                {/* Social Challenge - Sender info (if applicable) */}
                {activeChallenge.assigned_by && (
                  <div className="bg-gradient-to-r from-amber-500/30 to-orange-500/30 backdrop-blur-md border-2 border-amber-400/50 rounded-xl px-4 py-2.5 shadow-lg mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
                        <span className="text-xl">🤝</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-amber-200 font-semibold uppercase tracking-wide">Challenge from</div>
                        <div className="text-base text-white font-bold truncate mt-0.5">
                          {activeChallenge.assigned_by_name || 'Team Member'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Title */}
                <h3 className="text-white text-2xl font-black leading-tight mb-2 drop-shadow-2xl">
                  {activeChallenge.admin_challenge?.title}
                </h3>
              </div>

              {/* Bottom Section - Progress & CTA */}
              <div>
                {/* Steps info */}
                <div className="flex items-center justify-between text-white/90 text-sm font-semibold mb-3">
                  <span>{Math.min(activeChallenge.current_steps, activeChallenge.admin_challenge?.goal_steps || activeChallenge.current_steps).toLocaleString()} / {activeChallenge.admin_challenge?.goal_steps.toLocaleString()} steps</span>
                  {xpReward > 0 && <span className="text-yellow-400 text-xs font-black">💎 +{xpReward} XP</span>}
                </div>

                {/* Chunky Progress Bar with glow */}
                <div className="relative h-5 bg-white/20 backdrop-blur-sm rounded-full overflow-hidden mb-4 shadow-inner">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-lg transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${progress}%`,
                      boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)'
                    }}
                  >
                    {/* Shimmer effect inside progress bar */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </div>
                  {/* Progress text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-xs font-black drop-shadow-md">{progress}%</span>
                  </div>
                </div>

                {/* FAT CTA Button */}
                <button className="w-full bg-white text-purple-600 py-4 rounded-2xl font-black text-lg shadow-2xl hover:scale-105 active:scale-95 transition-transform duration-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                  🚀 LET'S WALK!
                </button>
              </div>
            </div>
          </>
        ) : (
          // No active challenge - show person walking solo in nature
          <>
            <img
              src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200&auto=format&fit=crop&q=80"
              alt="Solo walking adventure"
              className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/95 via-indigo-600/40 to-blue-500/30" />

            <div className="absolute inset-0 p-6 flex flex-col justify-between">
              {/* Top - Label & Badge */}
              <div className="flex items-start justify-between">
                <div className="text-xs font-bold text-blue-200 uppercase tracking-wide">Solo</div>
                <div className="bg-blue-500/90 backdrop-blur-sm text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
                  60+ ROUTES
                </div>
              </div>

              {/* Middle - Title */}
              <div className="flex-1 flex items-center justify-center min-h-[4.5rem]">
                <h3
                  className={`text-white text-center leading-tight uppercase drop-shadow-2xl whitespace-nowrap ${
                    variant === 'stack' ? 'text-3xl font-black' : 'text-4xl font-black'
                  }`}
                >
                  Move for Yourself
                </h3>
              </div>

              {/* Bottom - CTA */}
              <div className="h-5" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
