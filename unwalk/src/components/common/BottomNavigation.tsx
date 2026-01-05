import { useChallengeStore } from '../../stores/useChallengeStore';

interface BottomNavigationProps {
  currentScreen: 'home' | 'library' | 'dashboard' | 'team' | 'leaderboard' | 'profile' | 'stats';
  onTeamClick?: () => void;
}

export function BottomNavigation({ currentScreen, onTeamClick }: BottomNavigationProps) {
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);

  const handleTeamClick = () => {
    if (onTeamClick) {
      onTeamClick(); // Allow parent to reset state
    } else {
      setCurrentScreen('team');
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3 z-20">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* My Steps (was Home) - with footsteps icon */}
        <button
          onClick={() => setCurrentScreen('home')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentScreen === 'home' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {/* 👣 Better footsteps icon - two detailed footprints */}
          <svg className="w-7 h-7" fill={currentScreen === 'home' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            {currentScreen === 'home' ? (
              // Filled version
              <g>
                {/* Left footprint */}
                <ellipse cx="7" cy="6" rx="1.5" ry="2" fill="currentColor" />
                <ellipse cx="7" cy="10.5" rx="2" ry="3" fill="currentColor" />
                <ellipse cx="5.5" cy="4.5" rx="0.8" ry="1" fill="currentColor" />
                <ellipse cx="6.2" cy="3.5" rx="0.7" ry="0.9" fill="currentColor" />
                <ellipse cx="7.5" cy="3" rx="0.7" ry="0.9" fill="currentColor" />
                <ellipse cx="8.8" cy="3.2" rx="0.7" ry="0.9" fill="currentColor" />
                
                {/* Right footprint (offset) */}
                <ellipse cx="16" cy="14" rx="1.5" ry="2" fill="currentColor" />
                <ellipse cx="16" cy="18.5" rx="2" ry="3" fill="currentColor" />
                <ellipse cx="14.5" cy="12.5" rx="0.8" ry="1" fill="currentColor" />
                <ellipse cx="15.2" cy="11.5" rx="0.7" ry="0.9" fill="currentColor" />
                <ellipse cx="16.5" cy="11" rx="0.7" ry="0.9" fill="currentColor" />
                <ellipse cx="17.8" cy="11.2" rx="0.7" ry="0.9" fill="currentColor" />
              </g>
            ) : (
              // Outline version
              <g>
                {/* Left footprint */}
                <ellipse cx="7" cy="6" rx="1.5" ry="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <ellipse cx="7" cy="10.5" rx="2" ry="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <ellipse cx="5.5" cy="4.5" rx="0.8" ry="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <ellipse cx="6.2" cy="3.5" rx="0.7" ry="0.9" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <ellipse cx="7.5" cy="3" rx="0.7" ry="0.9" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <ellipse cx="8.8" cy="3.2" rx="0.7" ry="0.9" stroke="currentColor" strokeWidth="1.2" fill="none" />
                
                {/* Right footprint (offset) */}
                <ellipse cx="16" cy="14" rx="1.5" ry="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <ellipse cx="16" cy="18.5" rx="2" ry="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <ellipse cx="14.5" cy="12.5" rx="0.8" ry="1" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <ellipse cx="15.2" cy="11.5" rx="0.7" ry="0.9" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <ellipse cx="16.5" cy="11" rx="0.7" ry="0.9" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <ellipse cx="17.8" cy="11.2" rx="0.7" ry="0.9" stroke="currentColor" strokeWidth="1.2" fill="none" />
              </g>
            )}
          </svg>
          <span className="text-xs font-medium">My Steps</span>
        </button>

        {/* My Stats (was Stats) */}
        <button
          onClick={() => setCurrentScreen('stats')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentScreen === 'stats' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <svg className="w-7 h-7" fill={currentScreen === 'stats' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs font-medium">My Stats</span>
        </button>

        {/* Team */}
        <button
          onClick={handleTeamClick}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentScreen === 'team' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <svg className="w-7 h-7" fill={currentScreen === 'team' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-xs font-medium">Team</span>
        </button>
      </div>
    </nav>
  );
}
