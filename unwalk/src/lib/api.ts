// Stage 1: Admin-Curated Challenges API
import { supabase } from './supabase';
import { getDeviceId } from './deviceId';
import type { AdminChallenge, UserChallenge } from '../types';
import { badgesService } from './auth';
import { addXPToUser } from './gamification';

// Calculate XP for a challenge based on goal_steps
export function calculateChallengePoints(goalSteps: number, isDailyChallenge: boolean = false): number {
  let baseXP = 0;
  
  // ✅ NEW: Increased XP rewards for challenges (x5-10 multiplier)
  if (goalSteps <= 5000) {
    baseXP = 25;      // Was: 5 XP
  } else if (goalSteps <= 10000) {
    baseXP = 50;      // Was: 10 XP
  } else if (goalSteps <= 15000) {
    baseXP = 75;      // Was: 15 XP
  } else if (goalSteps <= 25000) {
    baseXP = 125;     // Was: 25 XP
  } else {
    baseXP = 200;     // Was: 50 XP
  }
  
  // Daily challenge gets x2 multiplier (was x3)
  return isDailyChallenge ? baseXP * 2 : baseXP;
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
  
  // Get current user (for authenticated users)
  const { data: { user } } = await supabase.auth.getUser();
  
  // 🎯 FIX: Get SOLO challenge only (team_id IS NULL)
  // Build query - prioritize user_id for authenticated users
  let query = supabase
    .from('user_challenges')
    .select(`
      *,
      admin_challenge:admin_challenges(*)
    `)
    .eq('status', 'active')
    .is('team_id', null)  // 🎯 FIX: Only Solo challenges (no team_id)
    .order('started_at', { ascending: false })
    .limit(1);
  
  if (user) {
    // Authenticated user - prioritize user_id, fallback to device_id
    query = query.or(`user_id.eq.${user.id},device_id.eq.${deviceId}`);
    console.log('🔍 [API] Searching for active SOLO challenge by user_id OR device_id');
  } else {
    // Guest - only match by device_id
    query = query.eq('device_id', deviceId);
    console.log('🔍 [API] Searching for active SOLO challenge by device_id (guest)');
  }
  
  const { data, error } = await query;

  if (error) {
    console.error('❌ [API] Error loading active challenge:', error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    console.log('ℹ️ [API] No active SOLO challenge found');
    return null;
  }
  
  // Get the first (most recent) challenge
  const challenge = data[0];
  console.log('✅ [API] Active SOLO challenge found:', challenge.admin_challenge?.title);
  
  // If challenge was assigned by someone, fetch assigner info separately
  if (challenge.assigned_by) {
    const { data: assigner } = await supabase
      .from('users')
      .select('display_name, avatar_url')
      .eq('id', challenge.assigned_by)
      .single();
    
    if (assigner) {
      return {
        ...challenge,
        assigned_by_name: assigner.display_name,
        assigned_by_avatar: assigner.avatar_url,
      };
    }
  }
  
  return challenge;
}

// 🎯 NEW: Get user's active TEAM challenge (separate from Solo)
export async function getActiveTeamChallenge(): Promise<UserChallenge | null> {
  const deviceId = getDeviceId();
  
  // Get current user (for authenticated users)
  const { data: { user } } = await supabase.auth.getUser();
  
  // 🎯 DEBUG: Log user info
  console.log('🔍 [API] getActiveTeamChallenge - user:', user?.id, 'deviceId:', deviceId);
  
  // 🎯 FIX: Get STARTED team challenges only (team_id NOT NULL AND started_at NOT NULL)
  let query = supabase
    .from('user_challenges')
    .select('*')
    .eq('status', 'active')
    .not('team_id', 'is', null)  // Has team_id
    .not('started_at', 'is', null)  // ✅ NEW: Must be started
    .order('started_at', { ascending: false })
    .limit(1);
  
  if (user) {
    query = query.or(`user_id.eq.${user.id},device_id.eq.${deviceId}`);
    console.log('🔍 [API] Searching for STARTED team challenge (started_at NOT NULL)');
  } else {
    query = query.eq('device_id', deviceId);
    console.log('🔍 [API] Searching for STARTED team challenge by device_id (guest)');
  }
  
  const { data, error } = await query;

  // 🎯 DEBUG: Log raw response
  console.log('🔍 [API] getActiveTeamChallenge - raw data:', data);
  console.log('🔍 [API] getActiveTeamChallenge - error:', error);

  if (error) {
    console.error('❌ [API] Error loading team challenge:', error);
    return null;  // 🎯 FIX: Return null instead of throwing
  }
  
  if (!data || data.length === 0) {
    console.log('ℹ️ [API] No STARTED team challenge found');
    return null;
  }
  
  const challenge = data[0];
  
  // 🎯 CRITICAL: Verify team_id AND started_at are set
  if (!challenge.team_id || !challenge.started_at) {
    console.error('❌ [API] WARNING: Challenge returned but team_id or started_at is NULL!', challenge);
    return null;
  }
  
  // 🎯 FIX: Fetch admin_challenge separately to avoid ambiguous reference
  const { data: adminChallenge } = await supabase
    .from('admin_challenges')
    .select('*')
    .eq('id', challenge.admin_challenge_id)
    .single();
  
  console.log('✅ [API] STARTED team challenge found:', adminChallenge?.title, '- team_id:', challenge.team_id);
  
  return {
    ...challenge,
    admin_challenge: adminChallenge
  };
}

// Get user's paused challenges (for Pro users)
export async function getPausedChallenges(): Promise<UserChallenge[]> {
  const deviceId = getDeviceId();
  
  const { data, error } = await supabase
    .from('user_challenges')
    .select(`
      *,
      admin_challenge:admin_challenges(*)
    `)
    .eq('device_id', deviceId)
    .eq('status', 'paused')
    .order('updated_at', { ascending: false }); // ✅ Changed from 'paused_at' to 'updated_at'

  if (error) {
    console.error('❌ [API] Failed to load paused challenges:', error);
    return [];
  }
  
  return data || [];
}

// Start a new challenge (accept from library)
// 🎯 FIX: Allow multiple active challenges (Solo + Team simultaneously)
// Do NOT delete existing challenges when starting a new one
export async function startChallenge(
  adminChallengeId: string, 
  teamId?: string  // 🎯 NEW: Optional team_id for team challenges
): Promise<UserChallenge> {
  const deviceId = getDeviceId();
  
  // Get current user (for Pro users to track badges/achievements)
  const { data: { user } } = await supabase.auth.getUser();
  
  // 🎯 FIX: Check if this is a team challenge being created
  // Team challenges should have team_id set to link them together
  const insertData: any = {
    device_id: deviceId,
    user_id: user?.id, // Add user_id for authenticated Pro users (needed for badges)
    admin_challenge_id: adminChallengeId,
    current_steps: 0,
    status: 'active',
    started_at: new Date().toISOString(),
  };
  
  // 🎯 NEW: Add team_id if this is a team challenge
  if (teamId) {
    insertData.team_id = teamId;
  }
  
  const { data, error } = await supabase
    .from('user_challenges')
    .insert(insertData)
    .select(`
      *,
      admin_challenge:admin_challenges(*)
    `)
    .single();

  if (error) throw error;
  
  console.log(`✅ [API] Challenge started: ${data.admin_challenge?.title} (Team: ${!!teamId})`);
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
  
  // ✅ Check and unlock achievements for PRO users
  try {
    await badgesService.checkAchievements();
    console.log('✅ [API] Checked achievements after completing challenge');
  } catch (achievementError) {
    console.error('⚠️ [API] Failed to check achievements:', achievementError);
    // Don't throw - completing challenge is more important than badge checking
  }
  
  return data;
}

// Get completed challenges (for history)
export async function getCompletedChallenges(): Promise<UserChallenge[]> {
  const deviceId = getDeviceId();
  
  // Get current user (for authenticated users)
  const { data: { user } } = await supabase.auth.getUser();
  
  // For authenticated users, query by user_id OR device_id
  // For guests, only query by device_id
  let query = supabase
    .from('user_challenges')
    .select(`
      *,
      admin_challenge:admin_challenges(*)
    `)
    .in('status', ['completed', 'claimed']) // Include both completed and claimed challenges
    .order('completed_at', { ascending: false });
  
  if (user) {
    // Authenticated user - match by user_id OR device_id
    query = query.or(`user_id.eq.${user.id},device_id.eq.${deviceId}`);
  } else {
    // Guest - only match by device_id
    query = query.eq('device_id', deviceId);
  }
  
  const { data, error } = await query;

  if (error) {
    console.error('❌ [API] Failed to load completed challenges:', error);
    throw error;
  }
  
  console.log('✅ [API] Completed challenges loaded:', data?.length || 0);
  return data || [];
}

// Get completed but unclaimed challenges
// NOTE: In Stage 1, we use status 'completed' (no separate unclaimed state)
// This function returns empty array for now - will be used in Stage 2
export async function getUnclaimedChallenges(): Promise<UserChallenge[]> {
  // TEMPORARILY DISABLED - Status 'completed_unclaimed' doesn't exist in DB
  // In Stage 1, challenges are deleted immediately after completion (no claiming flow)
  // TODO: Implement claiming flow in Stage 2 with proper status
  return [];
  
  /* ORIGINAL CODE - Re-enable in Stage 2:
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
  */
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
  
  // ✅ FIX: Add XP reward ONLY if challenge was FULLY completed (100%)
  if (data?.is_fully_completed && data?.admin_challenge?.goal_steps) {
    const xpAmount = calculateChallengePoints(data.admin_challenge.goal_steps, data.admin_challenge.is_daily || false);
    
    try {
      const result = await addXPToUser(
        xpAmount,
        'challenge',
        userChallengeId,
        `Completed: ${data.admin_challenge.title}`
      );
      
      if (result) {
        console.log(`✅ [API] Added ${xpAmount} XP for FULLY completed challenge`, result);
      }
    } catch (xpError) {
      console.error('⚠️ [API] Failed to add XP reward:', xpError);
      // Don't throw - claiming challenge is more important than XP reward
    }
  } else if (!data?.is_fully_completed) {
    console.log('ℹ️ [API] Challenge was not fully completed (< 100%), skipping XP reward');
  }
  
  // ✅ Check and unlock achievements for PRO users
  // Note: Achievement check already filtered by is_fully_completed in database trigger
  try {
    await badgesService.checkAchievements();
    console.log('✅ [API] Checked achievements after claiming challenge');
  } catch (achievementError) {
    console.error('⚠️ [API] Failed to check achievements:', achievementError);
    // Don't throw - claiming challenge is more important than badge checking
  }

  // TODO(push): call Supabase Edge Function to notify about claimed rewards (e.g., sender in challenge assignment)

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

// Delete user challenge (exit challenge)
export async function deleteUserChallenge(userChallengeId: string): Promise<void> {
  const { error } = await supabase
    .from('user_challenges')
    .delete()
    .eq('id', userChallengeId);

  if (error) throw error;
  console.log('✅ [API] User challenge deleted:', userChallengeId);
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

  // Prefer stable user id when logged in
  const { data: { user } } = await supabase.auth.getUser();

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
      created_by_user_id: user?.id ?? null,
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
  const { data: { user } } = await supabase.auth.getUser();

  // If authenticated, use stable user id; fallback to device id for guests
  let query = supabase
    .from('admin_challenges')
    .select('*')
    .eq('is_custom', true)
    .order('created_at', { ascending: false });

  if (user?.id) {
    query = query.eq('created_by_user_id', user.id);
  } else {
    query = query.eq('created_by_device_id', deviceId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

// Delete custom challenge
export async function deleteCustomChallenge(challengeId: string): Promise<void> {
  const deviceId = getDeviceId();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Build query to verify this is a custom challenge created by this user
  let query = supabase
    .from('admin_challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('is_custom', true);

  // For authenticated users, check by user_id; for guests, check by device_id
  if (user?.id) {
    query = query.eq('created_by_user_id', user.id);
  } else {
    query = query.eq('created_by_device_id', deviceId);
  }

  const { data: challenge, error: fetchError } = await query.single();

  if (fetchError || !challenge) {
    throw new Error('Challenge not found or not authorized to delete');
  }

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

export async function updateCustomChallenge(
  challengeId: string,
  updates: Partial<{
    title: string;
    description: string;
    goal_steps: number;
    image_url: string;
    is_image_hidden: boolean;
    deadline: string | null;
  }>
): Promise<AdminChallenge> {
  const deviceId = getDeviceId();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('admin_challenges')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', challengeId)
    .eq('is_custom', true)
    .select('*');

  if (user?.id) {
    query = query.eq('created_by_user_id', user.id);
  } else {
    query = query.eq('created_by_device_id', deviceId);
  }

  const { data, error } = await query.single();

  if (error) throw error;
  return data;
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
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('👤 [API] No authenticated user - skipping team challenges');
      return [];
    }
    
    const { data, error } = await supabase
      .from('challenge_assignments_with_progress')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .not('user_challenge_id', 'is', null)
      .eq('user_challenge_status', 'active')
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('❌ [API] Failed to load team challenges:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ [API] Team challenges error:', error);
    return [];
  }
}

// Get team member stats (current count, max allowed based on tier)
export async function getTeamMemberStats(): Promise<{
  current_members: number;
  max_members: number;
  tier: string;
} | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('👤 [API] No authenticated user - cannot check team stats');
      return null;
    }

    const { data, error } = await supabase.rpc('get_team_member_stats', {
      p_user_id: user.id
    });

    if (error) throw error;

    return data?.[0] || null;
  } catch (error) {
    console.error('❌ [API] Get team member stats error:', error);
    return null;
  }
}

// ===== Social: progress for challenges you sent (delegated) =====
export type ChallengeAssignmentWithProgress = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  sent_at: string;
  user_challenge_status?: string | null;
  current_steps?: number | null;
  // column in view: challenge_goal_steps
  goal_steps?: number | null;
};

// Get accepted assignments (with progress) SENT by current user
export async function getChallengeAssignmentsWithProgress(): Promise<ChallengeAssignmentWithProgress[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('challenge_assignments_with_progress')
      .select('id, recipient_id, user_challenge_status, current_steps, challenge_goal_steps, sent_at')
      .eq('sender_id', user.id)
      .eq('status', 'accepted')
      .not('user_challenge_id', 'is', null)
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('❌ [API] Failed to load challenge_assignments_with_progress:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      sender_id: user.id,
      recipient_id: row.recipient_id,
      status: 'accepted',
      sent_at: row.sent_at,
      user_challenge_status: row.user_challenge_status,
      current_steps: row.current_steps,
      goal_steps: row.challenge_goal_steps,
    }));
  } catch (e) {
    console.error('❌ [API] getChallengeAssignmentsWithProgress error:', e);
    return [];
  }
}
