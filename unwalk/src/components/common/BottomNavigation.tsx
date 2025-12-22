import { useChallengeStore } from '../../stores/useChallengeStore';

interface BottomNavigationProps {
  currentScreen: 'home' | 'library' | 'dashboard' | 'team' | 'badges';
  onProfileClick?: () => void;
  onTeamClick?: () => void;
}

export function BottomNavigation({ currentScreen, onTeamClick }: BottomNavigationProps) {
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const resetExploreView = useChallengeStore((s) => s.resetExploreView);

  const handleExploreClick = () => {
    resetExploreView(); // Reset explore to menu view
    setCurrentScreen('library');
  };

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
        {/* Home */}
        <button
          onClick={() => setCurrentScreen('home')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentScreen === 'home' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <svg className="w-7 h-7" fill={currentScreen === 'home' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          <span className="text-xs font-medium">Home</span>
        </button>

        {/* Challenges */}
        <button
          onClick={handleExploreClick}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentScreen === 'library' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <svg className="w-7 h-7" fill={currentScreen === 'library' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 20 20">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
          </svg>
          <span className="text-xs font-medium">Challenges</span>
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

        {/* Rewards */}
        <button
          onClick={() => setCurrentScreen('badges')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentScreen === 'badges' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {/* Simple Trophy icon */}
          <svg className="w-7 h-7" fill={currentScreen === 'badges' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
          </svg>
          <span className="text-xs font-medium">Rewards</span>
        </button>
      </div>
    </nav>
  );
}
