import { motion } from 'framer-motion';
import { getInitials, getColorFromName } from '../../team/utils';

interface TeamChallengeMember {
  id: string;
  name: string;
  avatar?: string;
  steps: number;
  percentage: number;
}

interface TeamChallengeSlotsProps {
  members: TeamChallengeMember[];
  maxMembers?: number;
  onInviteClick?: () => void;
}

export function TeamChallengeSlots({ members, maxMembers = 5, onInviteClick }: TeamChallengeSlotsProps) {
  const usedSlots = members.length;
  const availableSlots = maxMembers - usedSlots;

  // Create array of slot states
  const slots = [];
  
  // Filled slots (actual team members)
  for (let i = 0; i < usedSlots; i++) {
    slots.push({ type: 'filled', member: members[i] });
  }
  
  // Empty slots
  for (let i = 0; i < availableSlots; i++) {
    slots.push({ type: 'empty' });
  }

  return (
    <div className="space-y-3">
      {/* Team Slots Grid */}
      <div className="grid grid-cols-2 gap-3">
        {slots.map((slot, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            {slot.type === 'filled' && slot.member ? (
              // Filled slot with team member
              <div className="w-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-3">
                <div className="flex flex-col items-center text-center">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-base font-bold mb-2 ring-2 ring-blue-500/50"
                    style={{ backgroundColor: getColorFromName(slot.member.name) }}
                  >
                    {getInitials(slot.member.name)}
                  </div>
                  <div className="font-bold text-white text-sm truncate w-full mb-0.5">
                    {slot.member.name}
                  </div>
                  <div className="text-xs text-blue-400 font-bold">
                    {slot.member.percentage}% contribution
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {slot.member.steps.toLocaleString()} steps
                  </div>
                </div>
              </div>
            ) : (
              // Empty slot
              <button
                onClick={onInviteClick}
                disabled={!onInviteClick}
                className={`w-full border-2 border-dashed rounded-2xl p-3 transition-all ${
                  !onInviteClick
                    ? 'border-white/10 bg-white/5 cursor-not-allowed opacity-50'
                    : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-blue-500/50 cursor-pointer group'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  {/* Avatar circle - same size as filled */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 transition-all ${
                    !onInviteClick
                      ? 'bg-white/5'
                      : 'bg-white/10 group-hover:bg-blue-500/20'
                  }`}>
                    <svg className={`w-7 h-7 transition-all ${
                      !onInviteClick ? 'text-white/20' : 'text-white/40 group-hover:text-blue-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  
                  <div className={`text-xs font-bold transition-colors mb-0.5 ${
                    !onInviteClick ? 'text-white/30' : 'text-white/50 group-hover:text-blue-400'
                  }`}>
                    Invite
                  </div>
                  
                  <div className="text-xs h-[16px]"></div>
                </div>
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
