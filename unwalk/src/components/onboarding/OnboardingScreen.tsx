import { useState } from 'react';
import { motion } from 'framer-motion';
import { useChallengeStore } from '../../stores/useChallengeStore';

const slide = {
  // Subtle watermark-style background photo (known-working Unsplash endpoint)
  image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1400&q=80',
};

export function OnboardingScreen() {
  const setOnboardingComplete = useChallengeStore((s) => s.setOnboardingComplete);

  // kept for future auth flow, but not used on the simplified first screen
  void useState;

  const handleGetStarted = () => {
    // Start app as guest; user can sign in later from Profile.
    setOnboardingComplete(true);

    const userProfile = useChallengeStore.getState().userProfile;
    if (!userProfile || userProfile.is_guest) {
      console.log('🔄 [Onboarding] Guest user - reloading page for clean state...');
      setTimeout(() => window.location.reload(), 100);
    } else {
      useChallengeStore.setState({ currentScreen: 'whoToChallenge' });
    }
  };

  return (
    <div className="h-[100dvh] bg-[#0B101B] flex flex-col relative overflow-hidden pt-safe">
      {/* Fullscreen hero image */}
      <div className="absolute inset-0">
        <motion.img
          src={slide.image}
          alt="MOVEE"
          className="w-full h-full object-cover opacity-[0.34]"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.7 }}
        />
        {/* Dark overlays for readability */}
        <div className="absolute inset-0 bg-[#0B101B]/52" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B101B] via-[#0B101B]/45 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-[100dvh] px-6">
        {/* Top brand */}
        <div className="pt-8">
          <div className="text-white/80 text-xs font-bold tracking-[0.25em]">MOVEE</div>
        </div>

        {/* Middle headline */}
        <div className="flex-1 flex items-center">
          <div className="w-full">
            <div className="text-white text-4xl font-black leading-tight drop-shadow-2xl">
              Walk more.
              <br />
              Unlock more.
            </div>

            {/* CTA directly under hero */}
            <div className="mt-7 w-full max-w-sm">
              <motion.button
                type="button"
                onClick={handleGetStarted}
                className="w-full rounded-2xl bg-white/95 hover:bg-white text-[#0B101B] py-3.5 font-extrabold text-base shadow-2xl shadow-black/40 border border-white/10 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                Get started
              </motion.button>

              {/* Helper text - moved here, closer to button */}
              <div className="mt-6 text-white/55 text-sm max-w-md">
                Start as a guest. Sign in anytime to sync your progress and unlock team features.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="pb-10" />
      </div>
    </div>
  );
}
