export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  steps: number;
  percentage: number;
  isCurrentUser?: boolean; // 🎯 NEW: Is this member the current user
  isHost?: boolean; // 🎯 NEW: Is this member the host of the challenge
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
  isHost?: boolean; // 🎯 NEW: Is current user the host (creator) of the challenge
  hostId?: string;  // 🎯 NEW: ID of the user who created the challenge
}

export interface TeamHUDProps {
  teamChallenge: any | null; // UserChallenge
  teamMembers: TeamMember[];
  onClick: () => void;
  onInviteMoreClick?: (challengeId: string, challengeTitle: string, alreadyInvitedUserIds: string[]) => void;
  onChallengeStarted?: () => void;
  onChallengeCancelled?: () => void;
  onChallengeEnded?: () => void; // 🎯 NEW: Callback when challenge ends
  onRefresh?: () => Promise<void>; // 🎯 NEW: Manual refresh callback
}

// Re-export TeamMember for convenience
export type { TeamMember as default };
