import { motion } from 'framer-motion';
import { useState } from 'react';
import type { UserChallenge } from '../../types';
import { updateChallengeProgress } from '../../lib/api';
import { useChallengeStore } from '../../stores/useChallengeStore';

interface ChallengeCardProps {
  challenge: UserChallenge;
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const setActiveChallenge = useChallengeStore((s) => s.setActiveChallenge);
  
  const goalSteps = challenge.admin_challenge?.goal_steps || 0;
  const progress = (challenge.current_steps / goalSteps) * 100;
  const remaining = goalSteps - challenge.current_steps;
  
  // Dynamic blur based on progress
  const blurAmount = Math.max(0, 30 - (progress * 0.3));

  // DEV: Simulator buttons
  const handleAddSteps = async (steps: number) => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      const newSteps = Math.min(challenge.current_steps + steps, goalSteps);
      console.log(`🚶 Adding ${steps} steps: ${challenge.current_steps} → ${newSteps}`);
      
      const updatedChallenge = await updateChallengeProgress(challenge.id, newSteps);
      setActiveChallenge(updatedChallenge);
      
      console.log('✅ Steps updated successfully!');
    } catch (error) {
      console.error('❌ Failed to update steps:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
    >
      {/* Blurred Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={challenge.admin_challenge?.image_url || ''}
          alt="Challenge reward"
          className="w-full h-full object-cover blur-dynamic"
          style={{ filter: `blur(${blurAmount}px)` }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Progress Info (Overlay) */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-3xl font-bold">
                {Math.min(challenge.current_steps, goalSteps).toLocaleString()}
              </p>
              <p className="text-sm opacity-90">
                / {goalSteps.toLocaleString()} steps
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{Math.round(progress)}%</p>
              <p className="text-sm opacity-90">complete</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-400 to-green-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          
          <p className="text-sm mt-2 opacity-90">
            {remaining > 0 ? `${remaining.toLocaleString()} steps to go!` : 'Challenge complete! 🎉'}
          </p>
        </div>
      </div>
      
      {/* Challenge Title */}
      <div className="px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {challenge.admin_challenge?.title}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {challenge.admin_challenge?.description}
        </p>

        {/* DEV: Step Simulator */}
        {import.meta.env.DEV && (
          <div className="border-t pt-4 mt-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">🛠️ DEV: Step Simulator</p>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleAddSteps(100)}
                disabled={isUpdating}
                className="bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm font-medium hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +100
              </button>
              <button
                onClick={() => handleAddSteps(500)}
                disabled={isUpdating}
                className="bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm font-medium hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +500
              </button>
              <button
                onClick={() => handleAddSteps(1000)}
                disabled={isUpdating}
                className="bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm font-medium hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +1K
              </button>
              <button
                onClick={() => handleAddSteps(5000)}
                disabled={isUpdating}
                className="bg-green-100 text-green-700 px-3 py-2 rounded text-sm font-medium hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +5K
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
