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
    const displayName = member.display_name || member.email.split('@')[0];
    if (!confirm(`Remove ${displayName} from your team?`)) return;

    try {
      const { error } = await teamService.removeMember(member.member_id);
      if (error) throw error;
      onRemoved();
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert('Failed to remove team member. Please try again.');
    }
  };

  // Use nickname (from database) if available, otherwise display_name
  const displayName = member.display_name || member.email.split('@')[0];

  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-24 font-sans">
      <AppHeader />
      
      <main className="px-5 pt-6 pb-6 space-y-6">
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

        {/* Member Profile - Simplified */}
        <section className="bg-[#151A25] border border-white/5 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold ring-2 ring-white/10 flex-shrink-0"
              style={{ backgroundColor: getColorFromName(displayName) }}
            >
              {getInitials(displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white mb-2">
                {displayName}
              </h2>
              <div className="text-sm text-white/60">{member.email}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Send Challenge Button */}
            <button 
              onClick={() => {
                useChallengeStore.getState().setAssignTarget({
                  id: member.member_id,
                  name: displayName,
                  email: member.email
                });
                setCurrentScreen('customChallenge'); // ✅ FIX: Go to My Custom Challenges instead of library
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-xl font-bold text-base transition-all shadow-lg"
            >
              Send Challenge to {displayName}
            </button>

            {/* Remove Link - Small text */}
            <div className="text-center">
              <button
                onClick={handleRemoveMember}
                className="text-red-400/60 hover:text-red-400 text-xs font-medium transition-colors"
              >
                Remove from team
              </button>
            </div>
          </div>
        </section>
      </main>

      <BottomNavigation 
        currentScreen="team" 
        onTeamClick={onBack}
      />
    </div>
  );
}
