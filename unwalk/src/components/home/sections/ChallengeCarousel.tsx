import { useState } from 'react';
import DailyActivityHUD from './DailyActivityHUD';
import { RunnerHUD } from './RunnerHUD';
import type { UserChallenge } from '../../../types';

interface ChallengeCarouselProps {
  soloChallenge: UserChallenge | null;
  progress: number;
  currentStreak: number;
  xpReward: number;
  todaySteps: number;
  dailyStepGoal: number;
  onSoloClick: () => void;
  onRefresh?: () => Promise<void>;
  onAIChallengeClick?: () => void;
}

export function ChallengeCarousel({
  soloChallenge,
  todaySteps,
  dailyStepGoal,
  currentStreak,
  onSoloClick,
  xpReward,
  onRefresh,
  onAIChallengeClick
}: ChallengeCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  // @ts-ignore - Used for tracking slide visits
  const [visitedSlides, setVisitedSlides] = useState<Set<number>>(new Set([0]));

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
    
    // 🎯 UPDATED: 2 slides only - swipe between 0 and 1
    if (isLeftSwipe && currentSlide < 1) {
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
      {/* Slide Indicators - 🎯 UPDATED: 2 dots only */}
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
      </div>

      {/* 🎯 UPDATED: Only 2 slides - Daily and Solo */}
      <div
        className="relative overflow-hidden min-h-[400px] pb-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {currentSlide === 0 && (
          <div className="w-full animate-fade-in">
            <DailyActivityHUD
              todaySteps={todaySteps}
              dailyStepGoal={dailyStepGoal}
              currentStreak={currentStreak}
              userLevel={1}
              hasActiveChallenge={!!soloChallenge}
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
              onAIChallengeClick={onAIChallengeClick}
            />
          </div>
        )}
      </div>

      {/* Swipe Hint */}
      {currentSlide === 0 && (
        <div className="text-center mt-3 animate-pulse">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
            ← Swipe to see solo challenge →
          </p>
        </div>
      )}
    </div>
  );
}
