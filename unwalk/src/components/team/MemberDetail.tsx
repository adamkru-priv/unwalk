import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { teamService, type TeamMember } from '../../lib/auth';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { getInitials, getColorFromName } from './utils';
import { EditMemberModal } from './EditMemberModal';
import { useState } from 'react';

interface MemberDetailProps {
  member: TeamMember;
  onBack: () => void;
  onRemoved: () => void;
}

export function MemberDetail({ member, onBack, onRemoved }: MemberDetailProps) {
  const setCurrentScreen = useChallengeStore((state) => state.setCurrentScreen);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentMember, setCurrentMember] = useState(member);

  const handleRemoveMember = async () => {
    const displayName = currentMember.custom_name || currentMember.display_name || 'this member';
    if (!confirm(`Remove ${displayName} from your team?`)) return;

    try {
      const { error } = await teamService.removeMember(currentMember.member_id);
      if (error) throw error;
      onRemoved();
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert('Failed to remove team member. Please try again.');
    }
  };

  const handleEditSaved = async () => {
    // Reload member data
    try {
      const members = await teamService.getTeamMembers();
      const updated = members.find(m => m.id === currentMember.id);
      if (updated) {
        setCurrentMember(updated);
      }
    } catch (err) {
      console.error('Failed to reload member:', err);
    }
  };

  const displayName = currentMember.custom_name || currentMember.display_name || currentMember.email.split('@')[0];
  const showRelationship = currentMember.relationship && currentMember.relationship.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-24 font-sans">
      <AppHeader />
      
      {showEditModal && (
        <EditMemberModal
          member={currentMember}
          onClose={() => setShowEditModal(false)}
          onSaved={handleEditSaved}
        />
      )}
      
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

        {/* Member Profile */}
        <section className="bg-[#151A25] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold ring-2 ring-white/10"
              style={{ backgroundColor: getColorFromName(displayName) }}
            >
              {getInitials(displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white truncate">
                  {displayName}
                </h2>
                {showRelationship && (
                  <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded-full border border-blue-500/30 flex-shrink-0">
                    {currentMember.relationship}
                  </span>
                )}
              </div>
              <div className="text-xs text-white/60">{currentMember.email}</div>
              {currentMember.tier === 'pro' && (
                <div className="text-amber-400 text-xs font-bold mt-1 flex items-center gap-1">
                  <span>⭐</span>
                  <span>PRO MEMBER</span>
                </div>
              )}
            </div>
            {/* Small remove link - top right */}
            <button
              onClick={handleRemoveMember}
              className="text-red-400/60 hover:text-red-400 text-xs font-medium transition-colors"
            >
              Remove
            </button>
          </div>

          {/* Notes */}
          {currentMember.notes && currentMember.notes.trim().length > 0 && (
            <div className="bg-[#0B101B] rounded-xl p-3 mb-4">
              <div className="text-xs text-white/50 mb-1">Notes:</div>
              <p className="text-sm text-white/80">{currentMember.notes}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#0B101B] rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{currentMember.active_challenges_count}</div>
              <div className="text-xs text-white/50 mt-0.5">Active Challenges</div>
            </div>
            <div className="bg-[#0B101B] rounded-xl p-3 text-center">
              <div className="text-xs text-white/50 mb-1">Joined</div>
              <div className="text-sm font-bold text-white">
                {new Date(currentMember.added_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Edit Button */}
          <button
            onClick={() => setShowEditModal(true)}
            className="w-full bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Personalize
          </button>
        </section>

        {/* Send Challenge Button */}
        <button 
          onClick={() => {
            useChallengeStore.getState().setAssignTarget({
              id: currentMember.member_id,
              name: displayName,
              email: currentMember.email
            });
            setCurrentScreen('library');
          }}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-2xl font-bold text-base transition-all shadow-lg"
        >
          🎯 Send Challenge to {displayName}
        </button>
      </main>

      <BottomNavigation 
        currentScreen="team" 
        onTeamClick={onBack}
      />
    </div>
  );
}
