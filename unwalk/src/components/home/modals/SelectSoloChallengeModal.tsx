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
          time_limit_hours: aiGeneratedChallenge.time_hours,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#151A25] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              Select Solo Challenge
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Answer 2 questions for personalized challenge
          </p>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[55vh]">
          <div className="space-y-3">
            {/* 🎯 SIMPLIFIED: Clean AI Challenge Generator */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border-2 border-purple-500/30 dark:border-purple-500/40">
              {!aiGeneratedChallenge ? (
                <>
                  {/* Question 1: Activity Intensity */}
                  <div className="mb-4">
                    <p className="text-base text-gray-900 dark:text-white mb-3 font-bold">
                      What's your vibe today?
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { mood: 'push' as const, label: 'Sprint Mode', desc: 'Go hard' },
                        { mood: 'active' as const, label: 'Steady Pace', desc: 'Keep moving' },
                        { mood: 'light' as const, label: 'Easy Flow', desc: 'Take it slow' }
                      ].map(({ mood, label, desc }) => (
                        <button
                          key={mood}
                          onClick={() => setSelectedMood(mood)}
                          className={`p-4 rounded-xl text-center transition-all ${
                            selectedMood === mood
                              ? 'bg-purple-500 scale-105 shadow-lg ring-2 ring-purple-400'
                              : 'bg-white/60 dark:bg-gray-800/60 hover:scale-105 hover:bg-white dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className={`text-sm font-bold mb-1 ${
                            selectedMood === mood
                              ? 'text-white'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {label}
                          </div>
                          <div className={`text-xs ${
                            selectedMood === mood
                              ? 'text-white/80'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question 2: Time Available */}
                  <div className="mb-4">
                    <p className="text-base text-gray-900 dark:text-white mb-3 font-bold">
                      How much time do you have?
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { time: 'short' as const, label: 'Quick', desc: '~30min' },
                        { time: 'medium' as const, label: 'Normal', desc: '~1-2h' },
                        { time: 'long' as const, label: 'Long', desc: '3h+' }
                      ].map(({ time, label, desc }) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`p-4 rounded-xl text-center transition-all ${
                            selectedTime === time
                              ? 'bg-purple-500 scale-105 shadow-lg ring-2 ring-purple-400'
                              : 'bg-white/60 dark:bg-gray-800/60 hover:scale-105 hover:bg-white dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className={`text-sm font-bold mb-1 ${
                            selectedTime === time
                              ? 'text-white'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {label}
                          </div>
                          <div className={`text-xs ${
                            selectedTime === time
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
                    className="w-full px-4 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-base hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
                    <div className="flex gap-3 text-xs font-bold text-purple-700 dark:text-purple-300">
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
                      onClick={handleStartChallenge}
                      disabled={loading}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg"
                    >
                      Start Challenge →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}