import { supabase } from '../supabase';
import type { Badge } from './types';
import { authService } from './authService';

/**
 * BadgesService - User achievements and badges
 */
export class BadgesService {
  private static instance: BadgesService;

  static getInstance(): BadgesService {
    if (!BadgesService.instance) {
      BadgesService.instance = new BadgesService();
    }
    return BadgesService.instance;
  }

  /**
   * Get all available badges with user progress
   */
  async getBadges(userId: string): Promise<{ badges: Badge[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select(`
          *,
          user_badges!left(
            earned_at,
            progress
          )
        `)
        .eq('user_badges.user_id', userId);

      if (error) throw error;

      return { badges: data as Badge[], error: null };
    } catch (error) {
      console.error('❌ [Badges] Get badges error:', error);
      return { badges: [], error: error as Error };
    }
  }

  /**
   * Get earned badges for user
   */
  async getEarnedBadges(userId: string): Promise<{ badges: Badge[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          earned_at,
          badges(*)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      const badges = data?.map((item: any) => ({
        ...item.badges,
        earned_at: item.earned_at,
      })) || [];

      return { badges, error: null };
    } catch (error) {
      console.error('❌ [Badges] Get earned badges error:', error);
      return { badges: [], error: error as Error };
    }
  }

  /**
   * Check and award badges based on user progress
   * This should be called after completing challenges or reaching milestones
   */
  async checkBadgeProgress(userId: string): Promise<{ newBadges: Badge[]; error: Error | null }> {
    try {
      // This would typically be handled by a database trigger or edge function
      // For now, we'll just return empty array
      // The actual logic should be in check_badge_progress() RPC function

      const { data, error } = await supabase.rpc('check_badge_progress', {
        p_user_id: userId,
      });

      if (error) throw error;

      return { newBadges: data as Badge[], error: null };
    } catch (error) {
      console.error('❌ [Badges] Check progress error:', error);
      return { newBadges: [], error: error as Error };
    }
  }

  /**
   * Check and unlock new achievements based on user progress
   * Returns the number of newly unlocked badges
   */
  async checkAchievements(): Promise<{ newBadgesCount: number; error: Error | null }> {
    try {
      const profile = await authService.getUserProfile();
      if (!profile) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('check_and_unlock_achievements', {
        p_user_id: profile.id,
      });

      if (error) throw error;

      const newBadgesCount = data as number;
      if (newBadgesCount > 0) {
        console.log(`🎉 [Badges] Unlocked ${newBadgesCount} new badge(s)!`);
      }

      return { newBadgesCount, error: null };
    } catch (error) {
      console.error('❌ [Badges] Check achievements error:', error);
      return { newBadgesCount: 0, error: error as Error };
    }
  }

  /**
   * Get total points from earned badges
   */
  async getTotalPoints(userId: string): Promise<{ points: number; error: Error | null }> {
    try {
      const { badges, error } = await this.getEarnedBadges(userId);
      if (error) throw error;

      const totalPoints = badges.reduce((sum, badge) => sum + (badge.points || 0), 0);

      return { points: totalPoints, error: null };
    } catch (error) {
      console.error('❌ [Badges] Get total points error:', error);
      return { points: 0, error: error as Error };
    }
  }
}

export const badgesService = BadgesService.getInstance();
