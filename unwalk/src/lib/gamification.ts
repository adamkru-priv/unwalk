// Gamification API - XP, Levels, Daily Quests, Streaks
import { supabase } from './supabase';
import type { DailyQuest, UserGamificationStats, LevelUpResult } from '../types';

// ============================================
// LEVEL & XP SYSTEM
// ============================================

// Calculate required XP for a specific level
export function calculateXPForLevel(level: number): number {
  if (level <= 1) return 0;
  // Exponential growth: 100 * (1.5^(level-1) - 1) / 0.5
  return Math.floor(100 * (Math.pow(1.5, level - 1) - 1) / 0.5);
}

// Calculate XP needed for next level
export function calculateXPToNextLevel(currentXP: number, currentLevel: number): number {
  const nextLevelXP = calculateXPForLevel(currentLevel + 1);
  return Math.max(0, nextLevelXP - currentXP);
}

// Calculate progress percentage to next level
export function calculateLevelProgress(currentXP: number, currentLevel: number): number {
  if (currentLevel >= 50) return 100;
  
  const currentLevelXP = calculateXPForLevel(currentLevel);
  const nextLevelXP = calculateXPForLevel(currentLevel + 1);
  const xpInCurrentLevel = currentXP - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  
  return Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForLevel) * 100));
}

// Get user's gamification stats
export async function getUserGamificationStats(): Promise<UserGamificationStats | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('xp, level, current_streak, longest_streak, last_activity_date, total_points')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Failed to get gamification stats:', error);
    return null;
  }
}

// Add XP to user (with level-up logic)
export async function addXPToUser(
  xpAmount: number,
  sourceType: 'challenge' | 'daily_quest' | 'streak_bonus' | 'badge' | 'milestone' | 'manual',
  sourceId?: string,
  description?: string
): Promise<LevelUpResult | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('add_xp_to_user', {
      p_user_id: user.id,
      p_xp_amount: xpAmount,
      p_source_type: sourceType,
      p_source_id: sourceId,
      p_description: description,
    });

    if (error) throw error;

    return data?.[0] || null;
  } catch (error) {
    console.error('Failed to add XP:', error);
    return null;
  }
}

// ============================================
// STREAK SYSTEM
// ============================================

// Update user's streak (call when user completes any activity)
export async function updateUserStreak(): Promise<{ current_streak: number; streak_bonus_xp: number } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.rpc('update_user_streak', {
      p_user_id: user.id,
    });

    if (error) throw error;

    return data?.[0] || null;
  } catch (error) {
    console.error('Failed to update streak:', error);
    return null;
  }
}

// Get streak milestones info
export function getNextStreakMilestone(currentStreak: number): { milestone: number; reward: string } | null {
  const milestones = [
    { milestone: 3, reward: '+50 XP' },
    { milestone: 7, reward: '+150 XP + Badge' },
    { milestone: 14, reward: '+300 XP' },
    { milestone: 30, reward: '+1000 XP + Badge' },
  ];

  for (const m of milestones) {
    if (currentStreak < m.milestone) {
      return m;
    }
  }

  // After 30, every 7 days
  const nextMilestone = Math.ceil(currentStreak / 7) * 7;
  return { milestone: nextMilestone, reward: '+100 XP' };
}

// ============================================
// DAILY QUEST SYSTEM
// ============================================

// Generate today's daily quest
export async function generateDailyQuest(): Promise<DailyQuest | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { error } = await supabase.rpc('generate_daily_quest', {
      p_user_id: user.id,
    });

    if (error) throw error;

    // Now fetch the quest
    return await getTodayQuest();
  } catch (error) {
    console.error('Failed to generate daily quest:', error);
    return null;
  }
}

// Get today's quest
export async function getTodayQuest(): Promise<DailyQuest | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('user_id', user.id)
      .eq('quest_date', today)
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Failed to get today quest:', error);
    return null;
  }
}

// Update quest progress
export async function updateQuestProgress(questId: string, progress: number): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase.rpc('check_and_complete_quest', {
      p_user_id: user.id,
      p_quest_id: questId,
      p_current_progress: progress,
    });

    if (error) throw error;

    return data || false;
  } catch (error) {
    console.error('Failed to update quest progress:', error);
    return false;
  }
}

// Claim quest reward
export async function claimQuestReward(questId: string): Promise<{ xp_earned: number; new_total_xp: number } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('claim_quest_reward', {
      p_quest_id: questId,
      p_user_id: user.id,
    });

    if (error) throw error;

    return data?.[0] || null;
  } catch (error) {
    console.error('Failed to claim quest reward:', error);
    return null;
  }
}

// Get quest description for UI
export function getQuestDescription(quest: DailyQuest): string {
  switch (quest.quest_type) {
    case 'steps':
      return `Walk ${quest.target_value.toLocaleString()} steps today`;
    case 'challenge_progress':
      return `Make ${quest.target_value}% progress on your active challenge`;
    case 'social':
      return 'Send a challenge to a team member';
    default:
      return 'Complete your daily quest';
  }
}

// Get quest icon for UI
export function getQuestIcon(questType: string): string {
  switch (questType) {
    case 'steps':
      return '👟';
    case 'challenge_progress':
      return '🎯';
    case 'social':
      return '👥';
    default:
      return '⭐';
  }
}

// Check if user sent a challenge today (for social quest)
export async function checkTodayChallengesSent(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count challenge assignments sent today
    const { count, error } = await supabase
      .from('challenge_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', user.id)
      .gte('sent_at', today.toISOString())
      .lt('sent_at', tomorrow.toISOString());

    if (error) {
      console.error('Failed to check today challenges sent:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Failed to check today challenges sent:', error);
    return 0;
  }
}

// ============================================
// LEADERBOARD SYSTEM
// ============================================

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  email: string;
  level: number;
  xp: number;
  current_streak: number;
  longest_streak: number;
  total_challenges_completed: number;
  is_current_user: boolean;
}

export interface MyLeaderboardPosition {
  my_rank: number;
  total_users: number;
  percentile: number;
}

// Get global leaderboard (top 100 by default)
export async function getGlobalLeaderboard(
  limit: number = 100,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase.rpc('get_global_leaderboard', {
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Failed to get global leaderboard:', error);
    return [];
  }
}

// Get my position in leaderboard
export async function getMyLeaderboardPosition(): Promise<MyLeaderboardPosition | null> {
  try {
    const { data, error } = await supabase.rpc('get_my_leaderboard_position');

    if (error) throw error;

    return data?.[0] || null;
  } catch (error) {
    console.error('Failed to get my leaderboard position:', error);
    return null;
  }
}
