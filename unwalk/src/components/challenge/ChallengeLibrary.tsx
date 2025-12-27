import { useState, useEffect } from 'react';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { BottomNavigation } from '../common/BottomNavigation';
import { AppHeader } from '../common/AppHeader';
import { BrowseChallenges } from './BrowseChallenges';
import { CustomChallenge } from './CustomChallenge';

type ExploreMode = 'menu' | 'browse' | 'custom';

export function ChallengeLibrary() {
  const [mode, setMode] = useState<ExploreMode>('browse');
  const userProfile = useChallengeStore((s) => s.userProfile);
  const exploreResetTrigger = useChallengeStore((s) => s.exploreResetTrigger); // ✅ Listen to reset trigger
  const isGuest = userProfile?.is_guest ?? false;

  // Reset to browse mode when user clicks Challenges in bottom nav
  useEffect(() => {
    setMode('browse');
  }, [exploreResetTrigger]); // ✅ Reset whenever exploreResetTrigger changes

  return (
    <div className="min-h-screen bg-[#0B101B] text-white pb-20 font-sans">
      <AppHeader />

      <main className="px-5 py-6 max-w-md mx-auto">
        {/* BROWSE MODE - Show difficulty selection immediately */}
        {mode === 'browse' && (
          <BrowseChallenges onCustomClick={() => setMode('custom')} />
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
