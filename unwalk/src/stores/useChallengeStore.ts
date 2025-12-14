import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Challenge, UserChallenge, UserTier } from '../types';
import type { AdminChallenge } from '../types';

type Screen = 'onboarding' | 'home' | 'dashboard' | 'library' | 'team' | 'stats' | 'profile' | 'badges';

interface ChallengeStore {
  challenge: Challenge | null;
  activeUserChallenge: UserChallenge | null;
  pausedChallenges: UserChallenge[];
  currentScreen: Screen;
  isOnboardingComplete: boolean;
  isHealthConnected: boolean;
  userTier: UserTier;
  dailyStepGoal: number;
  exploreResetTrigger: number;
  dailyChallenge: AdminChallenge | null;
  dailyChallengeDate: string | null; // Format: YYYY-MM-DD
  
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
  setDailyStepGoal: (goal: number) => void;
  resetExploreView: () => void;
  setDailyChallenge: (challenge: AdminChallenge) => void;
  getDailyChallenge: () => AdminChallenge | null;
}

export const useChallengeStore = create<ChallengeStore>()(
  persist(
    (set, get) => ({
      challenge: null,
      activeUserChallenge: null,
      pausedChallenges: [],
      currentScreen: 'onboarding',
      isOnboardingComplete: false,
      isHealthConnected: false,
      userTier: 'basic',
      dailyStepGoal: 0,
      exploreResetTrigger: 0,
      dailyChallenge: null,
      dailyChallengeDate: null,

      setChallenge: (challenge) => set({ challenge }),
      
      setActiveChallenge: (userChallenge) => {
        // Set last_resumed_at to now when challenge becomes active
        const challengeWithTime = {
          ...userChallenge,
          last_resumed_at: new Date().toISOString(),
        };
        set({ 
          activeUserChallenge: challengeWithTime,
          currentScreen: 'home'
        });
      },

      setPausedChallenges: (challenges) => set({ pausedChallenges: challenges }),

      pauseActiveChallenge: (userChallenge) => {
        // Calculate active time for this session and add it to total
        const now = new Date();
        let sessionSeconds = 0;
        
        if (userChallenge.last_resumed_at) {
          const resumedAt = new Date(userChallenge.last_resumed_at);
          sessionSeconds = Math.floor((now.getTime() - resumedAt.getTime()) / 1000);
        }
        
        const pausedChallenge = {
          ...userChallenge,
          active_time_seconds: (userChallenge.active_time_seconds || 0) + sessionSeconds,
          last_resumed_at: undefined, // Clear this when paused
          paused_at: now.toISOString(),
          status: 'paused' as const,
        };
        
        set((state) => ({
          activeUserChallenge: null,
          pausedChallenges: [...state.pausedChallenges, pausedChallenge],
        }));
      },

      resumeChallenge: (userChallenge) => {
        // Set last_resumed_at to now when resuming
        const resumedChallenge = {
          ...userChallenge,
          last_resumed_at: new Date().toISOString(),
          status: 'active' as const,
        };
        
        set((state) => ({
          activeUserChallenge: resumedChallenge,
          pausedChallenges: state.pausedChallenges.filter(c => c.id !== userChallenge.id),
        }));
      },
      
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

      setDailyStepGoal: (goal) => set({ dailyStepGoal: goal }),

      resetExploreView: () => set((state) => ({ exploreResetTrigger: state.exploreResetTrigger + 1 })),

      setDailyChallenge: (challenge) => {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        set({ dailyChallenge: challenge, dailyChallengeDate: today });
      },

      getDailyChallenge: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // If we have a daily challenge and it's from today, return it
        if (state.dailyChallenge && state.dailyChallengeDate === today) {
          return state.dailyChallenge;
        }
        
        // Otherwise, it's expired or doesn't exist
        return null;
      },
    }),
    {
      name: 'unwalk-storage',
    }
  )
);
