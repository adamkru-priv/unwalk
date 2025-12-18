import { useState } from 'react';
import { motion } from 'framer-motion';
import { authService } from '../../lib/auth';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { supabase } from '../../lib/supabase';

type ChallengeTarget = 'self' | 'spouse' | 'child' | 'friend';

interface TargetOption {
  id: ChallengeTarget;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
}

const targetOptions: TargetOption[] = [
  {
    id: 'self',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    title: 'Myself',
    subtitle: 'Personal challenges',
    color: 'from-blue-600 to-blue-500'
  },
  {
    id: 'spouse',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: 'Partner',
    subtitle: 'Stronger together',
    color: 'from-pink-600 to-pink-500'
  },
  {
    id: 'child',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Child',
    subtitle: 'Make activity fun',
    color: 'from-green-600 to-green-500'
  },
  {
    id: 'friend',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Friend',
    subtitle: 'Stay motivated together',
    color: 'from-orange-600 to-orange-500'
  }
];

export const WhoToChallengeScreen = () => {
  const [selectedTarget, setSelectedTarget] = useState<ChallengeTarget | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);

  const handleTargetSelect = async (target: ChallengeTarget) => {
    setSelectedTarget(target);
    setIsLoading(true);

    try {
      const profile = await authService.getUserProfile();
      
      if (!profile) {
        console.error('No profile found');
        setIsLoading(false);
        return;
      }

      // Save onboarding target preference
      await supabase
        .from('users')
        .update({ onboarding_target: target })
        .eq('id', profile.id);

      // If user selected "self" - they can continue as guest
      if (target === 'self') {
        setCurrentScreen('challengeSelection');
      } else {
        // For other options, check if already authenticated
        if (!profile.is_guest && profile.email) {
          setCurrentScreen('team');
        } else {
          setCurrentScreen('auth');
        }
      }
    } catch (error) {
      console.error('Error saving target:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-gradient-to-b from-[#0B101B] to-[#151A25] flex flex-col overflow-hidden pt-safe">
      {/* Header */}
      <div className="px-6 pt-10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-black text-white mb-3 leading-tight">
            Who would you like
            <br />
            to challenge?
          </h1>
          <p className="text-white/60 text-lg">
            Choose your goal and start your journey
          </p>
        </motion.div>
      </div>

      {/* Target Options Grid */}
      <div className="flex-1 px-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] overflow-y-auto scrollbar-hide">
        <div className="grid grid-cols-1 gap-4">
          {targetOptions.map((option, index) => (
            <motion.button
              key={option.id}
              onClick={() => handleTargetSelect(option.id)}
              disabled={isLoading}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileTap={{ scale: 0.98 }}
              className={`
                relative overflow-hidden rounded-2xl p-6
                bg-white/5 backdrop-blur-sm border border-white/10
                transition-all duration-300
                ${selectedTarget === option.id ? 'ring-2 ring-white/30 shadow-xl' : ''}
                ${isLoading && selectedTarget !== option.id ? 'opacity-40' : 'hover:bg-white/10'}
                disabled:cursor-not-allowed
              `}
            >
              {/* Gradient Overlay on Hover/Selection */}
              <div className={`
                absolute inset-0 bg-gradient-to-r ${option.color} opacity-0
                transition-opacity duration-300
                ${selectedTarget === option.id ? 'opacity-10' : 'group-hover:opacity-5'}
              `} />
              
              {/* Content */}
              <div className="relative z-10 flex items-center gap-4">
                {/* Icon */}
                <div className={`
                  flex-shrink-0 w-16 h-16 rounded-2xl
                  bg-gradient-to-r ${option.color}
                  flex items-center justify-center
                  text-3xl shadow-lg
                `}>
                  {option.icon}
                </div>
                
                {/* Text */}
                <div className="flex-1 text-left">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {option.title}
                  </h3>
                  <p className="text-white/60 text-sm">
                    {option.subtitle}
                  </p>
                </div>

                {/* Loading or Check Icon */}
                {isLoading && selectedTarget === option.id ? (
                  <div className="flex-shrink-0 w-6 h-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white" />
                  </div>
                ) : selectedTarget === option.id ? (
                  <div className="flex-shrink-0 w-6 h-6">
                    <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-6 h-6">
                    <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};
