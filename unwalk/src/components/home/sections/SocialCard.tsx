import type { TeamMember } from '../../../lib/auth';
import type { ChallengeAssignmentWithProgress } from '../../../lib/api';

interface SocialCardProps {
  teamActiveChallenges: any[];
  onTeamClick: () => void;
  variant?: 'carousel' | 'stack';
  teamMembers?: TeamMember[];
  isGuest?: boolean;
  onQuickAssign?: (member: TeamMember) => void;
  sentAssignments?: ChallengeAssignmentWithProgress[];
}

export function SocialCard({
  teamActiveChallenges,
  onTeamClick,
  variant = 'carousel',
  teamMembers = [],
  isGuest = false,
  onQuickAssign,
  sentAssignments = [],
}: SocialCardProps) {
  const outerClassName =
    variant === 'stack'
      ? 'w-full px-4'
      : 'w-[85%] flex-shrink-0 pr-5 pl-3';

  const showQuickAssign = variant === 'stack' && !isGuest && teamMembers.length > 0;
  const quickMembers = teamMembers.slice(0, 3);

  const initials = (nameOrEmail: string) => {
    const clean = nameOrEmail.trim();
    if (!clean) return '?';
    const parts = clean.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '?';
    const second = (parts[1]?.[0] ?? parts[0]?.[1] ?? '').toString();
    return (first + second).toUpperCase();
  };

  const progressForMember = (memberId: string) => {
    // Only consider the currently active challenge for that recipient.
    const a = sentAssignments
      .filter((x) => x.recipient_id === memberId)
      .find((x) => x.user_challenge_status === 'active');

    if (!a) {
      return {
        isActive: false,
        percent: null as number | null,
      };
    }

    const goal = typeof a.goal_steps === 'number' ? a.goal_steps : Number(a.goal_steps ?? 0);
    const cur = typeof a.current_steps === 'number' ? a.current_steps : Number(a.current_steps ?? 0);

    const safeGoal = goal > 0 ? goal : 0;
    const pct = safeGoal > 0 ? Math.max(0, Math.min(100, Math.round((cur / safeGoal) * 100))) : 0;

    return {
      isActive: true,
      percent: pct,
    };
  };

  return (
    <div className={outerClassName}>
      <div
        onClick={onTeamClick}
        className={`relative rounded-3xl overflow-hidden cursor-pointer group border-2 border-gray-200 dark:border-white/10 hover:border-purple-400/40 dark:hover:border-purple-400/40 transition-all shadow-xl ${
          variant === 'stack' ? 'aspect-[16/9]' : 'aspect-[3/4]'
        }`}
      >
        {/* Family/friends walking together outdoors */}
        <img
          src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&auto=format&fit=crop&q=80"
          alt="Friends walking together"
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-700/45 to-blue-500/25" />

        {/*
          Main content layer: hero is centered within the full card height (top-to-bottom),
          independent of the Quick Assign overlay.
        */}
        <div className="absolute inset-0 p-6 flex flex-col justify-between">
          {/* Top */}
          <div className="flex items-start justify-between">
            <div className="text-xs font-bold text-purple-200 uppercase tracking-wide">Social</div>
            {teamActiveChallenges.length > 0 && (
              <div className="bg-gradient-to-r from-purple-500 to-indigo-400 backdrop-blur-sm text-[#0B101B] text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
                {teamActiveChallenges.length} ACTIVE
              </div>
            )}
          </div>

          {/* Middle - Hero centered in full card */}
          <div className="flex-1 flex items-center justify-center min-h-[4.5rem]">
            <h3
              className={`text-white text-center leading-tight uppercase drop-shadow-2xl whitespace-nowrap ${
                variant === 'stack' ? 'text-3xl font-black' : 'text-4xl font-black'
              }`}
            >
              Move a friend
            </h3>
          </div>

          {/* Bottom (no CTA, keep consistent spacing) */}
          <div className="h-5" />
        </div>

        {/* Quick assign (signed-in users only) */}
        {showQuickAssign && (
          <div
            className="absolute left-4 right-4 bottom-4 rounded-3xl bg-transparent backdrop-blur-md border border-white/0 px-4 py-3 sm:py-3.5 shadow-none"
            onClick={(e) => {
              // Prevent card click (onTeamClick) when interacting with quick-assign
              e.stopPropagation();
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-2xl grid place-items-center bg-purple-500/15 border border-purple-400/25">
                    <span className="text-sm">⚡</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-white/80 uppercase tracking-[0.24em]">
                      Quick assign
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {quickMembers.map((m) => {
                  const label = m.custom_name || m.display_name || m.email || 'Member';
                  const avatar = m.avatar_url;
                  const p = progressForMember(m.member_id);

                  // Progress ring math (stroke-based)
                  const size = 40;
                  const stroke = 3;
                  const r = (size - stroke) / 2;
                  const c = 2 * Math.PI * r;
                  const dash = p.percent !== null ? (c * (100 - p.percent)) / 100 : c;

                  return (
                    <button
                      key={m.member_id}
                      type="button"
                      className="relative h-10 w-10 rounded-full overflow-visible"
                      title={label}
                      onClick={() => onQuickAssign?.(m)}
                    >
                      {/* Ring */}
                      {p.percent !== null && (
                        <svg
                          className="absolute -inset-[2px] h-[44px] w-[44px]"
                          viewBox={`0 0 ${size} ${size}`}
                        >
                          <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            stroke="rgba(255,255,255,0.14)"
                            strokeWidth={stroke}
                            fill="transparent"
                          />
                          <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            stroke="rgba(139,92,246,0.95)"
                            strokeWidth={stroke}
                            fill="transparent"
                            strokeDasharray={c}
                            strokeDashoffset={dash}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${size / 2} ${size / 2})`}
                          />
                        </svg>
                      )}

                      {/* Avatar */}
                      <div className="relative h-10 w-10 rounded-full ring-2 ring-white/15 overflow-hidden bg-white/10 hover:ring-purple-300/40 transition">
                        {avatar ? (
                          <img src={avatar} alt={label} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-[11px] font-black text-white">
                            {initials(label)}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
