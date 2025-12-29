import type { User, Session } from '@supabase/supabase-js';

export type { User, Session };

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  daily_step_goal: number;
  tier: 'pro';
  onboarding_completed: boolean;
  onboarding_target?: 'self' | 'spouse' | 'child' | 'friend' | null;
  is_guest: boolean;
  device_id: string | null;
  push_enabled?: boolean;
  total_points?: number;
  xp?: number;
  level?: number;
  current_streak?: number;
  longest_streak?: number;
  achievements?: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  member_id: string;
  custom_name: string | null;
  relationship: string | null;
  notes: string | null;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  tier: 'pro';
  added_at: string;
  active_challenges_count: number;
}

export interface Team {
  id: string;
  name: string;
  creator_id: string;
  created_at: string;
  members: TeamMember[];
}

export interface TeamInvitation {
  id: string;
  sender_id: string;
  recipient_email: string;
  recipient_id: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message: string | null;
  invited_at: string;
  responded_at: string | null;
  expires_at: string;
  // Joined data
  sender_name?: string;
  sender_email?: string;
  sender_avatar?: string;
  recipient_name?: string;
  recipient_avatar?: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  points: number;
  sort_order: number;
  unlocked_at: string | null;
  unlocked: boolean;
}

export interface ChallengeAssignment {
  id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  recipient_id?: string;
  recipient_name?: string | null;
  recipient_avatar?: string | null;
  admin_challenge_id: string;
  challenge_title: string;
  challenge_goal_steps: number;
  challenge_image_url: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  sent_at: string;
  responded_at: string | null;
  user_challenge_id?: string | null;
  current_steps?: number;
  user_challenge_status?: string | null;
  user_challenge_started_at?: string | null;
  user_challenge_completed_at?: string | null;
}
