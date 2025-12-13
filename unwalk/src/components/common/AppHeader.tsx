import { useChallengeStore } from '../../stores/useChallengeStore';

interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  subtitle?: string;
  onProfileClick?: () => void;
}

export function AppHeader({ title, showBackButton = false, subtitle }: AppHeaderProps) {
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const activeUserChallenge = useChallengeStore((s) => s.activeUserChallenge);

  return (
    <header className="bg-[#0B101B]/80 backdrop-blur-md sticky top-0 z-20 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Back button or Logo */}
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={() => setCurrentScreen('home')}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Back to home"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-blue-400 inline-block" style={{ transform: 'scaleX(-1)' }}>🚶</span>
              MOVEE
              {title && <span className="text-white/60 text-lg">• {title}</span>}
            </h1>
            {subtitle && (
              <p className="text-white/70 text-sm mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right side - Stats, Active Challenge & Profile */}
        <div className="flex items-center gap-3">
          {/* Stats Button */}
          <button
            onClick={() => setCurrentScreen('stats')}
            className="relative text-white/70 hover:text-white transition-colors"
            title="Statistics"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>

          {/* Active Challenge Indicator - Fire/Achievement icon */}
          {activeUserChallenge && (
            <button
              onClick={() => setCurrentScreen('dashboard')}
              className="relative text-white/70 hover:text-white transition-colors group"
              title="Active challenge in progress"
            >
              {/* Trophy/Achievement icon */}
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              {/* Pulsing dot indicator */}
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            </button>
          )}

          {/* Settings Button - Navigate to profile/settings screen */}
          <button
            onClick={() => setCurrentScreen('profile')}
            className="relative text-white/70 hover:text-white transition-colors"
            title="Settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
