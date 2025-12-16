import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { teamService, type TeamMember } from '../../lib/auth';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { getInitials, getColorFromName } from './utils';

interface MemberDetailProps {
  member: TeamMember;
  onBack: () => void;
  onRemoved: () => void;
}

export function MemberDetail({ member, onBack, onRemoved }: MemberDetailProps) {
  const setCurrentScreen = useChallengeStore((state) => state.setCurrentScreen);

  const handleRemoveMember = async () => {
    if (!confirm(`Remove ${member.display_name || 'this member'} from your team?`)) return;

    try {
      const { error } = await teamService.removeMember(member.member_id);
      if (error) throw error;
      onRemoved();
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert('Failed to remove team member. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-24 font-sans">
      <AppHeader showBackButton />
      
      <main className="px-5 pt-6 pb-6 max-w-md mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-bold">Back to Team</span>
        </button>

        {/* Member Profile */}
        <section className="bg-[#151A25] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: getColorFromName(member.display_name) }}
            >
              {getInitials(member.display_name)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">
                {member.display_name || member.email}
              </h2>
              <div className="text-xs text-white/60">{member.email}</div>
            </div>
            <button
              onClick={handleRemoveMember}
              className="text-red-400 hover:text-red-300 text-sm font-bold"
            >
              Remove
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0B101B] rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-white">{member.active_challenges_count}</div>
              <div className="text-xs text-white/50 mt-0.5">Active</div>
            </div>
            <div className="bg-[#0B101B] rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-blue-400">{member.tier === 'pro' ? 'PRO' : 'Basic'}</div>
              <div className="text-xs text-white/50 mt-0.5">Tier</div>
            </div>
          </div>
        </section>

        {/* Send Challenge Button */}
        <button 
          onClick={() => {
            useChallengeStore.getState().setAssignTarget({
              id: member.member_id,
              name: member.display_name || member.email,
              email: member.email
            });
            setCurrentScreen('library');
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold text-sm transition-all"
        >
          Send Challenge to {member.display_name || 'Member'}
        </button>
      </main>

      <BottomNavigation 
        currentScreen="team" 
        onTeamClick={onBack}
      />
    </div>
  );
}
