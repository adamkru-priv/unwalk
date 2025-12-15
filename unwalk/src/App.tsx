import { useChallengeStore } from './stores/useChallengeStore';
import { OnboardingScreen } from './components/onboarding/OnboardingScreen';
import { HomeScreen } from './components/home/HomeScreen';
import { Dashboard } from './components/dashboard/Dashboard';
import { ChallengeLibrary } from './components/challenge/ChallengeLibrary';
import { TeamScreen } from './components/team/TeamScreen';
import { StatsScreen } from './components/stats/StatsScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { BadgesScreen } from './components/badges/BadgesScreen';

function App() {
  const isOnboardingComplete = useChallengeStore((s) => s.isOnboardingComplete);
  const currentScreen = useChallengeStore((s) => s.currentScreen);
  const theme = useChallengeStore((s) => s.theme);

  // Show onboarding if not completed
  if (!isOnboardingComplete) {
    return <div className={theme}><OnboardingScreen /></div>;
  }

  // Otherwise show the appropriate screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'library':
        return <ChallengeLibrary />;
      case 'dashboard':
        return <Dashboard />;
      case 'team':
        return <TeamScreen />;
      case 'stats':
        return <StatsScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'badges':
        return <BadgesScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return <div className={theme}>{renderScreen()}</div>;
}

export default App;
