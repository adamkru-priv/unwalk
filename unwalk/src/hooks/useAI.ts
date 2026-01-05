import { useState } from 'react';
import { supabase } from '../lib/supabase';

// 🎯 1. AI Generate Challenge
export function useAIChallenge() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateChallenge = async (context: {
    mood?: 'happy' | 'stressed' | 'tired' | 'energetic' | 'push' | 'active' | 'light' | 'recovery';
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
    weather?: 'sunny' | 'rainy' | 'cold' | 'hot';
    recentSteps?: number;
    timeAvailable?: 'short' | 'medium' | 'long';
    isTeamChallenge?: boolean; // 🎯 NEW: Flag to indicate team challenge
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-generate-challenge', {
        body: context
      });

      if (fnError) throw fnError;
      return data;
    } catch (err: any) {
      console.error('AI Challenge Error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generateChallenge, loading, error };
}

// 🎯 2. AI Stats Insights
export function useAIInsights() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInsights = async (stats: {
    weeklySteps: number[];
    streak: number;
    totalChallenges: number;
    completedChallenges: number;
    level: number;
    xp: number;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-stats-insights', {
        body: stats
      });

      if (fnError) throw fnError;
      return data;
    } catch (err: any) {
      console.error('AI Insights Error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { getInsights, loading, error };
}

// 🎯 3. AI Daily Tips
export function useAITips() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDailyTip = async (context: {
    todaySteps: number;
    dailyGoal: number;
    currentStreak: number;
    userLevel: number;
    hasActiveChallenge: boolean;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-daily-tips', {
        body: context
      });

      if (fnError) throw fnError;
      return data;
    } catch (err: any) {
      console.error('AI Tips Error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { getDailyTip, loading, error };
}

// 🎯 Alias for consistency
export const useAIDailyTip = useAITips;
