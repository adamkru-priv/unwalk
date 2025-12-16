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
  const tier = userProfile?.tier || 'basic';
  const maxSlots = tier === 'pro' ? 5 : 1;
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
    <div className="bg-gradient-to-br from-[#151A25] to-[#1A1F2E] border border-white/10 rounded-3xl p-5">
      {/* Header with tier badge */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black text-white mb-1">Your Team</h2>
          <p className="text-xs text-white/50">
            {usedSlots + pendingSlots}/{maxSlots} slots used
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-full font-bold text-xs ${
          tier === 'pro' 
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
            : 'bg-white/10 text-white/70'
        }`}>
          {tier === 'pro' ? '⭐ PRO' : 'BASIC'}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
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
        {isAtLimit && tier === 'basic' && (
          <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
            <span>💎</span>
            <span>Upgrade to PRO for 5 team slots</span>
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
                    {getInitials(slot.member.custom_name || slot.member.display_name || slot.member.email)}
                  </div>
                  <div className="font-bold text-white text-sm truncate w-full mb-0.5">
                    {slot.member.custom_name || slot.member.display_name || slot.member.email.split('@')[0]}
                  </div>
                  {slot.member.relationship && (
                    <div className="text-xs text-blue-400 truncate w-full">
                      {slot.member.relationship}
                    </div>
                  )}
                  {slot.member.tier === 'pro' && (
                    <div className="text-xs text-amber-400 font-bold mt-1">
                      ⭐ PRO
                    </div>
                  )}
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
                  <div className="text-xs text-white/40 mt-0.5">
                    Awaiting response
                  </div>
                </div>
              </div>
            ) : (
              // Empty slot
              <button
                onClick={onInviteClick}
                disabled={isAtLimit}
                className={`border-2 border-dashed rounded-2xl p-3 transition-all ${
                  isAtLimit
                    ? 'border-white/10 bg-white/5 cursor-not-allowed opacity-50'
                    : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-blue-500/50 cursor-pointer group'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 transition-all ${
                    isAtLimit
                      ? 'bg-white/5'
                      : 'bg-white/10 group-hover:bg-blue-500/20'
                  }`}>
                    <svg className={`w-7 h-7 transition-all ${
                      isAtLimit ? 'text-white/20' : 'text-white/40 group-hover:text-blue-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className={`text-xs font-bold transition-colors ${
                    isAtLimit ? 'text-white/30' : 'text-white/50 group-hover:text-blue-400'
                  }`}>
                    {isAtLimit ? 'No slots' : 'Invite'}
                  </div>
                </div>
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Call to action */}
      {!isAtLimit && (
        <button
          onClick={onInviteClick}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Invite Team Member</span>
        </button>
      )}
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
