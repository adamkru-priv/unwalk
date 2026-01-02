import { supabase } from '../supabase';
import type { Badge } from './types';
import { authService } from './authService';

/**
 * BadgesService - Badges & Achievements Management
 * Handles badge unlocking, points calculation, and achievement checks
 */
class BadgesService {
  private static instance: BadgesService;

  static getInstance(): BadgesService {
    if (!BadgesService.instance) {
      BadgesService.instance = new BadgesService();
    }
    return BadgesService.instance;
  }

  /**
   * Get all badges with unlocked status for current user
   */
  async getBadges(): Promise<Badge[]> {
    try {
      const { data, error } = await supabase
        .from('my_badges')
        .select('*')
        .order('sort_order');

      if (error) throw error;

      return data as Badge[];
    } catch (error) {
      console.error('❌ [Badges] Get badges error:', error);
      return [];
    }
  }

  /**
   * Get total points from unlocked badges
   */
  async getTotalPoints(): Promise<number> {
    try {
      const badges = await this.getBadges();
      const unlockedBadges = badges.filter(b => b.unlocked);
      return unlockedBadges.reduce((sum, badge) => sum + badge.points, 0);
    } catch (error) {
      console.error('❌ [Badges] Get total points error:', error);
      return 0;
    }
  }

  /**
   * Manually trigger achievement check
   * Called after completing a challenge or updating progress
   */
  async checkAchievements(): Promise<{ newBadgesCount: number; error: Error | null }> {
    try {
      const profile = await authService.getUserProfile();
      if (!profile) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('check_and_unlock_achievements', {
        p_user_id: profile.id
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
}

export const badgesService = BadgesService.getInstance();
