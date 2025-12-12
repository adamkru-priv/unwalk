import { useChallengeStore } from './stores/useChallengeStore';
import { OnboardingScreen } from './components/onboarding/OnboardingScreen';
import { HomeScreen } from './components/home/HomeScreen';
import { Dashboard } from './components/dashboard/Dashboard';
import { ChallengeLibrary } from './components/challenge/ChallengeLibrary';

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
    default:
      return <HomeScreen />;
  }
}

export default App;
