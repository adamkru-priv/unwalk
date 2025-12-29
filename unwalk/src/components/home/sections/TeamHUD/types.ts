export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  steps: number;
  percentage: number;
}

export interface PendingInvitation {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  invited_at: string;
  invited_user: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface PendingChallenge {
  challenge_id: string;
  title: string;
  goal_steps: number;
  time_limit_hours: number;
  points: number;
  invitations: PendingInvitation[];
  acceptedCount: number;
  pendingCount: number;
  currentUserId?: string;
}

export interface TeamHUDProps {
  teamChallenge: any | null; // UserChallenge
  teamMembers: TeamMember[];
  onClick: () => void;
  onInviteMoreClick?: (challengeId: string, challengeTitle: string, alreadyInvitedUserIds: string[]) => void;
  onChallengeStarted?: () => void;
  onChallengeCancelled?: () => void;
  onChallengeEnded?: () => void; // 🎯 NEW: Callback when challenge ends
}

// Re-export TeamMember for convenience
export type { TeamMember as default };
