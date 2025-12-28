interface SocialCardProps {
  teamActiveChallenges: any[];
  onTeamClick: () => void;
  variant?: 'carousel' | 'stack';
  isGuest?: boolean;
}

export function SocialCard({
  teamActiveChallenges,
  onTeamClick,
  variant = 'carousel',
  isGuest = false,
}: SocialCardProps) {
  const outerClassName =
    variant === 'stack'
      ? 'w-full px-4'
      : 'w-[85%] flex-shrink-0 pr-5 pl-3';

  return (
    <div className={outerClassName}>
      <div
        onClick={onTeamClick}
        className={`relative rounded-3xl overflow-hidden cursor-pointer group transition-all shadow-2xl ${
          variant === 'stack' ? 'aspect-[16/9]' : 'aspect-[3/4]'
        }`}
      >
        {/* 🔥 NEW SEXY DESIGN - Social Card */}
        {/* Animated gradient background - FRESH TEAL/CYAN theme (ocean, flow, social!) */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-400 via-cyan-500 to-sky-500" />
        
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        
        {/* Animated shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer opacity-50" />

        <div className="absolute inset-0 p-6 flex flex-col">
          {/* Top Section - Badge */}
          <div className="flex items-start justify-between mb-4">
            <span className="bg-white/20 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-full border border-white/30 shadow-lg">
              SOCIAL
            </span>
            
            {teamActiveChallenges.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm text-cyan-700 text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
                {teamActiveChallenges.length} ACTIVE
              </div>
            )}
          </div>

          {/* Middle Section - Title ONLY */}
          <div className="flex-1 flex flex-col items-center justify-center text-center mb-4">
            {/* Title */}
            <h3 className="text-white text-2xl font-black leading-tight mb-2 drop-shadow-lg uppercase">
              Challenge Your Friends
            </h3>
            
            {isGuest && (
              <p className="text-white/90 text-sm font-semibold">Sign in to compete with friends</p>
            )}
          </div>

          {/* Bottom Section - CTA Only */}
          <div>
            {/* FAT CTA Button */}
            <button className="w-full bg-white text-cyan-600 py-4 rounded-2xl font-black text-lg shadow-2xl hover:scale-105 active:scale-95 transition-transform duration-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]">
              👊 CHALLENGE FRIEND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
