// Stage 1: Admin-Curated Challenges API
import { supabase } from './supabase';
import { getDeviceId } from './deviceId';
import type { AdminChallenge, UserChallenge } from '../types';

// Fetch all active admin challenges (sorted by sort_order)
export async function getAdminChallenges(): Promise<AdminChallenge[]> {
  const { data, error } = await supabase
    .from('admin_challenges')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get user's active challenge (one at a time in Stage 1)
export async function getActiveUserChallenge(): Promise<UserChallenge | null> {
  const deviceId = getDeviceId();
  
  const { data, error } = await supabase
    .from('user_challenges')
    .select(`
      *,
      admin_challenge:admin_challenges(*)
    `)
    .eq('device_id', deviceId)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data || null;
}

// Start a new challenge (accept from library)
export async function startChallenge(adminChallengeId: string): Promise<UserChallenge> {
  const deviceId = getDeviceId();
  
  const { data, error } = await supabase
    .from('user_challenges')
    .insert({
      device_id: deviceId,
      admin_challenge_id: adminChallengeId,
      current_steps: 0,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select(`
      *,
      admin_challenge:admin_challenges(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

// Update progress (called from HealthKit sync)
export async function updateChallengeProgress(
  userChallengeId: string,
  steps: number
): Promise<UserChallenge> {
  const { data, error } = await supabase
    .from('user_challenges')
    .update({ current_steps: steps })
    .eq('id', userChallengeId)
    .select(`
      *,
      admin_challenge:admin_challenges(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

// Complete challenge (manual or auto when goal reached)
export async function completeChallenge(userChallengeId: string): Promise<UserChallenge> {
  const { data, error } = await supabase
    .from('user_challenges')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', userChallengeId)
    .select(`
      *,
      admin_challenge:admin_challenges(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

// Get completed challenges (for history)
export async function getCompletedChallenges(): Promise<UserChallenge[]> {
  const deviceId = getDeviceId();
  
  const { data, error } = await supabase
    .from('user_challenges')
    .select(`
      *,
      admin_challenge:admin_challenges(*)
    `)
    .eq('device_id', deviceId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
