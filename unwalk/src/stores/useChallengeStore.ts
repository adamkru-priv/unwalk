import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Challenge, UserChallenge, UserTier } from '../types';
import type { AdminChallenge } from '../types';
import type { UserProfile } from '../lib/auth';

type Screen = 'onboarding' | 'whoToChallenge' | 'auth' | 'home' | 'dashboard' | 'library' | 'team' | 'stats' | 'profile' | 'badges' | 'challengeSelection';
type Theme = 'light' | 'dark';

interface ChallengeStore {
  challenge: Challenge | null;
  activeUserChallenge: UserChallenge | null;
  pausedChallenges: UserChallenge[];
  currentScreen: Screen;
  isOnboardingComplete: boolean;
  hasSeenWhoToChallenge: boolean;
  isHealthConnected: boolean;
  userProfile: UserProfile | null;
  userTier: UserTier;
  dailyStepGoal: number;
  exploreResetTrigger: number;
  dailyChallenge: AdminChallenge | null;
  dailyChallengeDate: string | null;
  theme: Theme;
  assignTarget: { id: string; name: string; email: string } | null;
  isAppReady: boolean; // ✅ NEW: Blocks components until App.tsx validates session
  
  // Actions
  setChallenge: (challenge: Challenge) => void;
  setActiveChallenge: (userChallenge: UserChallenge | null) => void;
  setPausedChallenges: (challenges: UserChallenge[]) => void;
  pauseActiveChallenge: (userChallenge: UserChallenge) => void;
  resumeChallenge: (userChallenge: UserChallenge) => void;
  clearPausedChallenges: () => void;
  setCurrentScreen: (screen: Screen) => void;
  updateChallengeProgress: (steps: number) => void;
  completeChallenge: () => void;
  clearChallenge: () => void;
  setOnboardingComplete: (complete: boolean) => void;
  setHealthConnected: (connected: boolean) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setUserTier: (tier: UserTier) => void;
  setDailyStepGoal: (goal: number) => void;
  resetExploreView: () => void;
  setDailyChallenge: (challenge: AdminChallenge) => void;
  getDailyChallenge: () => AdminChallenge | null;
  setTheme: (theme: Theme) => void;
  resetToInitialState: () => void;
  setAssignTarget: (target: { id: string; name: string; email: string } | null) => void;
  setIsAppReady: (ready: boolean) => void; // ✅ NEW
}

export const useChallengeStore = create<ChallengeStore>()(
  persist(
    (set, get) => ({
      challenge: null,
      activeUserChallenge: null,
      pausedChallenges: [],
      currentScreen: 'onboarding',
      isOnboardingComplete: false,
      hasSeenWhoToChallenge: false, // New: track if user saw target selection
      isHealthConnected: false,
      userProfile: null, // ✅ NEW: Full user profile
      userTier: 'basic',
      dailyStepGoal: 0,
      exploreResetTrigger: 0,
      dailyChallenge: null,
      dailyChallengeDate: null,
      theme: 'dark',
      assignTarget: null,
      isAppReady: false, // ✅ NEW

      setChallenge: (challenge) => set({ challenge }),
      
      setActiveChallenge: (userChallenge) => {
        if (userChallenge === null) {
          set({ activeUserChallenge: null });
          return;
        }
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

      clearPausedChallenges: () => set({ pausedChallenges: [] }),
      
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

      setUserProfile: (profile) => set({ userProfile: profile }), // ✅ NEW

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

      setTheme: (theme) => set({ theme }),

      resetToInitialState: () => set({
        challenge: null,
        activeUserChallenge: null,
        pausedChallenges: [],
        currentScreen: 'onboarding',
        isOnboardingComplete: false,
        hasSeenWhoToChallenge: false, // New: track if user saw target selection
        isHealthConnected: false,
        userProfile: null, // ✅ NEW: Full user profile
        userTier: 'basic',
        dailyStepGoal: 0,
        dailyChallenge: null,
        dailyChallengeDate: null,
      }),

      setAssignTarget: (target) => set({ assignTarget: target }),

      setIsAppReady: (ready) => set({ isAppReady: ready }), // ✅ NEW
    }),
    {
      name: 'unwalk-storage',
      partialize: (state) => ({
        // Persist everything EXCEPT isAppReady
        challenge: state.challenge,
        activeUserChallenge: state.activeUserChallenge,
        pausedChallenges: state.pausedChallenges,
        currentScreen: state.currentScreen,
        isOnboardingComplete: state.isOnboardingComplete,
        hasSeenWhoToChallenge: state.hasSeenWhoToChallenge,
        isHealthConnected: state.isHealthConnected,
        userProfile: state.userProfile,
        userTier: state.userTier,
        dailyStepGoal: state.dailyStepGoal,
        exploreResetTrigger: state.exploreResetTrigger,
        dailyChallenge: state.dailyChallenge,
        dailyChallengeDate: state.dailyChallengeDate,
        theme: state.theme,
        assignTarget: state.assignTarget,
      }),
    }
  )
);
