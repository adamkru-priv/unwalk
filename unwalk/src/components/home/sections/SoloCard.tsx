import type { UserChallenge } from '../../../types';

interface SoloCardProps {
  activeChallenge: UserChallenge | null;
  progress: number;
  onClick: () => void;
  variant?: 'carousel' | 'stack';
}

export function SoloCard({ activeChallenge, progress, onClick, variant = 'carousel' }: SoloCardProps) {
  const outerClassName =
    variant === 'stack'
      ? 'w-full px-4'
      : 'w-[85%] flex-shrink-0 pl-5 pr-3';

  return (
    <div className={outerClassName}>
      <div
        onClick={onClick}
        className={`relative rounded-3xl overflow-hidden cursor-pointer group border-2 border-gray-200 dark:border-white/10 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all shadow-xl ${
          variant === 'stack' ? 'aspect-[16/9]' : 'aspect-[3/4]'
        }`}
      >
        {activeChallenge ? (
          // Has active challenge - show challenge image
          <>
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
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-gray-900/60 dark:from-[#0B101B]/90 dark:via-[#0B101B]/20 dark:to-[#0B101B]/60" />

            <div className="absolute inset-0 p-6 flex flex-col justify-between">
              {/* Top - Label & Badge */}
              <div className="flex items-start justify-between">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                  {activeChallenge.assigned_by ? 'Social' : 'Solo'}
                </div>
                <span className="bg-blue-500 text-white text-xs font-black px-3 py-1.5 rounded-full animate-pulse">
                  ACTIVE
                </span>
              </div>

              {/* Bottom - Info */}
              <div>
                {/* Social Challenge - Show sender */}
                {activeChallenge.assigned_by && (
                  <div className="mb-3 bg-gradient-to-r from-amber-500/30 to-orange-500/30 backdrop-blur-md border-2 border-amber-400/50 rounded-xl px-4 py-2.5 shadow-lg">
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

                <h3
                  className={`text-white leading-tight mb-3 line-clamp-2 ${
                    variant === 'stack' ? 'text-xl font-black' : 'text-2xl font-black'
                  }`}
                >
                  {activeChallenge.admin_challenge?.title}
                </h3>
                <div className="text-sm text-white/80 mb-3">
                  {activeChallenge.current_steps.toLocaleString()} / {activeChallenge.admin_challenge?.goal_steps.toLocaleString()} steps
                </div>
                <div className="bg-white/20 rounded-full h-2 overflow-hidden mb-2">
                  <div className="bg-white h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-white text-sm font-bold text-right">{progress}%</div>
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
