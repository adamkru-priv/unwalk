import { CelebrationModal } from '../CelebrationModal';
import { LevelUpModal } from '../LevelUpModal';
import { JourneyModal } from './JourneyModal';
import { SelectSoloChallengeModal } from './SelectSoloChallengeModal';
import { SelectTeamChallengeModal } from './SelectTeamChallengeModal';
import { InviteMoreToTeamChallengeModal } from './InviteMoreToTeamChallengeModal';
import type { UserChallenge } from '../../../types';

interface ModalManagerProps {
  // Celebration Modal
  selectedCompletedChallenge: UserChallenge | null;
  onClaimSuccess: () => void;
  
  // Level Up Modal
  showLevelUpModal: boolean;
  levelUpValue: number;
  onCloseLevelUp: () => void;
  
  // Journey Modal
  showJourneyModal: boolean;
  onCloseJourney: () => void;
  currentStreak: number;
  longestStreak: number;
  nextMilestone?: { steps: number; title: string; icon: string };
  onQuestClaimed: (xpEarned: number) => void;
  
  // 🎯 NEW: Universal Challenge Selection Modal (replaces Team Invite Modal)
  showSoloSelectModal: boolean;
  showTeamSelectModal: boolean;
  onCloseSoloSelect: () => void;
  onCloseTeamSelect: () => void;
  onSoloSelectSuccess: () => void;
  onTeamSelectSuccess: () => void;
  
  // Invite More Modal
  showInviteMoreModal: boolean;
  onCloseInviteMore: () => void;
  onInviteMoreSuccess: () => void;
  inviteMoreData: {
    challengeId: string;
    challengeTitle: string;
    alreadyInvitedUserIds: string[];
  } | null;
  
  // Feature flags
  isGuest: boolean;
}

export function ModalManager({
  selectedCompletedChallenge,
  onClaimSuccess,
  showLevelUpModal,
  levelUpValue,
  onCloseLevelUp,
  showJourneyModal,
  onCloseJourney,
  currentStreak,
  longestStreak,
  nextMilestone,
  onQuestClaimed,
  showSoloSelectModal,
  showTeamSelectModal,
  onCloseSoloSelect,
  onCloseTeamSelect,
  onSoloSelectSuccess,
  onTeamSelectSuccess,
  showInviteMoreModal,
  onCloseInviteMore,
  onInviteMoreSuccess,
  inviteMoreData,
  isGuest
}: ModalManagerProps) {
  return (
    <>
      {/* Celebration Modal - when challenge is completed */}
      {selectedCompletedChallenge && (
        <CelebrationModal
          challenge={selectedCompletedChallenge}
          onClaim={onClaimSuccess}
        />
      )}

      {/* Level Up Modal - when user levels up */}
      <LevelUpModal 
        isOpen={showLevelUpModal}
        level={levelUpValue}
        onClose={onCloseLevelUp}
      />

      {/* Journey Modal - daily quests and streaks */}
      {!isGuest && (
        <JourneyModal
          isOpen={showJourneyModal}
          onClose={onCloseJourney}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          nextMilestone={nextMilestone}
          onQuestClaimed={onQuestClaimed}
        />
      )}

      {/* 🎯 Solo Challenge Selection Modal */}
      <SelectSoloChallengeModal
        isOpen={showSoloSelectModal}
        onClose={onCloseSoloSelect}
        onSuccess={onSoloSelectSuccess}
      />

      {/* 🎯 Team Challenge Selection Modal */}
      <SelectTeamChallengeModal
        isOpen={showTeamSelectModal}
        onClose={onCloseTeamSelect}
        onSuccess={onTeamSelectSuccess}
      />

      {/* Invite More Modal - invite additional friends to existing challenge */}
      {inviteMoreData && (
        <InviteMoreToTeamChallengeModal
          isOpen={showInviteMoreModal}
          onClose={onCloseInviteMore}
          onSuccess={onInviteMoreSuccess}
          challengeId={inviteMoreData.challengeId}
          challengeTitle={inviteMoreData.challengeTitle}
          alreadyInvitedUserIds={inviteMoreData.alreadyInvitedUserIds}
        />
      )}
    </>
  );
}
