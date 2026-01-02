import type { User, Session } from '@supabase/supabase-js';

export type { User, Session };

// Updated: 2026-01-01 - Added missing UserProfile properties for guest users, XP system, and points
export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string;
  nickname?: string | null; // 🎯 NEW: Custom nickname (max 9 chars, can be duplicated)
  avatar_url: string | null;
  tier: 'free' | 'pro';
  device_id?: string | null;
  daily_step_goal: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  push_enabled?: boolean;
  is_guest?: boolean; // 🎯 ADDED: Required for guest user detection
  xp?: number; // 🎯 ADDED: User experience points
  level?: number; // 🎯 ADDED: User level
  total_points?: number; // 🎯 ADDED: Total accumulated points
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

// 🎯 NEW: Team Challenge Invitation (separate from regular team invitations)
export interface TeamChallengeInvitation {
  id: string;
  invited_by: string;
  invited_user: string;
  challenge_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  invited_at: string;
  responded_at: string | null;
  // Joined data
  sender_name?: string;
  sender_email?: string;
  sender_avatar?: string;
  challenge_title?: string;
  challenge_icon?: string;
  challenge_goal_steps?: number;
  challenge_time_limit_hours?: number;
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
