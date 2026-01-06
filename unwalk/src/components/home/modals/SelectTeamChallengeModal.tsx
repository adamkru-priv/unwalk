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

// Helper function to format time hours to readable format
function formatTimeLimit(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  return `${wholeHours}h ${minutes}min`;
}

export function SelectTeamChallengeModal({ isOpen, onClose, onSuccess }: SelectTeamChallengeModalProps) {
  const [step, setStep] = useState<Step>('select-challenge');
  const [loading, setLoading] = useState(false);
  const [showScoringRules, setShowScoringRules] = useState(false); // 🎯 NEW: Team scoring rules popup
  
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
          time_limit_hours: Math.ceil(aiGeneratedChallenge.time_hours), // 🎯 FIX: Round up to integer (0.75 → 1)
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
    <>
      {/* 🎯 NEW: Team Challenge Scoring Rules Popup */}
      {showScoringRules && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowScoringRules(false)}
        >
          <div 
            className="bg-white dark:bg-[#151A25] rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-white">👥 Team Scoring Rules</h3>
                <button
                  onClick={() => setShowScoringRules(false)}
                  className="text-white/80 hover:text-white text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Intro */}
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                <span className="font-bold text-gray-900 dark:text-white">Total XP Pool</span> is shared among all contributors. Your XP = (your steps / team total) × pool. Minimum 20,000 team steps required.
              </p>

              {/* Race Mode */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-red-200 dark:border-red-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🏆</span>
                  <h4 className="font-black text-gray-900 dark:text-white">Race Mode</h4>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Small (2-3)</span>
                    <span className="font-bold text-gray-900 dark:text-white">400 XP pool</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Medium (3-4)</span>
                    <span className="font-bold text-gray-900 dark:text-white">560 XP pool</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Large (5-6)</span>
                    <span className="font-bold text-gray-900 dark:text-white">700 XP pool</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                  Steps: 20k-60k • Competitive, high energy
                </p>
              </div>

              {/* Together */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🤝</span>
                  <h4 className="font-black text-gray-900 dark:text-white">Together</h4>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Small (2-3)</span>
                    <span className="font-bold text-gray-900 dark:text-white">300 XP pool</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Medium (3-4)</span>
                    <span className="font-bold text-gray-900 dark:text-white">420 XP pool</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Large (5-6)</span>
                    <span className="font-bold text-gray-900 dark:text-white">540 XP pool</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                  Steps: 20k-45k • Collaborative, shared goal
                </p>
              </div>

              {/* Just Vibes */}
              <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl p-4 border border-green-200 dark:border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎉</span>
                  <h4 className="font-black text-gray-900 dark:text-white">Just Vibes</h4>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Small (2-3)</span>
                    <span className="font-bold text-gray-900 dark:text-white">200 XP pool</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Medium (3-4)</span>
                    <span className="font-bold text-gray-900 dark:text-white">280 XP pool</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Large (5-6)</span>
                    <span className="font-bold text-gray-900 dark:text-white">360 XP pool</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                  Steps: 20k-36k • No pressure, social fun
                </p>
              </div>

              {/* Bonus XP */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">✨</span>
                  <h4 className="font-black text-gray-900 dark:text-white">Bonus XP</h4>
                </div>
                <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <div>• <span className="font-semibold">+50 XP</span> - All contribute 15%+</div>
                  <div>• <span className="font-semibold">+40 XP</span> - Finish 24h early</div>
                  <div>• <span className="font-semibold">+60 XP</span> - First team challenge</div>
                  <div>• <span className="font-semibold">+30 XP</span> - Daily streaks for all</div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                  Bonus added to pool before distribution
                </p>
              </div>

              {/* Distribution Formula */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📊</span>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">Fair Distribution</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Your XP = Total Pool × (Your Steps / Team Total)<br/>
                  Min: 10 XP if contributing<br/>
                  Max: 60% of pool per person
                </p>
              </div>

              {/* Footer note */}
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                🎯 Every step counts • No penalties for low contribution
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-gradient-to-b from-[#1a1f2e] to-[#151a25] rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-blue-500/20">
          {/* Header with ? icon */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-bold leading-none w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
            
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white">
                {step === 'select-challenge' ? 'Create Team Challenge' : 'Select Team Members'}
              </h2>
              {step === 'select-challenge' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowScoringRules(true);
                  }}
                  className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition-colors shadow-md"
                  title="View team scoring rules"
                >
                  ?
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {step === 'select-challenge' && (
              <>
                {!aiGeneratedChallenge ? (
                  <div className="space-y-6">
                    {/* Question 1: Team Vibe */}
                    <div>
                      <p className="text-lg text-white mb-4 font-bold">
                        What's your team energy?
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { vibe: 'competitive' as const, emoji: '🏆', label: 'Race Mode', desc: 'Beat each other' },
                          { vibe: 'cooperative' as const, emoji: '🤝', label: 'Together', desc: 'Team goal' },
                          { vibe: 'fun' as const, emoji: '🎉', label: 'Just Vibes', desc: 'No pressure' }
                        ].map(({ vibe, emoji, label, desc }) => (
                          <button
                            key={vibe}
                            onClick={() => setTeamVibe(vibe)}
                            className={`p-4 rounded-2xl text-center transition-all ${
                              teamVibe === vibe
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-500 scale-[1.05] shadow-xl ring-2 ring-blue-400'
                                : 'bg-white/5 hover:bg-white/10 hover:scale-[1.02] border border-white/10'
                            }`}
                          >
                            <div className="text-3xl mb-2">{emoji}</div>
                            <div className={`text-sm font-bold mb-1 ${
                              teamVibe === vibe ? 'text-white' : 'text-white/90'
                            }`}>
                              {label}
                            </div>
                            <div className={`text-xs ${
                              teamVibe === vibe ? 'text-white/80' : 'text-white/50'
                            }`}>
                              {desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question 2: Team Size */}
                    <div>
                      <p className="text-lg text-white mb-4 font-bold">
                        How big is the squad?
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { size: 'small' as const, emoji: '👥', label: 'Small', desc: '2-3 people' },
                          { size: 'medium' as const, emoji: '👨‍👩‍👦', label: 'Medium', desc: '3-4 people' },
                          { size: 'large' as const, emoji: '👨‍👩‍👧‍👦', label: 'Large', desc: '5-6 people' }
                        ].map(({ size, emoji, label, desc }) => (
                          <button
                            key={size}
                            onClick={() => setTeamSize(size)}
                            className={`p-4 rounded-2xl text-center transition-all ${
                              teamSize === size
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-500 scale-[1.05] shadow-xl ring-2 ring-blue-400'
                                : 'bg-white/5 hover:bg-white/10 hover:scale-[1.02] border border-white/10'
                            }`}
                          >
                            <div className="text-3xl mb-2">{emoji}</div>
                            <div className={`text-sm font-bold mb-1 ${
                              teamSize === size ? 'text-white' : 'text-white/90'
                            }`}>
                              {label}
                            </div>
                            <div className={`text-xs ${
                              teamSize === size ? 'text-white/80' : 'text-white/50'
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
                      className="w-full px-6 py-5 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white font-black text-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl"
                    >
                      {aiLoading ? (
                        <span className="flex items-center justify-center gap-3">
                          <span className="inline-block w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating team challenge...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          ✨ Generate Challenge
                        </span>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* AI Result Card */}
                    <div className="rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-2 border-blue-500/30 p-6">
                      <h4 className="font-black text-white text-xl mb-3">
                        {aiGeneratedChallenge.title}
                      </h4>
                      <p className="text-sm text-white/70 mb-4 leading-relaxed">
                        {aiGeneratedChallenge.description}
                      </p>
                      
                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                          <div className="text-3xl mb-1">👣</div>
                          <div className="text-lg font-black text-white">
                            {aiGeneratedChallenge.steps.toLocaleString()}
                          </div>
                          <div className="text-xs text-white/50">steps</div>
                        </div>
                        
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                          <div className="text-3xl mb-1">⏱️</div>
                          <div className="text-lg font-black text-white">
                            {formatTimeLimit(aiGeneratedChallenge.time_hours)}
                          </div>
                          <div className="text-xs text-white/50">time limit</div>
                        </div>
                        
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                          <div className="text-3xl mb-1">⭐</div>
                          <div className="text-lg font-black text-white">
                            +{aiGeneratedChallenge.xp}
                          </div>
                          <div className="text-xs text-white/50">XP reward</div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 items-center">
                      <button
                        onClick={() => setAiGeneratedChallenge(null)}
                        className="px-4 py-3 text-white/60 hover:text-white text-sm font-medium transition-colors"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={handleContinueToFriends}
                        disabled={loading}
                        className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black text-base hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-xl"
                      >
                        👥 Select Friends
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 'select-friends' && (
              <div className="space-y-4">
                {/* Selected Challenge Summary */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-2 border-blue-500/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-2xl">🎯</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-white text-base mb-1">
                        {aiGeneratedChallenge?.title}
                      </h3>
                      <div className="flex gap-2 text-xs text-white/60">
                        <span>👣 {aiGeneratedChallenge?.steps.toLocaleString()}</span>
                        <span>•</span>
                        <span>⏱️ {formatTimeLimit(aiGeneratedChallenge?.time_hours || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Friends List */}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-white/80 uppercase tracking-wide">
                    Select Friends {selectedFriends.size > 0 && `(${selectedFriends.size} selected)`}
                  </p>
                  
                  {teamMembers.length === 0 ? (
                    <div className="text-center py-8 px-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="text-4xl mb-3">👥</div>
                      <p className="text-sm text-white/70 mb-2 font-semibold">No friends added yet</p>
                      <p className="text-xs text-white/50">
                        Add friends in the Team tab to invite them
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {teamMembers.map((member) => (
                        <button
                          key={member.id}
                          onClick={() => toggleFriend(member.id)}
                          className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                            selectedFriends.has(member.id)
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-xl scale-[1.02]'
                              : 'bg-white/5 hover:bg-white/10 border border-white/10'
                          }`}
                        >
                          {/* Avatar */}
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt={member.display_name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="text-base">{member.display_name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>

                          {/* Name */}
                          <span className={`flex-1 text-left font-bold text-base ${
                            selectedFriends.has(member.id) ? 'text-white' : 'text-white/90'
                          }`}>
                            {member.display_name}
                          </span>

                          {/* Checkbox */}
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedFriends.has(member.id)
                              ? 'border-white bg-white/20'
                              : 'border-white/30'
                          }`}>
                            {selectedFriends.has(member.id) && (
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {step === 'select-friends' && (
            <div className="p-6 border-t border-white/10">
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('select-challenge')}
                  disabled={loading}
                  className="px-5 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-base hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 border border-white/20"
                >
                  ← Back
                </button>
                
                <button
                  onClick={handleSendInvitations}
                  disabled={loading}
                  className="flex-1 px-5 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black text-base hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-xl"
                >
                  {loading 
                    ? 'Starting...' 
                    : selectedFriends.size === 0 
                      ? '🚀 Start Solo' 
                      : `🚀 Invite ${selectedFriends.size} Friend${selectedFriends.size !== 1 ? 's' : ''}`
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
