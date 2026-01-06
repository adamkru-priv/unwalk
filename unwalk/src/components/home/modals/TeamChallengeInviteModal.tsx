import { useState, useEffect } from 'react';
import type { AdminChallenge } from '../../../types';
import { supabase } from '../../../lib/supabase';

interface TeamMemberOption {
  id: string;
  display_name: string;
  avatar_url?: string;
  email: string; // 🎯 FIX: Add email
}

interface TeamChallengeInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'select-challenge' | 'select-friends';

export function TeamChallengeInviteModal({ isOpen, onClose, onSuccess }: TeamChallengeInviteModalProps) {
  const [step, setStep] = useState<Step>('select-challenge');
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<AdminChallenge | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadChallenges();
      loadTeamMembers();
    }
  }, [isOpen]);

  const loadChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_challenges')
        .select('*')
        .eq('is_active', true)
        .eq('is_team_challenge', true) // 🔥 TYLKO team challenges (20k+)
        .gte('goal_steps', 20000) // Extra safety: minimum 20k
        .gt('time_limit_hours', 0) // Must have deadline
        .order('goal_steps', { ascending: false }); // Największe najpierw!

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Failed to load challenges:', error);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 🎯 FIX: Get email too for sending invitations
      const { data, error } = await supabase
        .from('team_members')
        .select('member_id, member:users!member_id(id, display_name, avatar_url, email)')
        .eq('user_id', user.id)
        .neq('member_id', user.id);

      if (error) {
        console.error('Load team members error:', error);
        throw error;
      }

      const members = (data || [])
        .filter((m: any) => m.member)
        .map((m: any) => ({
          id: m.member.id,
          display_name: m.member.display_name || 'Unknown',
          avatar_url: m.member.avatar_url,
          email: m.member.email // 🎯 FIX: Add email
        }));

      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

  const handleChallengeSelect = (challenge: AdminChallenge) => {
    setSelectedChallenge(challenge);
    setStep('select-friends');
  };

  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  };

  const handleSendInvitations = async () => {
    if (!selectedChallenge) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get device_id for user_challenge
      const { getDeviceId } = await import('../../../lib/deviceId');
      const deviceId = getDeviceId();

      // 🎯 STEP 1: ALWAYS create user_challenge first (whether solo or with friends)
      const { error: challengeError } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          device_id: deviceId,
          admin_challenge_id: selectedChallenge.id,
          status: 'active',
          current_steps: 0,
          started_at: new Date().toISOString(),
          last_resumed_at: new Date().toISOString()
          // 🎯 REMOVED: is_team_challenge - this column doesn't exist
          // We can identify team challenges via admin_challenge.is_team_challenge
        });

      if (challengeError) {
        console.error('Failed to create user_challenge:', challengeError);
        throw challengeError;
      }

      // 🎯 STEP 2: If no friends selected, we're done - it's solo
      if (selectedFriends.size === 0) {
        alert('✅ Team Challenge started! You can invite friends later.');
        onSuccess();
        handleClose();
        setLoading(false);
        return;
      }

      // 🎯 STEP 3: Send invitations to selected friends
      const invitations = Array.from(selectedFriends).map(memberId => ({
        invited_by: user.id,
        invited_user: memberId,
        challenge_id: selectedChallenge.id,
        status: 'pending'
      }));

      const { error: inviteError } = await supabase
        .from('team_challenge_invitations')
        .upsert(invitations, {
          onConflict: 'invited_user,challenge_id,invited_by',
          ignoreDuplicates: false
        });

      if (inviteError) {
        console.error('Failed to send invitations:', inviteError);
        throw inviteError;
      }

      console.log('✅ [TeamChallengeInviteModal] Invitations inserted, now sending emails...');

      // 🎯 NEW: Send email notifications to invited users
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        console.log('📧 [TeamChallengeInviteModal] Starting to send email notifications...');
        console.log('📧 [TeamChallengeInviteModal] Supabase URL:', supabaseUrl);
        console.log('📧 [TeamChallengeInviteModal] Team members:', teamMembers);
        
        for (const invitation of invitations) {
          const invitedMember = teamMembers.find(m => m.id === invitation.invited_user);
          
          console.log('📧 [TeamChallengeInviteModal] Processing invitation for:', invitedMember?.display_name, invitedMember?.email);
          
          if (!invitedMember?.email) {
            console.error('❌ [TeamChallengeInviteModal] No email for user:', invitedMember?.display_name);
            continue;
          }
          
          // Get the invitation ID from the database
          const { data: invitationData, error: fetchError } = await supabase
            .from('team_challenge_invitations')
            .select('id')
            .eq('invited_by', user.id)
            .eq('invited_user', invitation.invited_user)
            .eq('challenge_id', selectedChallenge.id)
            .single();

          if (fetchError) {
            console.error('❌ [TeamChallengeInviteModal] Failed to fetch invitation ID:', fetchError);
            continue;
          }

          if (invitationData) {
            console.log('📧 [TeamChallengeInviteModal] Calling Edge Function with:', {
              recipientEmail: invitedMember.email,
              senderName: user.user_metadata?.display_name || user.email || 'Someone',
              challengeTitle: selectedChallenge.title,
              invitationId: invitationData.id
            });
            
            // 🎯 Use fetch instead of supabase.functions.invoke for better error handling
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-team-challenge-invitation`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                recipientEmail: invitedMember.email,
                senderName: user.user_metadata?.display_name || user.email || 'Someone',
                challengeTitle: selectedChallenge.title,
                invitationId: invitationData.id
              })
            });
            
            const responseText = await emailResponse.text();
            console.log('📧 [TeamChallengeInviteModal] Edge Function response status:', emailResponse.status);
            console.log('📧 [TeamChallengeInviteModal] Edge Function response:', responseText);
            
            if (!emailResponse.ok) {
              console.error('❌ [TeamChallengeInviteModal] Edge Function error:', responseText);
            } else {
              console.log('✅ [TeamChallengeInviteModal] Email sent successfully to:', invitedMember.email);
            }
          }
        }
        
        console.log('✅ [TeamChallengeInviteModal] Email notification process completed');
      } catch (emailError) {
        console.error('❌ [TeamChallengeInviteModal] Failed to send email notifications:', emailError);
        // Don't throw - push notifications will still work
      }

      const friendCount = selectedFriends.size;
      const friendNames = teamMembers
        .filter(m => selectedFriends.has(m.id))
        .map(m => m.display_name)
        .join(', ');
      
      alert(`✅ Sent ${friendCount} invitation${friendCount > 1 ? 's' : ''} to: ${friendNames}`);

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to start challenge:', error);
      
      if (error.code === '23505') {
        alert('⚠️ Some invitations were already sent to these friends for this challenge.');
      } else if (error.code === '23503') {
        alert('⚠️ Challenge not found. Please try selecting a different challenge.');
      } else {
        alert(`❌ Failed to start challenge: ${error.message || 'Please try again.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('select-challenge');
    setSelectedChallenge(null);
    setSelectedFriends(new Set());
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  const filteredChallenges = challenges.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#151A25] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              {step === 'select-challenge' ? '1. Select Challenge' : '2. Choose Friends'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {step === 'select-challenge' 
              ? 'Pick a challenge to do together with friends'
              : `Challenge: ${selectedChallenge?.title}`}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === 'select-challenge' && (
            <div className="space-y-4">
              {/* Search */}
              <input
                type="text"
                placeholder="🔍 Search challenges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-[#0B101B] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />

              {/* Challenges List */}
              <div className="space-y-3">
                {filteredChallenges.map((challenge) => (
                  <button
                    key={challenge.id}
                    onClick={() => handleChallengeSelect(challenge)}
                    className="w-full text-left p-4 rounded-2xl bg-gray-50 dark:bg-[#0B101B] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{challenge.icon || '🎯'}</div>
                      <div className="flex-1">
                        <h3 className="font-black text-gray-900 dark:text-white mb-1">
                          {challenge.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {challenge.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                          <span>🎯 {challenge.goal_steps.toLocaleString()} steps</span>
                          <span>⏱️ {challenge.time_limit_hours}h</span>
                          <span>⭐ +{challenge.points} XP</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {filteredChallenges.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No challenges found</p>
                </div>
              )}
            </div>
          )}

          {step === 'select-friends' && (
            <div className="space-y-4">
              {/* Selected Challenge Summary */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{selectedChallenge?.icon || '🎯'}</span>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white">
                      {selectedChallenge?.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedChallenge?.goal_steps.toLocaleString()} steps • {selectedChallenge?.time_limit_hours}h
                    </p>
                  </div>
                </div>
              </div>

              {/* Friends List */}
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase px-1">
                  Select Friends ({selectedFriends.size} selected)
                </p>
                
                {teamMembers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No friends added yet</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Add friends in the Team tab to invite them
                    </p>
                  </div>
                ) : (
                  teamMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => toggleFriend(member.id)}
                      className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                        selectedFriends.has(member.id)
                          ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg scale-105'
                          : 'bg-gray-50 dark:bg-[#0B101B] hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt={member.display_name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span>{member.display_name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      {/* Name */}
                      <span className="flex-1 text-left font-bold">
                        {member.display_name}
                      </span>

                      {/* Checkbox */}
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedFriends.has(member.id)
                          ? 'border-white bg-white/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedFriends.has(member.id) && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800">
          <div className="flex gap-3">
            {step === 'select-friends' && (
              <button
                onClick={() => setStep('select-challenge')}
                className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold hover:scale-105 active:scale-95 transition-transform"
              >
                ← Back
              </button>
            )}
            
            {step === 'select-friends' && (
              <button
                onClick={handleSendInvitations}
                disabled={loading}
                className={`flex-1 px-6 py-3 rounded-xl font-black text-white transition-all ${
                  loading
                    ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:scale-105 active:scale-95 shadow-xl'
                }`}
              >
                {loading 
                  ? 'Starting...' 
                  : selectedFriends.size === 0 
                    ? 'Start Challenge Solo' 
                    : `Send ${selectedFriends.size} Invitation${selectedFriends.size !== 1 ? 's' : ''}`
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
