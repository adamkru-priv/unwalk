import { motion } from 'framer-motion';
import type { UserChallenge } from '../../../types';
import { calculateChallengePoints } from '../../../lib/api';

interface CompletedChallengesListProps {
  challenges: UserChallenge[];
  isGuest: boolean;
  onChallengeClick: (challenge: UserChallenge) => void;
}

export function CompletedChallengesList({ challenges, isGuest, onChallengeClick }: CompletedChallengesListProps) {
  if (challenges.length === 0) return null;

  const firstChallenge = challenges[0];
  const challengeName = firstChallenge.admin_challenge?.title || 'Challenge';
  const steps = Math.min(
    firstChallenge.current_steps, 
    firstChallenge.admin_challenge?.goal_steps || firstChallenge.current_steps
  );

  return (
    <section className="px-5">
      {/* Kompaktowy pasek z animacją pulse */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 p-4 shadow-lg animate-pulse"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Lewa strona - info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-3xl flex-shrink-0">🎁</div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-black text-white truncate">
                {challengeName}
              </h2>
              <div className="flex items-center gap-2 text-xs font-bold text-white/80">
                <span>{steps.toLocaleString()} steps</span>
                {!isGuest && firstChallenge.admin_challenge?.goal_steps && (
                  <>
                    <span>•</span>
                    <span>+{calculateChallengePoints(firstChallenge.admin_challenge.goal_steps, firstChallenge.admin_challenge.is_daily || false)} XP</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Prawa strona - przycisk */}
          <button
            onClick={() => onChallengeClick(firstChallenge)}
            className="flex-shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-purple-600 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
          >
            CLAIM
          </button>
        </div>
      </motion.div>
    </section>
  );
}
