interface ChallengeHUDProps {
  challenge: any;
}

export function ChallengeHUD({ challenge }: ChallengeHUDProps) {
  if (!challenge) {
    return (
      <div className="w-full px-4">
        <div className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl">
          {/* Label above the circle */}
          <div className="text-center mb-4">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              My Challenge
            </h3>
          </div>

          {/* Giant Empty Progress Ring */}
          <div className="flex justify-center mb-6">
            {/* ...existing code... */}
          </div>

          {/* ...existing code... */}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4">
      <div className="bg-white dark:bg-[#151A25] rounded-3xl p-6 shadow-xl">
        {/* Label above the circle */}
        <div className="text-center mb-4">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            My Challenge
          </h3>
        </div>

        {/* Giant Progress Ring */}
        <div className="flex justify-center mb-6">
          {/* ...existing code... */}
        </div>

        {/* ...existing code... */}
      </div>
    </div>
  );
}