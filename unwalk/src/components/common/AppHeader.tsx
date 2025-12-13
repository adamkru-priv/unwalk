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
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-10">
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
              <span className="text-blue-400">🚶</span>
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

          {/* Active Challenge Indicator - Footsteps icon */}
          {activeUserChallenge && (
            <button
              onClick={() => setCurrentScreen('dashboard')}
              className="relative text-white/70 hover:text-white transition-colors"
              title="Active challenge in progress"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M8 4v16m8-16v16" />
              </svg>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            </button>
          )}

          {/* Profile Button - Navigate to profile screen */}
          <button
            onClick={() => setCurrentScreen('profile')}
            className="relative text-white/70 hover:text-white transition-colors"
            title="Profile"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
