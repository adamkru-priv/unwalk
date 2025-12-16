// Stage 1: Admin-Curated Challenges API
import { supabase } from './supabase';
import { getDeviceId } from './deviceId';
import type { AdminChallenge, UserChallenge } from '../types';

// Calculate points for a challenge based on goal_steps
export function calculateChallengePoints(goalSteps: number, isDailyChallenge: boolean = false): number {
  let basePoints = 0;
  
  if (goalSteps <= 5000) {
    basePoints = 5;
  } else if (goalSteps <= 10000) {
    basePoints = 10;
  } else if (goalSteps <= 15000) {
    basePoints = 15;
  } else if (goalSteps <= 25000) {
    basePoints = 25;
  } else {
    basePoints = 50;
  }
  
  // Daily challenge gets x3 multiplier
  return isDailyChallenge ? basePoints * 3 : basePoints;
}

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
  
  // If challenge was assigned by someone, fetch assigner info separately
  if (data && data.assigned_by) {
    const { data: assigner } = await supabase
      .from('users')
      .select('display_name, avatar_url')
      .eq('id', data.assigned_by)
      .single();
    
    if (assigner) {
      return {
        ...data,
        assigned_by_name: assigner.display_name,
        assigned_by_avatar: assigner.avatar_url,
      };
    }
  }
  
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
      status: 'completed_unclaimed',
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

// Get completed but unclaimed challenges
export async function getUnclaimedChallenges(): Promise<UserChallenge[]> {
  const deviceId = getDeviceId();
  
  const { data, error } = await supabase
    .from('user_challenges')
    .select(`
      *,
      admin_challenge:admin_challenges(*)
    `)
    .eq('device_id', deviceId)
    .eq('status', 'completed_unclaimed')
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Claim completed challenge reward
export async function claimCompletedChallenge(userChallengeId: string): Promise<UserChallenge> {
  const { data, error } = await supabase
    .from('user_challenges')
    .update({
      status: 'claimed',
      claimed_at: new Date().toISOString(),
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

// Update challenge status
export async function updateChallengeStatus(
  userChallengeId: string,
  status: string
): Promise<UserChallenge> {
  const updateData: any = { status };
  
  // Add timestamp based on status
  if (status === 'completed_unclaimed' || status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  } else if (status === 'claimed') {
    updateData.claimed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('user_challenges')
    .update(updateData)
    .eq('id', userChallengeId)
    .select(`
      *,
      admin_challenge:admin_challenges(*)
    `)
    .single();

  if (error) throw error;
  return data;
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
  category: 'animals' | 'sport' | 'nature' | 'surprise';
  goal_steps: number;
  image_url: string;
  is_image_hidden: boolean;
  deadline?: string;
}): Promise<AdminChallenge> {
  const deviceId = getDeviceId();
  
  const { data, error } = await supabase
    .from('admin_challenges')
    .insert({
      title: challenge.title,
      description: challenge.description,
      category: challenge.category,
      goal_steps: challenge.goal_steps,
      image_url: challenge.image_url,
      is_image_hidden: challenge.is_image_hidden,
      deadline: challenge.deadline,
      is_custom: true,
      created_by_device_id: deviceId,
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

// Delete custom challenge
export async function deleteCustomChallenge(challengeId: string): Promise<void> {
  const deviceId = getDeviceId();
  
  // First, verify this is a custom challenge created by this user
  const { data: challenge, error: fetchError } = await supabase
    .from('admin_challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('is_custom', true)
    .eq('created_by_device_id', deviceId)
    .single();

  if (fetchError) throw new Error('Challenge not found or not authorized to delete');
  if (!challenge) throw new Error('Not authorized to delete this challenge');

  // Delete associated user_challenges first
  const { error: deleteUserChallengesError } = await supabase
    .from('user_challenges')
    .delete()
    .eq('admin_challenge_id', challengeId);

  if (deleteUserChallengesError) throw deleteUserChallengesError;

  // Delete the challenge
  const { error: deleteChallengeError } = await supabase
    .from('admin_challenges')
    .delete()
    .eq('id', challengeId);

  if (deleteChallengeError) throw deleteChallengeError;

  // Delete image from storage if it exists
  if (challenge.image_url && challenge.image_url.includes('custom-challenges')) {
    const urlParts = challenge.image_url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `challenge-images/${fileName}`;
    
    await supabase.storage
      .from('custom-challenges')
      .remove([filePath]);
  }
}

// Get all user challenges (active, paused, waiting to start)
export async function getAllUserChallenges(): Promise<UserChallenge[]> {
  const deviceId = getDeviceId();
  
  const { data, error } = await supabase
    .from('user_challenges')
    .select(`
      *,
      admin_challenge:admin_challenges(*)
    `)
    .eq('device_id', deviceId)
    .in('status', ['active', 'paused', 'pending'])
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get team members' active challenges (for social view on home screen)
export async function getTeamActiveChallenges(): Promise<any[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('challenge_assignments_with_progress')
    .select('*')
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .eq('status', 'accepted')
    .not('user_challenge_id', 'is', null)
    .eq('user_challenge_status', 'active')
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('Failed to load team challenges:', error);
    return [];
  }
  
  return data || [];
}
