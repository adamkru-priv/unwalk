import { useState } from 'react';

interface DailyStepGoalSectionProps {
  dailyStepGoal: number;
  onSave: (goal: number) => void;
}

export function DailyStepGoalSection({ dailyStepGoal, onSave }: DailyStepGoalSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const displayGoal = dailyStepGoal || 10000;

  const startEdit = () => {
    setInputValue(displayGoal.toString());
    setIsEditing(true);
  };

  const save = () => {
    const num = parseInt(inputValue.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num >= 1000) onSave(num);
    setInputValue('');
    setIsEditing(false);
  };

  const cancel = () => {
    setInputValue('');
    setIsEditing(false);
  };

  const formatWithCommas = (num: number) => num.toLocaleString('en-US');

  return (
    <section className="bg-white dark:bg-[#151A25] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-white/5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            <span className="truncate">Daily Step Goal</span>
          </div>
        </div>

        {!isEditing ? (
          <button
            onClick={startEdit}
            className="shrink-0 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white font-bold text-sm transition-colors"
            title="Tap to edit"
          >
            {formatWithCommas(displayGoal)}
          </button>
        ) : (
          <div className="shrink-0 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className="w-24 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="10000"
              autoFocus
            />
            <button
              onClick={cancel}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors"
              aria-label="Cancel"
              title="Cancel"
            >
              <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={save}
              className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              aria-label="Save"
              title="Save"
            >
              <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
