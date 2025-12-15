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
          <svg className="w-6 h-6" fill={currentScreen === 'home' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          <span className="text-xs font-medium">Home</span>
        </button>

        {/* Team */}
        <button
          onClick={handleTeamClick}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentScreen === 'team' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <svg className="w-6 h-6" fill={currentScreen === 'team' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-xs font-medium">Team</span>
        </button>

        {/* Challenges */}
        <button
          onClick={handleExploreClick}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentScreen === 'library' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <svg className="w-6 h-6" fill={currentScreen === 'library' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 20 20">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
          </svg>
          <span className="text-xs font-medium">Challenges</span>
        </button>

        {/* Rewards */}
        <button
          onClick={() => setCurrentScreen('badges')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentScreen === 'badges' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <svg className="w-6 h-6" fill={currentScreen === 'badges' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <span className="text-xs font-medium">Rewards</span>
        </button>
      </div>
    </nav>
  );
}
