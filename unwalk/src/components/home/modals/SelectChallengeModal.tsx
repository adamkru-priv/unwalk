import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useChallengeStore } from '../../../stores/useChallengeStore';

interface TeamMemberOption {
  id: string;
  display_name: string;
  avatar_url?: string;
}

interface SelectChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'solo' | 'team';
}

type Step = 'select-challenge' | 'select-friends';

// 🎯 Presets for Solo and Team challenges
const SOLO_PRESETS = [
  { level: 'Easy', steps: 5000, icon: '🚶', color: 'from-green-500 to-emerald-500', time: 24, xp: 50 },      // 3K-7K range → 5K middle
  { level: 'Advanced', steps: 10000, icon: '🏃', color: 'from-blue-500 to-cyan-500', time: 48, xp: 200 },    // 7.5K-12.5K range → 10K middle
  { level: 'Expert+', steps: 20000, icon: '⚡', color: 'from-purple-500 to-pink-500', time: 72, xp: 400 }    // 13K+ → 20K
];

const TEAM_PRESETS = [
  { level: 'Easy', steps: 50000, icon: '🚶', color: 'from-green-500 to-emerald-500', time: 48, xp: 500 },
  { level: 'Advanced', steps: 100000, icon: '🏃', color: 'from-blue-500 to-cyan-500', time: 72, xp: 1000 },
  { level: 'Expert+', steps: 250000, icon: '⚡', color: 'from-purple-500 to-pink-500', time: 120, xp: 2500 }
];

