import { ChallengeHistory } from '../stats/ChallengeHistory';

interface ProfileHistoryTabProps {
  isGuest: boolean;
}

export function ProfileHistoryTab({ isGuest }: ProfileHistoryTabProps) {
  if (isGuest) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-bold mb-2">Sign in to view history</h3>
        <p className="text-gray-600 dark:text-white/60 text-sm">
          Track your completed challenges and progress
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#151A25] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-white/5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Challenge History</h2>
        <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">Completed challenges & XP earned</p>
      </div>
      <ChallengeHistory embedded={true} />
    </div>
  );
}
