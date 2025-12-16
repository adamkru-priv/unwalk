import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { BottomNavigation } from '../common/BottomNavigation';
import { AppHeader } from '../common/AppHeader';
import { BrowseChallenges } from './BrowseChallenges';
import { CustomChallenge } from './CustomChallenge';

type ExploreMode = 'menu' | 'browse' | 'custom';

export function ChallengeLibrary() {
  const [mode, setMode] = useState<ExploreMode>('menu'); // Start with menu view
  const exploreResetTrigger = useChallengeStore((s) => s.exploreResetTrigger);
  const userProfile = useChallengeStore((s) => s.userProfile); // ✅ Read from store
  const isGuest = userProfile?.is_guest ?? false;

  // Reset to menu whenever exploreResetTrigger changes
  useEffect(() => {
    if (exploreResetTrigger > 0) {
      setMode('menu'); // Reset to menu, not browse
    }
  }, [exploreResetTrigger]);

  const handleCustomClick = () => {
    if (isGuest) {
      alert('Sign up to create custom challenges!\n\nCustom challenges are available for registered users.');
      return;
    }
    setMode('custom');
  };

  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-20 font-sans">
      <AppHeader />

      <main className="px-5 py-6 max-w-md mx-auto">
        {/* MENU MODE - 2 Cards */}
        {mode === 'menu' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Hero Section */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Explore Challenges</h1>
              <p className="text-white/60 text-sm">
                Choose how you want to start your walking adventure
              </p>
            </div>

            {/* Card 1: Browse Challenges */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setMode('browse')}
              className="relative w-full bg-gradient-to-br from-[#1A1F2E] to-[#151A25] border-2 border-white/10 rounded-3xl p-8 text-left transition-all hover:border-blue-500/30 group overflow-hidden"
            >
              {/* Accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
              
              {/* Subtle gradient accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="mb-6">
                  <div className="text-xs font-bold text-blue-400 mb-3 uppercase tracking-widest">System Challenges</div>
                  <h3 className="text-4xl font-black text-white mb-3 leading-none tracking-tight uppercase">
                    Browse<br />Challenges
                  </h3>
                  
                  <p className="text-white/60 text-sm">
                    Discover curated adventures + Today's Daily
                  </p>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-white/10 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                    60+ Challenges
                  </span>
                  <span className="bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold px-3 py-1.5 rounded-lg">
                    Daily Pick
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 text-white font-medium text-sm group-hover:gap-3 transition-all">
                  <span>Start Browsing</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </motion.button>

            {/* Card 2: Create Custom */}
            <motion.button
              whileHover={{ scale: isGuest ? 1 : 1.01 }}
              whileTap={{ scale: isGuest ? 1 : 0.99 }}
              onClick={handleCustomClick}
              disabled={isGuest}
              className={`relative w-full bg-gradient-to-br from-[#1A1F2E] to-[#151A25] border-2 rounded-3xl p-8 text-left transition-all overflow-hidden ${
                isGuest 
                  ? 'border-white/5 opacity-40 cursor-not-allowed' 
                  : 'border-white/10 hover:border-amber-500/30 group'
              }`}
            >
              {/* Small badge for guests - top right corner */}
              {isGuest && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-gray-900/95 backdrop-blur-sm border border-yellow-500/50 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2-2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-yellow-400 font-bold text-xs">Sign up required</span>
                  </div>
                </div>
              )}

              {/* Accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
              
              {/* Subtle gradient accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="mb-6">
                  <div className="text-xs font-bold text-amber-400 mb-3 uppercase tracking-widest">Your Challenge</div>
                  <h3 className="text-4xl font-black text-white mb-3 leading-none tracking-tight uppercase">
                    Create<br />Custom
                  </h3>
                  
                  <p className="text-white/60 text-sm">
                    Design your own personalized challenge
                  </p>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-white/10 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                    Unlimited
                  </span>
                  <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-lg">
                    Your Rules
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 text-white font-medium text-sm group-hover:gap-3 transition-all">
                  <span>Create Now</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* BROWSE MODE */}
        {mode === 'browse' && (
          <BrowseChallenges />
        )}

        {/* CUSTOM MODE */}
        {mode === 'custom' && !isGuest && (
          <CustomChallenge />
        )}
      </main>

      <BottomNavigation currentScreen="library" />
    </div>
  );
}
