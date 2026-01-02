// MOVEE Types - Stage 1: Admin-Curated

// Admin creates these challenges in Supabase Dashboard
export interface AdminChallenge {
  id: string;
  title: string;
  description: string;
  category: 'travel' | 'art' | 'motivation' | 'fun';
  difficulty: 'easy' | 'medium' | 'hard';
  goal_steps: number;
  points?: number; // Points awarded for completing this challenge
  image_url: string;
  icon?: string; // Optional emoji icon for challenge
  sort_order: number;
  is_active: boolean;
  created_at: string;
  is_custom?: boolean; // Flag for custom challenges
  created_by_device_id?: string; // Who created this custom challenge
  is_image_hidden?: boolean; // Should image be blurred initially
  deadline?: string; // Optional deadline for challenge
  time_limit_hours?: number; // Time limit in hours (NULL = unlimited)
  is_daily?: boolean; // Is this a daily challenge (affects XP reward)
  is_team_challenge?: boolean; // Is this a team challenge
}

// User's active/completed challenges (guest mode with device_id)
export interface UserChallenge {
  id: string;
  device_id: string; // localStorage UUID (no auth in Stage 1)
  admin_challenge_id: string;
  admin_challenge?: AdminChallenge; // Populated via join
  current_steps: number;
  status: 'active' | 'paused' | 'completed' | 'completed_unclaimed' | 'claimed';
  started_at: string;
  paused_at?: string;
  completed_at?: string;
  claimed_at?: string;
  active_time_seconds?: number; // Total active time (excluding pauses)
  last_resumed_at?: string; // When challenge was last resumed (to calculate current session)
  assigned_by?: string; // User ID of person who assigned this (social challenge)
  assigned_by_name?: string; // Display name of person who assigned
  assigned_by_avatar?: string; // Avatar URL of person who assigned
  is_group_challenge?: boolean; // Is this a group challenge
  group_members?: string[]; // Array of device IDs in the group
  team_id?: string; // 🎯 NEW: If set, this is a team challenge (linked to parent team challenge)
  user_id?: string; // 🎯 NEW: User ID for authenticated users
  is_fully_completed?: boolean; // 🎯 NEW: True if challenge was completed at 100% (not abandoned early)
}

// Legacy Challenge type (keeping for backward compatibility)
export interface Challenge {
  id: string;
  userId: string;
  goalSteps: number;
  currentSteps: number;
  imageUrl: string;
  status: 'active' | 'completed';
  createdAt: string;
  completedAt?: string;
}

export type GoalOption = 5000 | 10000 | 15000 | 30000;

export interface GoalCard {
  steps: GoalOption;
  label: string;
  description: string;
  emoji: string;
}

export interface HealthData {
  steps: number;
  date: string;
}

export interface AppState {
  challenge: Challenge | null;
  isOnboardingComplete: boolean;
  isHealthConnected: boolean;
}

// User subscription type
export type UserTier = 'pro';

// ============================================
// GAMIFICATION TYPES
// ============================================

export interface DailyQuest {
  id: string;
  user_id: string;
  quest_date: string;
  quest_type: 'steps' | 'challenge_progress' | 'social';
  target_value: number;
  current_progress: number;
  xp_reward: number;
  completed: boolean;
  claimed: boolean;
  completed_at?: string;
  claimed_at?: string;
  created_at: string;
}

export interface XPTransaction {
  id: string;
  user_id: string;
  xp_amount: number;
  source_type: 'challenge' | 'daily_quest' | 'streak_bonus' | 'badge' | 'milestone' | 'manual' | 'daily_steps';
  source_id?: string;
  description?: string;
  created_at: string;
}

export interface UserGamificationStats {
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string;
  total_points: number; // Existing points column
}

export interface LevelUpResult {
  new_xp: number;
  new_level: number;
  leveled_up: boolean;
}

export interface StreakUpdateResult {
  current_streak: number;
  streak_bonus_xp: number;
}
