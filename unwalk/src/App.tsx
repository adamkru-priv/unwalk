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

  // Show onboarding if not completed
  if (!isOnboardingComplete) {
    return <OnboardingScreen />;
  }

  // Otherwise show the appropriate screen
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
}

export default App;
