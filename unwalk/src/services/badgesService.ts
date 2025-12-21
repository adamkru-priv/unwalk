import { supabase } from '../lib/supabase';
import { authService } from '../lib/auth';

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

class BadgesService {
  private static instance: BadgesService;

  static getInstance(): BadgesService {
    if (!BadgesService.instance) {
      BadgesService.instance = new BadgesService();
    }
    return BadgesService.instance;
  }

  async getBadges(): Promise<Badge[]> {
    try {
      const { data, error } = await supabase.from('my_badges').select('*').order('sort_order');
      if (error) throw error;
      return data as Badge[];
    } catch (error) {
      console.error('❌ [Badges] Get badges error:', error);
      return [];
    }
  }

  async getTotalPoints(): Promise<number> {
    try {
      const badges = await this.getBadges();
      const unlockedBadges = badges.filter((b) => b.unlocked);
      return unlockedBadges.reduce((sum, badge) => sum + badge.points, 0);
    } catch (error) {
      console.error('❌ [Badges] Get total points error:', error);
      return 0;
    }
  }

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
}

export const badgesService = BadgesService.getInstance();
