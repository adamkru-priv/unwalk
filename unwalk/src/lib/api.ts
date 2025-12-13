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

// ========== CUSTOM CHALLENGES API ==========

// Upload custom challenge image to Supabase Storage
export async function uploadChallengeImage(file: File): Promise<string> {
  const deviceId = getDeviceId();
  const fileExt = file.name.split('.').pop();
  const fileName = `${deviceId}_${Date.now()}.${fileExt}`;
  const filePath = `challenge-images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('custom-challenges')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data } = supabase.storage
    .from('custom-challenges')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// Create custom challenge
export async function createCustomChallenge(challenge: {
  title: string;
  description: string;
  goal_steps: number;
  image_url: string;
  is_image_hidden: boolean;
  deadline?: string;
}): Promise<AdminChallenge> {
  const deviceId = getDeviceId();
  
  const { data, error } = await supabase
    .from('admin_challenges')
    .insert({
      ...challenge,
      is_custom: true,
      created_by_device_id: deviceId,
      category: 'fun',
      difficulty: 'medium',
      sort_order: 999,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Assign challenge to user(s)
export async function assignChallengeToUsers(
  adminChallengeId: string,
  targetDeviceIds: string[],
  isGroupChallenge: boolean = false
): Promise<UserChallenge[]> {
  const assignerDeviceId = getDeviceId();
  
  const challenges = targetDeviceIds.map(deviceId => ({
    device_id: deviceId,
    admin_challenge_id: adminChallengeId,
    current_steps: 0,
    status: 'active' as const,
    started_at: new Date().toISOString(),
    assigned_by: assignerDeviceId,
    is_group_challenge: isGroupChallenge,
    group_members: isGroupChallenge ? targetDeviceIds : undefined,
  }));

  const { data, error } = await supabase
    .from('user_challenges')
    .insert(challenges)
    .select(`
      *,
      admin_challenge:admin_challenges(*)
    `);

  if (error) throw error;
  return data || [];
}

// Get custom challenges created by current user
export async function getMyCustomChallenges(): Promise<AdminChallenge[]> {
  const deviceId = getDeviceId();
  
  const { data, error } = await supabase
    .from('admin_challenges')
    .select('*')
    .eq('is_custom', true)
    .eq('created_by_device_id', deviceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
