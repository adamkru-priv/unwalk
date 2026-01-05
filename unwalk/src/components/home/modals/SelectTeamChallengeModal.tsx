import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useChallengeStore } from '../../../stores/useChallengeStore';
import { analytics, AnalyticsEvents } from '../../../lib/analytics';
import { useAIChallenge } from '../../../hooks/useAI';

interface TeamMemberOption {
  id: string;
  display_name: string;
  avatar_url?: string;
}

interface SelectTeamChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'select-challenge' | 'select-friends';

export function SelectTeamChallengeModal({ isOpen, onClose, onSuccess }: SelectTeamChallengeModalProps) {
  const [step, setStep] = useState<Step>('select-challenge');
  const [loading, setLoading] = useState(false);
  
  // 🎯 AI state for TEAM
  const [teamVibe, setTeamVibe] = useState<'competitive' | 'cooperative' | 'fun' | 'support'>('cooperative');
  const [teamSize, setTeamSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [aiGeneratedChallenge, setAiGeneratedChallenge] = useState<any>(null);
  
  // Friends selection
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  
  const { generateChallenge, loading: aiLoading } = useAIChallenge();
  const userProfile = useChallengeStore((s) => s.userProfile);

  useEffect(() => {
    if (isOpen) {
      loadTeamMembers();
    }
  }, [isOpen]);

  const loadTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('team_members')
        .select('member_id, member:users!member_id(id, display_name, nickname, avatar_url)')
        .eq('user_id', user.id)
        .neq('member_id', user.id);

      if (error) throw error;

      const members = (data || [])
        .filter((m: any) => m.member)
        .map((m: any) => ({
          id: m.member.id,
          display_name: m.member.nickname || m.member.display_name || 'Unknown',
          avatar_url: m.member.avatar_url
        }));

      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

  const handleClose = () => {
    setStep('select-challenge');
    setAiGeneratedChallenge(null);
    setSelectedFriends(new Set());
    setTeamVibe('cooperative');
    setTeamSize('medium');
    onClose();
  };

  // 🎯 Generate AI challenge for TEAM
  const handleGenerateAI = async () => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const weather = 'sunny';
    const recentSteps = userProfile?.xp ? Math.floor(userProfile.xp / 10) : 8000;

    // 🎯 FIX: Map team vibe to mood type expected by AI
    const moodMap: Record<typeof teamVibe, 'push' | 'active' | 'light'> = {
      'competitive': 'push',
      'cooperative': 'active',
      'fun': 'light',
      'support': 'light'
    };

    // 🎯 FIX: Map team size to time available
    const timeMap: Record<typeof teamSize, 'short' | 'medium' | 'long'> = {
      'small': 'short',
      'medium': 'medium',
      'large': 'long'
    };

    const result = await generateChallenge({
      mood: moodMap[teamVibe],
      timeOfDay,
      weather,
      recentSteps,
      timeAvailable: timeMap[teamSize],
      isTeamChallenge: true
    });

    if (result) {
      setAiGeneratedChallenge(result);
      analytics.track(AnalyticsEvents.CHALLENGE_STARTED, {
        challenge_type: 'ai_generated_team',
        team_vibe: teamVibe,
        team_size: teamSize,
        ai_difficulty: result.difficulty
      });
    }
  };

  // 🎯 Go to friends selection
  const handleContinueToFriends = () => {
    if (!aiGeneratedChallenge) return;
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

  // 🎯 Send invitations and start team challenge
  const handleSendInvitations = async () => {
    if (!aiGeneratedChallenge) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { getDeviceId } = await import('../../../lib/deviceId');
      const deviceId = getDeviceId();

      // Create custom challenge
      const { data: customChallenge, error: createError } = await supabase
        .from('admin_challenges')
        .insert({
          title: aiGeneratedChallenge.title,
          description: aiGeneratedChallenge.description,
          category: 'distance',
          difficulty: aiGeneratedChallenge.difficulty,
          goal_steps: aiGeneratedChallenge.steps,
          time_limit_hours: aiGeneratedChallenge.time_hours,
          points: aiGeneratedChallenge.xp,
          is_active: true,
          is_team_challenge: true,
          created_by_user_id: user.id,
          image_url: aiGeneratedChallenge.image_url || 'https://via.placeholder.com/400',
        })
        .select()
        .single();

      if (createError) throw createError;

      const challengeId = customChallenge.id;
      const teamId = crypto.randomUUID();
      
      // Create user_challenge for HOST first
      const { data: hostChallenge, error: challengeError } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          device_id: deviceId,
          admin_challenge_id: challengeId,
          team_id: teamId,
          status: 'active',
          current_steps: 0,
          started_at: new Date().toISOString(),
          last_resumed_at: new Date().toISOString()
        })
        .select('*, admin_challenge:admin_challenges(*)')
        .single();

      if (challengeError) throw challengeError;

      // Update team_members to mark them as invited to this challenge
      if (selectedFriends.size > 0) {
        // Invite selected friends (only UPDATE existing rows)
        const { error: updateError } = await supabase
          .from('team_members')
          .update({
            active_challenge_id: challengeId,
            challenge_role: 'member',
            challenge_status: 'invited',
            invited_to_challenge_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .in('member_id', Array.from(selectedFriends));

        if (updateError) {
          console.error('Failed to update team_members:', updateError);
          throw updateError;
        }

        console.log(`✅ Updated ${selectedFriends.size} team members with challenge invitation`);
      }

      // 🎯 FIX: Update activeUserChallenges array in store (add team challenge)
      const currentChallenges = useChallengeStore.getState().activeUserChallenges;
      const updatedChallenges = [...currentChallenges, hostChallenge as any];
      useChallengeStore.setState({ 
        activeUserChallenges: updatedChallenges,
        activeUserChallenge: hostChallenge as any // Also update legacy field
      });
      
      console.log('✅ [TeamChallengeModal] Added team challenge to store:', hostChallenge.admin_challenge?.title);

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to start team challenge:', error);
      analytics.trackError(error, { context: 'team_challenge_start' });
      alert(`Failed to start challenge: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#151A25] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              {step === 'select-challenge' ? 'Create Team Challenge' : 'Select Team Members'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {step === 'select-challenge' 
              ? 'Answer 2 questions about your team'
              : `Select friends to invite to: ${aiGeneratedChallenge?.title}`}
          </p>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[55vh]">
          {step === 'select-challenge' && (
            <div className="space-y-3">
              {/* 🎯 SIMPLIFIED: Clean AI Challenge Generator */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 to-pink-500/10 dark:from-orange-500/20 dark:to-pink-500/20 border-2 border-orange-500/30 dark:border-orange-500/40">
                {!aiGeneratedChallenge ? (
                  <>
                    {/* Question 1: Team Vibe */}
                    <div className="mb-4">
                      <p className="text-base text-gray-900 dark:text-white mb-3 font-bold">
                        What's your team energy?
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { vibe: 'competitive' as const, label: 'Race Mode', desc: 'Beat each other' },
                          { vibe: 'cooperative' as const, label: 'Together', desc: 'Team goal' },
                          { vibe: 'fun' as const, label: 'Just Vibes', desc: 'No pressure' }
                        ].map(({ vibe, label, desc }) => (
                          <button
                            key={vibe}
                            onClick={() => setTeamVibe(vibe)}
                            className={`p-4 rounded-xl text-center transition-all ${
                              teamVibe === vibe
                                ? 'bg-orange-500 scale-105 shadow-lg ring-2 ring-orange-400'
                                : 'bg-white/60 dark:bg-gray-800/60 hover:scale-105 hover:bg-white dark:hover:bg-gray-800'
                            }`}
                          >
                            <div className={`text-sm font-bold mb-1 ${
                              teamVibe === vibe
                                ? 'text-white'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {label}
                            </div>
                            <div className={`text-xs ${
                              teamVibe === vibe
                                ? 'text-white/80'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question 2: Team Size */}
                    <div className="mb-4">
                      <p className="text-base text-gray-900 dark:text-white mb-3 font-bold">
                        How big is the squad?
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { size: 'small' as const, label: 'Small', desc: '2-3 people' },
                          { size: 'medium' as const, label: 'Medium', desc: '3-4 people' },
                          { size: 'large' as const, label: 'Large', desc: '5-6 people' }
                        ].map(({ size, label, desc }) => (
                          <button
                            key={size}
                            onClick={() => setTeamSize(size)}
                            className={`p-4 rounded-xl text-center transition-all ${
                              teamSize === size
                                ? 'bg-orange-500 scale-105 shadow-lg ring-2 ring-orange-400'
                                : 'bg-white/60 dark:bg-gray-800/60 hover:scale-105 hover:bg-white dark:hover:bg-gray-800'
                            }`}
                          >
                            <div className={`text-sm font-bold mb-1 ${
                              teamSize === size
                                ? 'text-white'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {label}
                            </div>
                            <div className={`text-xs ${
                              teamSize === size
                                ? 'text-white/80'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Generate button */}
                    <button
                      onClick={handleGenerateAI}
                      disabled={aiLoading || loading}
                      className="w-full px-4 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-black text-base hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {aiLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating challenge...
                        </span>
                      ) : (
                        'Generate Challenge'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {/* AI Result */}
                    <div className="mb-3 p-4 rounded-xl bg-white/70 dark:bg-gray-800/70">
                      <h4 className="font-black text-gray-900 dark:text-white text-lg mb-2">
                        {aiGeneratedChallenge.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                        {aiGeneratedChallenge.description}
                      </p>
                      <div className="flex gap-3 text-xs font-bold text-orange-700 dark:text-orange-300">
                        <span>🎯 {aiGeneratedChallenge.steps.toLocaleString()} steps</span>
                        <span>•</span>
                        <span>⏱️ {aiGeneratedChallenge.time_hours}h</span>
                        <span>•</span>
                        <span>⭐ +{aiGeneratedChallenge.xp} XP</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAiGeneratedChallenge(null)}
                        className="flex-1 px-4 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-sm hover:scale-105 active:scale-95 transition-all"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={handleContinueToFriends}
                        disabled={loading}
                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg"
                      >
                        Select Friends →
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 'select-friends' && (
            <div className="space-y-3">
              {/* Selected Challenge Summary */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-orange-500/10 to-pink-500/10 dark:from-orange-500/20 dark:to-pink-500/20 border border-orange-500/20 dark:border-orange-500/30">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">{aiGeneratedChallenge?.emoji || '🎯'}</span>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white text-base">
                      {aiGeneratedChallenge?.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {aiGeneratedChallenge?.steps.toLocaleString()} steps
                    </p>
                  </div>
                </div>
              </div>

              {/* Friends List */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase px-1">
                  Select Friends ({selectedFriends.size} selected)
                </p>
                
                {teamMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No friends added yet</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Add friends in the Team tab to invite them
                    </p>
                  </div>
                ) : (
                  teamMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => toggleFriend(member.id)}
                      className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                        selectedFriends.has(member.id)
                          ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg scale-105'
                          : 'bg-gray-50 dark:bg-[#0B101B] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt={member.display_name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-sm">{member.display_name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      {/* Name */}
                      <span className="flex-1 text-left font-bold text-sm">
                        {member.display_name}
                      </span>

                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedFriends.has(member.id)
                          ? 'border-white bg-white/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedFriends.has(member.id) && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex gap-2.5">
            {step === 'select-friends' && (
              <>
                <button
                  onClick={() => setStep('select-challenge')}
                  disabled={loading}
                  className="px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                >
                  ← Back
                </button>
                
                <button
                  onClick={handleSendInvitations}
                  disabled={loading}
                  className={`flex-1 px-5 py-3 rounded-xl font-black text-sm text-white transition-all ${
                    loading
                      ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:scale-105 active:scale-95 shadow-xl'
                  }`}
                >
                  {loading 
                    ? 'Starting...' 
                    : selectedFriends.size === 0 
                      ? 'Start Challenge' 
                      : `Send ${selectedFriends.size} Invitation${selectedFriends.size !== 1 ? 's' : ''}`
                  }
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}