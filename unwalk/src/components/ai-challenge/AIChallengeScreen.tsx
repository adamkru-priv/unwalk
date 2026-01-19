import { useState } from 'react';
import { DurationSelection } from './DurationSelection';
import { OpponentSelection } from './OpponentSelection';
import { AIChallengeActive } from './AIChallengeActive';
import { AIChallengeResults } from './AIChallengeResults';
import { SprintLeaderboard } from './SprintLeaderboard';

type ChallengeStep = 'duration' | 'opponent' | 'active' | 'results' | 'leaderboard';

const opponents = {
  30: {
    easy: { name: 'Turtle', minSteps: 30, maxSteps: 45, emoji: '🐢' },
    medium: { name: 'Runner', minSteps: 50, maxSteps: 70, emoji: '🏃' },
    hard: { name: 'Speedster', minSteps: 75, maxSteps: 100, emoji: '⚡' },
  },
};

interface AIChallengeScreenProps {
  onBackToHome: () => void;
  initialScreen?: 'duration' | 'leaderboard';
}

export function AIChallengeScreen({ onBackToHome, initialScreen = 'duration' }: AIChallengeScreenProps) {
  const [step, setStep] = useState<ChallengeStep>(initialScreen === 'leaderboard' ? 'leaderboard' : 'duration');
  const [duration, setDuration] = useState<30>(30);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [opponentSteps, setOpponentSteps] = useState<number>(0);
  const [results, setResults] = useState<{ playerSteps: number; aiSteps: number; won: boolean } | null>(null);

  const handleSelectDuration = (selectedDuration: 30) => {
    setDuration(selectedDuration);
    setStep('opponent');
  };

  const handleSelectOpponent = (selectedDifficulty: 'easy' | 'medium' | 'hard') => {
    setDifficulty(selectedDifficulty);
    
    const opponent = opponents[duration][selectedDifficulty];
    const randomSteps = Math.floor(Math.random() * (opponent.maxSteps - opponent.minSteps + 1)) + opponent.minSteps;
    setOpponentSteps(randomSteps);
    
    setStep('active');
  };

  const handleFinish = (playerSteps: number, aiSteps: number, won: boolean) => {
    setResults({ playerSteps, aiSteps, won });
    setStep('results');
  };

  const handlePlayAgain = () => {
    setResults(null);
    setStep('duration');
  };

  const handleViewLeaderboard = () => {
    setStep('leaderboard');
  };

  const handleBackFromLeaderboard = () => {
    // Go back to home instead of results when opened from home
    if (initialScreen === 'leaderboard') {
      onBackToHome();
    } else {
      setStep('results');
    }
  };

  const opponent = opponents[duration][difficulty];

  return (
    <>
      {step === 'duration' && (
        <DurationSelection
          onSelectDuration={handleSelectDuration}
          onBack={onBackToHome}
        />
      )}

      {step === 'opponent' && (
        <OpponentSelection
          duration={duration}
          onSelectOpponent={handleSelectOpponent}
          onBack={() => setStep('duration')}
        />
      )}

      {step === 'active' && (
        <AIChallengeActive
          duration={duration}
          opponentSteps={opponentSteps}
          opponentName={opponent.name}
          opponentEmoji={opponent.emoji}
          onFinish={handleFinish}
        />
      )}

      {step === 'results' && results && (
        <AIChallengeResults
          playerSteps={results.playerSteps}
          aiSteps={results.aiSteps}
          won={results.won}
          opponentName={opponent.name}
          opponentEmoji={opponent.emoji}
          duration={duration}
          difficulty={difficulty}
          onPlayAgain={handlePlayAgain}
          onBackToHome={onBackToHome}
          onViewLeaderboard={handleViewLeaderboard}
        />
      )}

      {step === 'leaderboard' && (
        <SprintLeaderboard onBack={handleBackFromLeaderboard} />
      )}
    </>
  );
}
