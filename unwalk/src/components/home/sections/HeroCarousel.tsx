import { SoloCard } from './SoloCard';
import { SocialCard } from './SocialCard';
import type { UserChallenge } from '../../../types';
import type { TeamMember } from '../../../lib/auth';
import type { ChallengeAssignmentWithProgress } from '../../../lib/api';

interface HeroCarouselProps {
  activeChallenge: UserChallenge | null;
  progress: number;
  currentSlide: number;
  teamActiveChallenges: any[];
  onSoloClick: () => void;
  onTeamClick: () => void;
  onSlideChange: (slide: number) => void;
  variant?: 'carousel' | 'stack';
  teamMembers?: TeamMember[];
  isGuest?: boolean;
  onQuickAssign?: (member: TeamMember) => void;
  sentAssignments?: ChallengeAssignmentWithProgress[];
}

export function HeroCarousel({
  activeChallenge,
  progress,
  currentSlide,
  teamActiveChallenges,
  onSoloClick,
  onTeamClick,
  onSlideChange,
  variant = 'carousel',
  isGuest = false,
}: HeroCarouselProps) {
  if (variant === 'stack') {
    return (
      <section className="space-y-4">
        <SoloCard activeChallenge={activeChallenge} progress={progress} onClick={onSoloClick} variant="stack" />
        <SocialCard
          teamActiveChallenges={teamActiveChallenges}
          onTeamClick={onTeamClick}
          variant="stack"
          isGuest={isGuest}
        />
      </section>
    );
  }

  return (
    <section className="relative">
      <div className="overflow-hidden">
        <div 
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentSlide * 85}%)` }}
        >
          <SoloCard 
            activeChallenge={activeChallenge}
            progress={progress}
            onClick={onSoloClick}
          />
          
          <SocialCard 
            teamActiveChallenges={teamActiveChallenges}
            onTeamClick={onTeamClick}
          />
        </div>
      </div>

      {/* Carousel dots indicator */}
      <div className="flex justify-center gap-2 mt-4">
        <button
          onClick={() => onSlideChange(0)}
          className={`h-2 rounded-full transition-all ${
            currentSlide === 0 
              ? 'w-8 bg-blue-500' 
              : 'w-2 bg-gray-300 dark:bg-white/20'
          }`}
          aria-label="View Solo"
        />
        <button
          onClick={() => onSlideChange(1)}
          className={`h-2 rounded-full transition-all ${
            currentSlide === 1 
              ? 'w-8 bg-emerald-500' 
              : 'w-2 bg-gray-300 dark:bg-white/20'
          }`}
          aria-label="View Social"
        />
      </div>
    </section>
  );
}
