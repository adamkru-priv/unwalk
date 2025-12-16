import { useState } from 'react';

interface DailyStepGoalSectionProps {
  dailyStepGoal: number;
  onSave: (goal: number) => void;
}

export function DailyStepGoalSection({ dailyStepGoal, onSave }: DailyStepGoalSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleStartEdit = () => {
    setInputValue((dailyStepGoal || 10000).toString());
    setIsEditing(true);
  };

  const handleSave = () => {
    const num = parseInt(inputValue.replace(/\D/g, ''));
    if (!isNaN(num) && num >= 1000) {
      onSave(num);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue('');
  };

  const formatWithCommas = (num: number) => {
    return num.toLocaleString('en-US');
  };

  const displayGoal = dailyStepGoal || 10000;

  return (
    <section className="bg-white dark:bg-[#151A25] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/5">
      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>🎯</span>
        <span>Daily Step Goal</span>
      </h2>
      
      {isEditing ? (
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-gray-100 dark:bg-white/5 border-2 border-blue-500 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-lg font-bold text-center focus:outline-none"
              placeholder="10000"
              autoFocus
            />
            <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">steps per day</div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleStartEdit}
          className="w-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl p-4 transition-colors text-left"
        >
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatWithCommas(displayGoal)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">steps per day • tap to edit</div>
        </button>
      )}
    </section>
  );
}
