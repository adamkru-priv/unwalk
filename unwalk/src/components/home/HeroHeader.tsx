import { useChallengeStore } from '../../stores/useChallengeStore';

export function HeroHeader() {
  const userProfile = useChallengeStore((s) => s.userProfile);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">
          Hey {userProfile?.display_name || 'Walker'}! 👋
        </h1>
        {/* Removed "Let's get moving" subtitle */}
      </div>
    </div>
  );
}
