import { useState } from 'react';
import { DailyActivityHUD } from './DailyActivityHUD';
import { RunnerHUD } from './RunnerHUD';
import { TeamHUD } from './TeamHUD';
import type { UserChallenge } from '../../../types';

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  steps: number;
  percentage: number;
}

interface ChallengeCarouselProps {
  soloChallenge: UserChallenge | null;
  teamChallenge: UserChallenge | null;
  teamMembers: TeamMember[];
  progress: number;
  currentStreak: number;
  xpReward: number;
  todaySteps: number;
  dailyStepGoal: number;
  onSoloClick: () => void;
  onTeamClick: () => void;
  onInviteMoreClick?: (challengeId: string, challengeTitle: string, alreadyInvitedUserIds: string[]) => void;
  onChallengeStarted?: () => void;
  onChallengeCancelled?: () => void;
  onChallengeEnded?: () => void;
  onRefresh?: () => Promise<void>;
}

export function ChallengeCarousel({
  soloChallenge,
  teamChallenge,
  teamMembers,
  todaySteps,
  dailyStepGoal,
  onSoloClick,
  onTeamClick,
  onInviteMoreClick,
  onChallengeStarted,
  onChallengeCancelled,
  onChallengeEnded,
  xpReward,
  onRefresh
}: ChallengeCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  // @ts-ignore - Used for tracking slide visits
  const [visitedSlides, setVisitedSlides] = useState<Set<number>>(new Set([0]));

  // 🎯 REMOVED: Auto-switch logic - it was causing unwanted slide changes

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    let newSlide = currentSlide;
    
    // 🎯 3 slides - swipe between 0, 1, 2
    if (isLeftSwipe && currentSlide < 2) {
      newSlide = currentSlide + 1;
      setCurrentSlide(newSlide);
    }
    if (isRightSwipe && currentSlide > 0) {
      newSlide = currentSlide - 1;
      setCurrentSlide(newSlide);
    }
    
    // Mark slide as visited
    setVisitedSlides(prev => new Set([...prev, newSlide]));

    // Reset
    setTouchStart(0);
    setTouchEnd(0);
  };
  
  const handleDotClick = (slideIndex: number) => {
    setCurrentSlide(slideIndex);
    setVisitedSlides(prev => new Set([...prev, slideIndex]));
  };

  return (
    <div className="relative">
      {/* Slide Indicators - 3 dots */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <button
          onClick={() => handleDotClick(0)}
          className={`h-2 rounded-full transition-all duration-300 ${
            currentSlide === 0 
              ? 'w-8 bg-blue-600 dark:bg-blue-400' 
              : 'w-2 bg-gray-300 dark:bg-gray-700'
          }`}
          aria-label="Today's Activity"
        />
        <button
          onClick={() => handleDotClick(1)}
          className={`h-2 rounded-full transition-all duration-300 ${
            currentSlide === 1 
              ? 'w-8 bg-purple-600 dark:bg-purple-400' 
              : 'w-2 bg-gray-300 dark:bg-gray-700'
          }`}
          aria-label="Solo Challenge"
        />
        <button
          onClick={() => handleDotClick(2)}
          className={`h-2 rounded-full transition-all duration-300 ${
            currentSlide === 2 
              ? 'w-8 bg-orange-600 dark:bg-orange-400' 
              : 'w-2 bg-gray-300 dark:bg-gray-700'
          }`}
          aria-label="Team Challenge"
        />
      </div>

      {/* 🎯 NEW: Conditional Rendering - Only active slide is mounted */}
      <div
        className="relative overflow-hidden min-h-[400px]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {currentSlide === 0 && (
          <div className="w-full animate-fade-in">
            <DailyActivityHUD
              todaySteps={todaySteps}
              dailyStepGoal={dailyStepGoal}
              onRefresh={onRefresh}
            />
          </div>
        )}

        {currentSlide === 1 && (
          <div className="w-full animate-fade-in">
            <RunnerHUD
              activeChallenge={soloChallenge}
              onClick={onSoloClick}
              xpReward={xpReward}
              onRefresh={onRefresh}
            />
          </div>
        )}

        {currentSlide === 2 && (
          <div className="w-full animate-fade-in">
            <TeamHUD
              teamChallenge={teamChallenge}
              teamMembers={teamMembers}
              onClick={onTeamClick}
              onInviteMoreClick={onInviteMoreClick}
              onChallengeStarted={onChallengeStarted}
              onChallengeCancelled={onChallengeCancelled}
              onChallengeEnded={onChallengeEnded}
              onRefresh={onRefresh}
            />
          </div>
        )}
      </div>

      {/* Swipe Hint */}
      {currentSlide === 0 && (
        <div className="text-center mt-3 animate-pulse">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
            ← Swipe to see challenges →
          </p>
        </div>
      )}
    </div>
  );
}
