import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Challenge, UserChallenge, UserTier } from '../types';

type Screen = 'onboarding' | 'home' | 'dashboard' | 'library' | 'team' | 'stats' | 'profile' | 'badges';

interface ChallengeStore {
  challenge: Challenge | null;
  activeUserChallenge: UserChallenge | null;
  pausedChallenges: UserChallenge[];
  currentScreen: Screen;
  isOnboardingComplete: boolean;
  isHealthConnected: boolean;
  userTier: UserTier;
  
  // Actions
  setChallenge: (challenge: Challenge) => void;
  setActiveChallenge: (userChallenge: UserChallenge) => void;
  setPausedChallenges: (challenges: UserChallenge[]) => void;
  pauseActiveChallenge: (userChallenge: UserChallenge) => void;
  resumeChallenge: (userChallenge: UserChallenge) => void;
  setCurrentScreen: (screen: Screen) => void;
  updateChallengeProgress: (steps: number) => void;
  completeChallenge: () => void;
  clearChallenge: () => void;
  setOnboardingComplete: (complete: boolean) => void;
  setHealthConnected: (connected: boolean) => void;
  setUserTier: (tier: UserTier) => void;
}

export const useChallengeStore = create<ChallengeStore>()(
  persist(
    (set) => ({
      challenge: null,
      activeUserChallenge: null,
      pausedChallenges: [],
      currentScreen: 'onboarding',
      isOnboardingComplete: false,
      isHealthConnected: false,
      userTier: 'basic',

      setChallenge: (challenge) => set({ challenge }),
      
      setActiveChallenge: (userChallenge) => set({ 
        activeUserChallenge: userChallenge,
        currentScreen: 'home'
      }),

      setPausedChallenges: (challenges) => set({ pausedChallenges: challenges }),

      pauseActiveChallenge: (userChallenge) => set((state) => ({
        activeUserChallenge: null,
        pausedChallenges: [...state.pausedChallenges, userChallenge],
      })),

      resumeChallenge: (userChallenge) => set((state) => ({
        activeUserChallenge: userChallenge,
        pausedChallenges: state.pausedChallenges.filter(c => c.id !== userChallenge.id),
      })),
      
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      
      updateChallengeProgress: (steps) =>
        set((state) => {
          if (!state.challenge) return state;
          
          const updatedChallenge = {
            ...state.challenge,
            currentSteps: Math.min(steps, state.challenge.goalSteps),
          };
          
          if (steps >= state.challenge.goalSteps) {
            updatedChallenge.status = 'completed';
            updatedChallenge.completedAt = new Date().toISOString();
          }
          
          return { challenge: updatedChallenge };
        }),
      
      completeChallenge: () =>
        set((state) => ({
          challenge: state.challenge
            ? { ...state.challenge, status: 'completed', completedAt: new Date().toISOString() }
            : null,
        })),
      
      clearChallenge: () => set({ challenge: null, activeUserChallenge: null }),
      
      setOnboardingComplete: (complete) => set({ 
        isOnboardingComplete: complete,
        currentScreen: complete ? 'home' : 'onboarding'
      }),
      
      setHealthConnected: (connected) => set({ isHealthConnected: connected }),

      setUserTier: (tier) => set({ userTier: tier }),
    }),
    {
      name: 'unwalk-storage',
    }
  )
);
