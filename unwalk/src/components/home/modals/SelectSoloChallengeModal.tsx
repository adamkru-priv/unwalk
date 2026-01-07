import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useChallengeStore } from '../../../stores/useChallengeStore';
import { analytics, AnalyticsEvents } from '../../../lib/analytics';
import { useAIChallenge } from '../../../hooks/useAI';

interface SelectSoloChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SelectSoloChallengeModal({ isOpen, onClose, onSuccess }: SelectSoloChallengeModalProps) {
  const [loading, setLoading] = useState(false);
  const [showScoringRules, setShowScoringRules] = useState(false); // 🎯 NEW: Scoring rules popup
  
  // 🎯 AI state for SOLO
  const [selectedMood, setSelectedMood] = useState<'push' | 'active' | 'light' | 'recovery'>('active');
  const [selectedTime, setSelectedTime] = useState<'short' | 'medium' | 'long'>('medium');
  const [aiGeneratedChallenge, setAiGeneratedChallenge] = useState<any>(null);
  
  const { generateChallenge, loading: aiLoading } = useAIChallenge();
  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);
  const userProfile = useChallengeStore((s) => s.userProfile);

  const handleClose = () => {
    setAiGeneratedChallenge(null);
    setSelectedMood('active');
    setSelectedTime('medium');
    onClose();
  };

  // 🎯 Generate AI challenge for SOLO
  const handleGenerateAI = async () => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const weather = 'sunny';
    const recentSteps = userProfile?.xp ? Math.floor(userProfile.xp / 10) : 8000;

    const result = await generateChallenge({
      mood: selectedMood,
      timeOfDay,
      weather,
      recentSteps,
      timeAvailable: selectedTime,
      isTeamChallenge: false
    });

    if (result) {
      setAiGeneratedChallenge(result);
      analytics.track(AnalyticsEvents.CHALLENGE_STARTED, {
        challenge_type: 'ai_generated_solo',
        mood: selectedMood,
        time_available: selectedTime,
        ai_difficulty: result.difficulty
      });
    }
  };

  // 🎯 Start AI-generated SOLO challenge
  const handleStartChallenge = async () => {
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
          is_team_challenge: false,
          created_by_user_id: user.id,
          image_url: aiGeneratedChallenge.image_url || 'https://via.placeholder.com/400',
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

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to start challenge:', error);
      analytics.trackError(error, { context: 'solo_challenge_start' });
      alert(`Failed to start challenge: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 🎯 NEW: Scoring Rules Popup */}
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
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-5 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-white">📊 Scoring Rules</h3>
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
                XP rewards are based on <span className="font-bold text-gray-900 dark:text-white">effort and time</span>, not just steps. Choose your vibe and earn points!
              </p>

              {/* Sprint Mode */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-red-200 dark:border-red-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🔥</span>
                  <h4 className="font-black text-gray-900 dark:text-white">Sprint Mode</h4>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Quick (30min)</span>
                    <span className="font-bold text-gray-900 dark:text-white">90 XP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Normal (1-2h)</span>
                    <span className="font-bold text-gray-900 dark:text-white">160 XP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Long (3h+)</span>
                    <span className="font-bold text-gray-900 dark:text-white">220 XP</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                  High intensity, ambitious goals
                </p>
              </div>

              {/* Steady Pace */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">⚡</span>
                  <h4 className="font-black text-gray-900 dark:text-white">Steady Pace</h4>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Quick (30min)</span>
                    <span className="font-bold text-gray-900 dark:text-white">60 XP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Normal (1-2h)</span>
                    <span className="font-bold text-gray-900 dark:text-white">100 XP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Long (3h+)</span>
                    <span className="font-bold text-gray-900 dark:text-white">150 XP</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                  Balanced consistency
                </p>
              </div>

              {/* Easy Flow */}
              <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl p-4 border border-green-200 dark:border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🌊</span>
                  <h4 className="font-black text-gray-900 dark:text-white">Easy Flow</h4>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Quick (30min)</span>
                    <span className="font-bold text-gray-900 dark:text-white">40 XP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Normal (1-2h)</span>
                    <span className="font-bold text-gray-900 dark:text-white">70 XP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Long (3h+)</span>
                    <span className="font-bold text-gray-900 dark:text-white">100 XP</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                  Gentle movement, no pressure
                </p>
              </div>

              {/* Bonus XP */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">✨</span>
                  <h4 className="font-black text-gray-900 dark:text-white">Bonus XP</h4>
                </div>
                <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <div>• <span className="font-semibold">+20 XP</span> - Complete before deadline</div>
                  <div>• <span className="font-semibold">+15 XP</span> - Maintain 3-day streak</div>
                  <div>• <span className="font-semibold">+25 XP</span> - First challenge of the day</div>
                  <div>• <span className="font-semibold">+10 XP</span> - Perfect pace (no long breaks)</div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                  Maximum one bonus per challenge
                </p>
              </div>

              {/* Footer note */}
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                🎯 Your daily goal: 10,000 steps
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-gradient-to-b from-[#1a1f2e] to-[#151a25] rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-indigo-500/20">
          {/* Header with ? icon */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-6 relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-bold leading-none w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
            
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-white">Select Solo Challenge</h2>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowScoringRules(true);
                }}
                className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition-colors shadow-md flex-shrink-0"
                title="View scoring rules"
              >
                ?
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {!aiGeneratedChallenge ? (
              <div className="space-y-6">
                {/* Question 1: Activity Intensity */}
                <div>
                  <p className="text-lg text-white mb-4 font-bold">
                    What's your vibe today?
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { mood: 'push' as const, emoji: '🔥', label: 'Sprint Mode', desc: 'Go hard' },
                      { mood: 'active' as const, emoji: '⚡', label: 'Steady Pace', desc: 'Keep moving' },
                      { mood: 'light' as const, emoji: '🌊', label: 'Easy Flow', desc: 'Take it slow' }
                    ].map(({ mood, emoji, label, desc }) => (
                      <button
                        key={mood}
                        onClick={() => setSelectedMood(mood)}
                        className={`p-4 rounded-2xl text-center transition-all ${
                          selectedMood === mood
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-500 scale-[1.05] shadow-xl ring-2 ring-indigo-400'
                            : 'bg-white/5 hover:bg-white/10 hover:scale-[1.02] border border-white/10'
                        }`}
                      >
                        <div className="text-3xl mb-2">{emoji}</div>
                        <div className={`text-sm font-bold mb-1 ${
                          selectedMood === mood ? 'text-white' : 'text-white/90'
                        }`}>
                          {label}
                        </div>
                        <div className={`text-xs ${
                          selectedMood === mood ? 'text-white/80' : 'text-white/50'
                        }`}>
                          {desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question 2: Time Available */}
                <div>
                  <p className="text-lg text-white mb-4 font-bold">
                    How much time do you have?
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { time: 'short' as const, emoji: '⚡', label: 'Quick', desc: '30min' },
                      { time: 'medium' as const, emoji: '⏱️', label: 'Normal', desc: '1-2h' },
                      { time: 'long' as const, emoji: '🏃', label: 'Long', desc: '3h+' }
                    ].map(({ time, emoji, label, desc }) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-4 rounded-2xl text-center transition-all ${
                          selectedTime === time
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-500 scale-[1.05] shadow-xl ring-2 ring-indigo-400'
                            : 'bg-white/5 hover:bg-white/10 hover:scale-[1.02] border border-white/10'
                        }`}
                      >
                        <div className="text-3xl mb-2">{emoji}</div>
                        <div className={`text-sm font-bold mb-1 ${
                          selectedTime === time ? 'text-white' : 'text-white/90'
                        }`}>
                          {label}
                        </div>
                        <div className={`text-xs ${
                          selectedTime === time ? 'text-white/80' : 'text-white/50'
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
                  className="w-full px-6 py-5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 text-white font-black text-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl"
                >
                  {aiLoading ? (
                    <span className="flex items-center justify-center gap-3">
                      <span className="inline-block w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating your challenge...
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
                <div className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-2 border-indigo-500/30 p-6">
                  <h4 className="font-black text-white text-xl mb-3">
                    {aiGeneratedChallenge.title}
                  </h4>
                  <p className="text-sm text-white/70 mb-4 leading-relaxed">
                    {aiGeneratedChallenge.description}
                  </p>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                      <div className="text-3xl mb-1">👟</div>
                      <div className="text-lg font-black text-white">
                        {aiGeneratedChallenge.steps.toLocaleString()}
                      </div>
                      <div className="text-xs text-white/50">steps</div>
                    </div>
                    
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                      <div className="text-3xl mb-1">⏱️</div>
                      <div className="text-lg font-black text-white">
                        Unlimited
                      </div>
                      <div className="text-xs text-white/50">time</div>
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
                    onClick={handleStartChallenge}
                    disabled={loading}
                    className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black text-base hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-xl"
                  >
                    {loading ? 'Starting...' : '🚀 Start Challenge'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}