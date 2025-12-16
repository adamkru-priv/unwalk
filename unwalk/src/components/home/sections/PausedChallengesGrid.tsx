import type { UserChallenge } from '../../../types';

interface PausedChallengesGridProps {
  challenges: UserChallenge[];
  userTier: 'basic' | 'pro';
  onResumeChallenge: (challenge: UserChallenge) => void;
  formatActiveTime: (challenge: UserChallenge) => string;
  calculateProgress: (challenge: UserChallenge) => number;
}

export function PausedChallengesGrid({ 
  challenges, 
  userTier, 
  onResumeChallenge,
  formatActiveTime,
  calculateProgress 
}: PausedChallengesGridProps) {
  if (userTier !== 'pro' || challenges.length === 0) return null;

  return (
    <section className="px-5">
      <h2 className="text-xs font-bold text-gray-500 dark:text-white/60 mb-3 uppercase tracking-wider flex items-center gap-2">
        <span>⏸</span>
        <span>Paused Challenges</span>
      </h2>
      
      <div className="grid grid-cols-2 gap-3">
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            onClick={() => onResumeChallenge(challenge)}
            className="relative aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer group border-2 border-gray-200 dark:border-white/10 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all"
          >
            {/* Background Image - blurred */}
            <img
              src={challenge.admin_challenge?.image_url}
              alt={challenge.admin_challenge?.title}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'blur(8px)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/40 to-gray-900/60 dark:from-[#0B101B]/95 dark:via-[#0B101B]/40 dark:to-[#0B101B]/60" />
            
            <div className="absolute inset-0 p-4 flex flex-col justify-between">
              {/* Top - Type Badge & Time */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  {challenge.assigned_by ? (
                    <span className="bg-emerald-500/80 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-full border border-emerald-400/50 inline-block">
                      SOCIAL
                    </span>
                  ) : (
                    <span className="bg-blue-500/80 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-full border border-blue-400/50 inline-block">
                      SOLO
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-white/70 text-[10px]">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{formatActiveTime(challenge)}</span>
                  </div>
                </div>
                <span className="text-white text-xs font-bold">
                  {calculateProgress(challenge)}%
                </span>
              </div>
              
              {/* Bottom - Info */}
              <div>
                <h3 className="text-sm font-bold text-white leading-tight mb-3 line-clamp-2">
                  {challenge.admin_challenge?.title}
                </h3>
                
                <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <span>Resume</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
