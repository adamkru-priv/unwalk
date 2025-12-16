interface SocialCardProps {
  teamActiveChallenges: any[];
  onTeamClick: () => void;
}

export function SocialCard({ teamActiveChallenges, onTeamClick }: SocialCardProps) {
  return (
    <div className="w-[85%] flex-shrink-0 pr-5 pl-3">
      <div
        onClick={onTeamClick}
        className="relative aspect-[3/4] rounded-3xl overflow-hidden cursor-pointer group border-2 border-gray-200 dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all shadow-xl"
      >
        {/* Family/friends walking together outdoors */}
        <img
          src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&auto=format&fit=crop&q=80"
          alt="Family activity together"
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/95 via-teal-600/40 to-cyan-500/30" />
        
        <div className="absolute inset-0 p-6 flex flex-col justify-between">
          {/* Top - Label */}
          <div className="flex items-start justify-between">
            <div className="text-xs font-bold text-emerald-200 uppercase tracking-wide">Social</div>
            {teamActiveChallenges.length > 0 && (
              <div className="bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
                {teamActiveChallenges.length} ACTIVE
              </div>
            )}
          </div>
          
          {/* Middle - Title */}
          <div className="flex-1 flex items-center justify-center">
            <h3 className="text-4xl font-black text-white text-center leading-tight uppercase drop-shadow-2xl">
              Move a<br />friend
            </h3>
          </div>
          
          {/* Bottom - CTA */}
          <div className="flex items-center justify-between text-white text-sm font-bold">
            <span>{teamActiveChallenges.length > 0 ? 'View challenges' : 'Invite family'}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
