import { motion } from 'framer-motion';
import type { UserChallenge } from '../../../types';

interface CompletedChallengesListProps {
  challenges: UserChallenge[];
  userTier: 'basic' | 'pro';
  onChallengeClick: (challenge: UserChallenge) => void;
}

export function CompletedChallengesList({ challenges, userTier, onChallengeClick }: CompletedChallengesListProps) {
  if (challenges.length === 0) return null;

  return (
    <section className="px-5">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1B2140] via-[#121827] to-[#0B101B] p-5 shadow-[0_20px_60px_-40px_rgba(139,92,246,0.65)]">
        {/* glow */}
        <div className="pointer-events-none absolute -top-28 -right-28 h-72 w-72 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-purple-400/30 bg-purple-500/10 text-purple-200">
              <span className="text-xl">{userTier === 'pro' ? '🎁' : '✓'}</span>
            </div>
            <div>
              <h2 className="text-sm font-black text-purple-200 uppercase tracking-[0.18em]">
                {userTier === 'pro' ? 'Rewards Ready' : 'Ready to Claim'}
              </h2>
              <div className="text-[11px] text-white/50">
                {challenges.length} {challenges.length === 1 ? 'challenge' : 'challenges'} completed
              </div>
            </div>
          </div>

          {userTier === 'pro' && (
            <div className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 px-3 py-1 text-[10px] font-black text-[#0B101B] shadow-lg">
              CLAIM
            </div>
          )}
        </div>

        <div className="relative space-y-3">
          {challenges.map((challenge, idx) => (
            <motion.button
              key={challenge.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              onClick={() => onChallengeClick(challenge)}
              className="group w-full rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 backdrop-blur-xl p-3.5 transition-all text-left flex items-center gap-3.5 hover:border-purple-400/30 hover:shadow-[0_18px_50px_-30px_rgba(139,92,246,0.75)]"
            >
              <div className="relative h-14 w-14 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-purple-400/25 group-hover:ring-purple-300/60 transition-all">
                <img
                  src={challenge.admin_challenge?.image_url}
                  alt={challenge.admin_challenge?.title}
                  className="w-full h-full object-cover scale-[1.02] group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-black text-white text-sm truncate">
                    {challenge.admin_challenge?.title}
                  </h3>
                  <span className="flex-shrink-0 rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-bold text-white/60">
                    {challenge.current_steps.toLocaleString()} steps
                  </span>
                </div>

                <div className="mt-1 text-xs text-white/55">
                  ≈ {((challenge.current_steps * 0.8) / 1000).toFixed(1)} km
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs font-bold text-purple-200/90 group-hover:text-purple-100 transition-colors">
                    {userTier === 'pro' ? 'Tap to claim reward' : 'Tap to view completion'}
                  </div>
                  <div className="text-purple-200/60 group-hover:text-purple-100 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