export function SelectChallengeModal({ isOpen, onClose, onSuccess, mode }: SelectChallengeModalProps) {
  const [step, setStep] = useState<Step>('select-challenge');
  const [selectedChallenge, setSelectedChallenge] = useState<{ steps: number; level: string; customId?: string } | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);

  const presets = mode === 'solo' ? SOLO_PRESETS : TEAM_PRESETS;

  useEffect(() => {
    if (isOpen && mode === 'team') {
      loadTeamMembers();
    }
  }, [isOpen, mode]);

  const loadTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('team_members')
        .select('member_id, member:users!member_id(id, display_name, avatar_url)')
        .eq('user_id', user.id)
        .neq('member_id', user.id);

      if (error) throw error;

      const members = (data || [])
        .filter((m: any) => m.member)
        .map((m: any) => ({
          id: m.member.id,
          display_name: m.member.display_name || 'Unknown',
          avatar_url: m.member.avatar_url
        }));

      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

  const handlePresetSelect = (preset: typeof SOLO_PRESETS[0]) => {
    setSelectedChallenge({ steps: preset.steps, level: preset.level });
    
    if (mode === 'solo') {
      handleStartChallenge(preset.steps, preset.level, preset.time, preset.xp);
    } else {
      setStep('select-friends');
    }
  };

  const handleStartChallenge = async (steps: number, level: string, timeHours: number, xp: number) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { getDeviceId } = await import('../../../lib/deviceId');
      const deviceId = getDeviceId();

      // Map level to difficulty
      const difficultyMap: { [key: string]: 'easy' | 'medium' | 'hard' } = {
        'Easy': 'easy',
        'Advanced': 'medium',
        'Expert+': 'hard'
      };

      // Create custom challenge
      const { data: customChallenge, error: createError } = await supabase
        .from('admin_challenges')
        .insert({
          title: `${level} Challenge`,
          description: `Complete ${steps.toLocaleString()} steps`,
          category: 'distance',
          difficulty: difficultyMap[level] || 'medium',
          goal_steps: steps,
          time_limit_hours: timeHours,
          points: xp,
          is_active: true,
          is_team_challenge: mode === 'team',
          created_by_user_id: user.id,
          image_url: 'https://via.placeholder.com/400', // Placeholder image
        })
        .select()
        .single();

      if (createError) throw createError;

      // Start challenge
      const { data: userChallenge, error: challengeError } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          device_id: deviceId,
          admin_challenge_id: customChallenge.id,
          status: 'active',
          current_steps: 0,
          started_at: new Date().toISOString(),
          last_resumed_at: new Date().toISOString()
        })
        .select('*, admin_challenge:admin_challenges(*)')
        .single();

      if (challengeError) throw challengeError;

      setActiveChallenge(userChallenge as any);

      alert(`✅ ${level} Challenge started!`);
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to start challenge:', error);
      alert(`❌ Failed to start challenge: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
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

      const { getDeviceId } = await import('../../../lib/deviceId');
      const deviceId = getDeviceId();

      let challengeId = selectedChallenge.customId;

      // If no custom ID, create new challenge
      if (!challengeId) {
        const preset = presets.find(p => p.level === selectedChallenge.level);
        
        // Map level to difficulty
        const difficultyMap: { [key: string]: 'easy' | 'medium' | 'hard' } = {
          'Easy': 'easy',
          'Advanced': 'medium',
          'Expert+': 'hard'
        };
        
        const { data: customChallenge, error: createError } = await supabase
          .from('admin_challenges')
          .insert({
            title: `${selectedChallenge.level} Challenge`,
            description: `Complete ${selectedChallenge.steps.toLocaleString()} steps`,
            category: 'distance',
            difficulty: difficultyMap[selectedChallenge.level] || 'medium',
            goal_steps: selectedChallenge.steps,
            time_limit_hours: preset?.time || 72,
            points: preset?.xp || Math.floor(selectedChallenge.steps / 100),
            is_active: true,
            is_team_challenge: true,
            created_by_user_id: user.id,
            image_url: 'https://via.placeholder.com/400', // Placeholder image
          })
          .select()
          .single();

        if (createError) throw createError;
        challengeId = customChallenge.id;
      }

      // Create user_challenge
      const { error: challengeError } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          device_id: deviceId,
          admin_challenge_id: challengeId,
          status: 'active',
          current_steps: 0,
          started_at: new Date().toISOString(),
          last_resumed_at: new Date().toISOString()
        });

      if (challengeError) throw challengeError;

      // Send invitations if friends selected
      if (selectedFriends.size > 0) {
        const invitations = Array.from(selectedFriends).map(memberId => ({
          invited_by: user.id,
          invited_user: memberId,
          challenge_id: challengeId,
          status: 'pending'
        }));

        const { error: inviteError } = await supabase
          .from('team_challenge_invitations')
          .upsert(invitations, {
            onConflict: 'invited_user,challenge_id,invited_by',
            ignoreDuplicates: false
          });

        if (inviteError) throw inviteError;

        const friendCount = selectedFriends.size;
        alert(`✅ Sent ${friendCount} invitation${friendCount > 1 ? 's' : ''}!`);
      } else {
        alert('✅ Team Challenge started! You can invite friends later.');
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to start challenge:', error);
      alert(`❌ Failed to start challenge: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomChallengeClick = () => {
    handleClose();
    setCurrentScreen('customChallenge'); // 🎯 FIX: Open Custom Challenge Creator instead of library
  };

  const handleClose = () => {
    setStep('select-challenge');
    setSelectedChallenge(null);
    setSelectedFriends(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#151A25] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              {step === 'select-challenge' 
                ? mode === 'solo' 
                  ? 'Select Solo Challenge' 
                  : '1. Select Challenge'
                : '2. Choose Friends'}
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
              ? mode === 'solo'
                ? 'Pick your difficulty level or choose a custom challenge'
                : 'Pick difficulty level and invite friends'
              : `Challenge: ${selectedChallenge?.level}`}
          </p>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[55vh]">
          {step === 'select-challenge' && (
            <div className="space-y-3">
              {/* Difficulty Presets */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                  Choose Difficulty
                </h3>
                {presets.map((preset) => (
                  <button
                    key={preset.level}
                    onClick={() => handlePresetSelect(preset)}
                    disabled={loading}
                    className="w-full text-left p-4 rounded-2xl bg-gradient-to-r border-2 border-transparent hover:border-white/20 transition-all disabled:opacity-50"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${preset.color.split(' ')[1]} 0%, ${preset.color.split(' ')[2]} 100%)`
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-4xl">{preset.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-black text-white text-lg mb-0.5">
                          {preset.level}
                        </h3>
                        <p className="text-white/90 text-sm mb-2">
                          {preset.steps.toLocaleString()} steps • {preset.time}h deadline
                        </p>
                        <div className="flex items-center gap-2.5 text-xs text-white/80 font-semibold">
                          <span>📏 {(preset.steps / 1250).toFixed(1)} km</span>
                          <span>•</span>
                          <span>⭐ +{preset.xp} XP</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Challenge Button */}
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={handleCustomChallengeClick}
                  className="w-full text-left p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 hover:border-amber-500/50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-4xl">✨</div>
                    <div className="flex-1">
                      <h3 className="font-black text-gray-900 dark:text-white text-lg mb-0.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        Custom Challenge
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        Create or select your own custom challenges
                      </p>
                      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                        <span>🎨 Design</span>
                        <span>•</span>
                        <span>📸 Photos</span>
                        <span>•</span>
                        <span>⚡ Control</span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-amber-500 dark:text-amber-400 group-hover:translate-x-1 transition-transform flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 'select-friends' && mode === 'team' && (
            <div className="space-y-3">
              {/* Selected Challenge Summary */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">{presets.find(p => p.level === selectedChallenge?.level)?.icon || '🎯'}</span>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white text-base">
                      {selectedChallenge?.level}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedChallenge?.steps.toLocaleString()} steps
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
                          : 'bg-gray-50 dark:bg-[#0B101B] hover:bg-gray-100 dark:hover:bg-gray-800'
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
            {step === 'select-friends' && mode === 'team' && (
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