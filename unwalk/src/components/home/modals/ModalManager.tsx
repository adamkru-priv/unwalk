import { CelebrationModal } from '../CelebrationModal';
import { LevelUpModal } from '../LevelUpModal';
import { JourneyModal } from './JourneyModal';
import { TeamChallengeInviteModal } from './TeamChallengeInviteModal';
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
  
  // Team Challenge Invite Modal
  showTeamInviteModal: boolean;
  onCloseTeamInvite: () => void;
  onTeamInviteSuccess: () => void;
  
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
  showTeamInviteModal,
  onCloseTeamInvite,
  onTeamInviteSuccess,
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

      {/* Team Challenge Invite Modal - select challenge and send invitations */}
      <TeamChallengeInviteModal
        isOpen={showTeamInviteModal}
        onClose={onCloseTeamInvite}
        onSuccess={onTeamInviteSuccess}
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
