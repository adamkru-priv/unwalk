// UnWalk Types - Stage 1: Admin-Curated

// Admin creates these challenges in Supabase Dashboard
export interface AdminChallenge {
  id: string;
  title: string;
  description: string;
  category: 'travel' | 'art' | 'motivation' | 'fun';
  difficulty: 'easy' | 'medium' | 'hard';
  goal_steps: number;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// User's active/completed challenges (guest mode with device_id)
export interface UserChallenge {
  id: string;
  device_id: string; // localStorage UUID (no auth in Stage 1)
  admin_challenge_id: string;
  admin_challenge?: AdminChallenge; // Populated via join
  current_steps: number;
  status: 'active' | 'paused' | 'completed';
  started_at: string;
  paused_at?: string;
  completed_at?: string;
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
export type UserTier = 'basic' | 'pro';
