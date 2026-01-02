import { motion } from 'framer-motion';
import { getInitials, getColorFromName } from './utils';
import type { TeamMember, UserProfile } from '../../lib/auth';

interface TeamSlotsProps {
  teamMembers: TeamMember[];
  userProfile: UserProfile | null;
  onInviteClick: () => void;
  onMemberClick?: (member: TeamMember) => void;
  invitedCount: number; // Liczba oczekujących zaproszeń
}

export function TeamSlots({ teamMembers, userProfile, onInviteClick, onMemberClick, invitedCount }: TeamSlotsProps) {
  const isGuest = userProfile?.is_guest ?? true;
  const maxSlots = isGuest ? 1 : 5;
  const usedSlots = teamMembers.length;
  const pendingSlots = invitedCount;
  const availableSlots = maxSlots - usedSlots - pendingSlots;

  // Create array of slot states
  const slots = [];
  
  // Filled slots (actual team members)
  for (let i = 0; i < usedSlots; i++) {
    slots.push({ type: 'filled', member: teamMembers[i] });
  }
  
  // Pending slots (sent invitations)
  for (let i = 0; i < pendingSlots; i++) {
    slots.push({ type: 'pending' });
  }
  
  // Empty slots
  for (let i = 0; i < availableSlots; i++) {
    slots.push({ type: 'empty' });
  }

  const isAtLimit = usedSlots + pendingSlots >= maxSlots;

  return (
    <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#151A25] dark:to-[#1A1F2E] border border-gray-300 dark:border-white/10 rounded-3xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-1">Your Team</h2>
          <p className="text-xs text-gray-500 dark:text-white/50">
            {usedSlots + pendingSlots}/{maxSlots} slots used
          </p>
        </div>
        {/* Removed PRO/GUEST badge */}
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="h-2 bg-gray-300 dark:bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              isAtLimit 
                ? 'bg-gradient-to-r from-red-500 to-pink-500'
                : 'bg-gradient-to-r from-blue-500 to-purple-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${((usedSlots + pendingSlots) / maxSlots) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {isAtLimit && isGuest && (
          <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
            <span>⭐</span>
            <span>Sign up to unlock 5 team slots</span>
          </p>
        )}
      </div>

      {/* Team Slots Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {slots.map((slot, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            {slot.type === 'filled' && slot.member ? (
              // Filled slot with team member - clickable!
              <button
                onClick={() => onMemberClick?.(slot.member!)}
                className="w-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-3 hover:border-blue-500/50 transition-all cursor-pointer group"
              >
                <div className="flex flex-col items-center text-center">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-base font-bold mb-2 ring-2 ring-blue-500/50 group-hover:ring-blue-500 transition-all"
                    style={{ backgroundColor: getColorFromName(slot.member.display_name || slot.member.email) }}
                  >
                    {getInitials(slot.member.display_name || slot.member.email)}
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm truncate w-full mb-0.5">
                    {slot.member.display_name || slot.member.email.split('@')[0]}
                  </div>
                </div>
              </button>
            ) : slot.type === 'pending' ? (
              // Pending slot (invitation sent)
              <div className="bg-amber-500/10 border border-amber-500/30 border-dashed rounded-2xl p-3 relative overflow-hidden">
                {/* Animated pulse */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent animate-shimmer" />
                
                <div className="flex flex-col items-center text-center relative z-10">
                  <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mb-2 border-2 border-amber-500/40">
                    <div className="text-2xl animate-bounce">⏳</div>
                  </div>
                  <div className="text-xs font-bold text-amber-400">
                    Pending
                  </div>
                  <div className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
                    Awaiting response
                  </div>
                </div>
              </div>
            ) : (
              // Empty slot - same structure as filled slot but more compact
              <button
                onClick={onInviteClick}
                disabled={isAtLimit}
                className={`w-full border-2 border-dashed rounded-2xl p-3 transition-all ${
                  isAtLimit
                    ? 'border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 cursor-not-allowed opacity-50'
                    : 'border-gray-400 dark:border-white/20 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 hover:border-blue-500/50 cursor-pointer group'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  {/* Avatar circle - same size as filled */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 transition-all ${
                    isAtLimit
                      ? 'bg-gray-200 dark:bg-white/5'
                      : 'bg-gray-200 dark:bg-white/10 group-hover:bg-blue-500/20'
                  }`}>
                    <svg className={`w-7 h-7 transition-all ${
                      isAtLimit ? 'text-gray-400 dark:text-white/20' : 'text-gray-600 dark:text-white/40 group-hover:text-blue-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  
                  {/* Text line - same spacing as name */}
                  <div className={`text-xs font-bold transition-colors mb-0.5 ${
                    isAtLimit ? 'text-gray-400 dark:text-white/30' : 'text-gray-600 dark:text-white/50 group-hover:text-blue-400'
                  }`}>
                    {isAtLimit ? 'No slots' : 'Invite'}
                  </div>
                  
                  {/* Smaller spacer to match relationship line */}
                  <div className="text-xs h-[16px]">
                  </div>
                </div>
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Call to action removed - empty slots already open invite */}
    </div>
  );
}

// Shimmer animation for pending slots
const shimmerKeyframes = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.animate-shimmer {
  animation: shimmer 2s infinite;
}
`;

// Inject keyframes
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmerKeyframes;
  document.head.appendChild(style);
}
