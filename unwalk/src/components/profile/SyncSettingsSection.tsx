import React from 'react';
import { useSyncSettings } from '../../hooks/useSyncSettings';

const SyncSettingsSection: React.FC = () => {
  const { settings, loading, saving, toggleAutoSync, setInterval } = useSyncSettings();

  const intervalOptions = [
    { value: 1, label: '1 min' },
    { value: 5, label: '5 min' },
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hour' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <h3 className="text-[15px] font-medium text-gray-900 dark:text-white">
          Auto-Sync Steps
        </h3>
      </div>

      {/* Toggle Auto-Sync */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-white/5">
        <div className="flex-1">
          <div className="text-[14px] font-medium text-gray-900 dark:text-white">Background Sync</div>
          <div className="text-[13px] text-gray-500 dark:text-gray-400">Auto-update steps in background</div>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={toggleAutoSync}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
            settings.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
          } ${saving ? 'opacity-60' : ''}`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-sm ${
              settings.enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Interval Selector */}
      <div className={`${!settings.enabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-[14px] font-medium text-gray-900 dark:text-white">Frequency</div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {intervalOptions.map(option => (
            <button
              key={option.value}
              disabled={!settings.enabled || saving}
              onClick={() => setInterval(option.value)}
              className={`py-2 rounded-lg text-[13px] font-medium transition-all ${
                settings.intervalMinutes === option.value && settings.enabled
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15'
              } ${(!settings.enabled || saving) ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info Notes */}
      {settings.enabled ? (
        <div className="mt-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
          <p className="text-[12px] text-blue-700 dark:text-blue-300">
            📱 Sync works in background even when app is closed. Shorter intervals may affect battery life.
          </p>
        </div>
      ) : (
        <div className="mt-3 p-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/30">
          <p className="text-[12px] text-yellow-700 dark:text-yellow-300">
            ⚠️ Sync disabled. Steps will update only when you open the app.
          </p>
        </div>
      )}
    </div>
  );
};

export default SyncSettingsSection;
