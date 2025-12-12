import { motion } from 'framer-motion';
import { useChallengeStore } from '../../stores/useChallengeStore';

export function EmptyState() {
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl shadow-lg p-8 text-center"
    >
      {/* Illustration */}
      <div className="mb-6">
        <div className="inline-block text-7xl">
          📦
        </div>
      </div>

      {/* Text */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No active challenges
      </h3>
      <p className="text-gray-600 mb-8">
        Create your first challenge and start moving!
      </p>

      {/* CTA */}
      <button 
        onClick={() => setCurrentScreen('library')}
        className="w-full bg-primary-600 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:bg-primary-500 active:scale-98 transition-all"
      >
        + Create Challenge
      </button>
    </motion.div>
  );
}
