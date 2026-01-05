import { useState } from 'react';
import { useChallengeStore } from '../../stores/useChallengeStore';
import { authService } from '../../lib/auth';
import { useHealthKit } from '../../hooks/useHealthKit';
import { Capacitor } from '@capacitor/core';
import { ThemeSelector } from './ThemeSelector';
import type { UserProfile } from '../../lib/auth/types';
import type { Theme } from '../../stores/useChallengeStore';

interface ProfileSettingsTabProps {
  userProfile: UserProfile | null;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  pushEnabled: boolean;
  onTogglePushEnabled: (enabled: boolean) => void;
  pushSaving: boolean;
  dailyStepGoal: number;
  onDailyStepGoalChange: (goal: number) => void;
  dailyGoalSaving: boolean;
  pushNotifStatus: {
    isAvailable: boolean;
    isGranted: boolean;
    isDenied: boolean;
    isPrompt: boolean;
  };
  onEnablePushNotifications: () => Promise<void>;
  pushNotifLoading: boolean;
}

export function ProfileSettingsTab({
  userProfile,
  theme,
  onThemeChange,
  pushEnabled,
  onTogglePushEnabled,
  pushSaving,
  dailyStepGoal,
  onDailyStepGoalChange,
  dailyGoalSaving,
  pushNotifStatus,
  onEnablePushNotifications,
  pushNotifLoading,
}: ProfileSettingsTabProps) {
  const setCurrentScreen = useChallengeStore((s) => s.setCurrentScreen);
  const setUserProfile = useChallengeStore((s) => s.setUserProfile);

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameValue, setNicknameValue] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);

  const platform = Capacitor.getPlatform();
  const healthServiceName = platform === 'ios' ? 'Apple Health' : platform === 'android' ? 'Health Connect' : 'Health Data';
  const isNative = Capacitor.isNativePlatform();

  const {
    isAvailable: healthKitAvailable,
    isAuthorized: healthKitAuthorized,
    isLoading: healthKitLoading,
    requestPermission: connectHealthKit,
    syncSteps: refreshHealthKitSteps,
    todaySteps,
  } = useHealthKit();

  const handleSaveNickname = async () => {
    if (!userProfile) return;

    if (nicknameValue.length > 9) {
      alert('Nickname must be 9 characters or less');
      return;
    }

    setNicknameSaving(true);

    try {
      const { error } = await authService.updateProfile({ nickname: nicknameValue || null } as any);
      if (error) throw error;

      setUserProfile({ ...userProfile, nickname: nicknameValue || null });
      setIsEditingNickname(false);
    } catch (e) {
      alert('Failed to update nickname. Please try again.');
    } finally {
      setNicknameSaving(false);
    }
  };

  const handleEditNickname = () => {
    setNicknameValue(userProfile?.nickname || '');
    setIsEditingNickname(true);
  };

  const handleCancelNickname = () => {
    setIsEditingNickname(false);
    setNicknameValue('');
  };

  return (
    <div className="space-y-3">
      {/* Nickname Editor */}
      <div className="bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[15px] font-medium text-gray-900 dark:text-white">Display Nickname</div>
            <div className="text-[13px] text-gray-500 dark:text-gray-400">
              {userProfile?.nickname || 'Not set'}
            </div>
          </div>

          {!isEditingNickname && (
            <button
              onClick={handleEditNickname}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {isEditingNickname && (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={nicknameValue}
              onChange={(e) => setNicknameValue(e.target.value.slice(0, 9))}
              placeholder="Enter nickname (max 9 chars)"
              maxLength={9}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B101B] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {nicknameValue.length}/9 characters
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelNickname}
                  disabled={nicknameSaving}
                  className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 text-[13px] font-medium transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNickname}
                  disabled={nicknameSaving}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium transition-colors disabled:opacity-60"
                >
                  {nicknameSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* My Custom Challenges */}
      <button
        onClick={() => setCurrentScreen('customChallenge')}
        className="w-full bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors text-left flex items-center justify-between group"
      >
        <div>
          <div className="text-[15px] font-medium text-gray-900 dark:text-white">My Custom Challenges</div>
          <div className="text-[13px] text-gray-500 dark:text-gray-400">Create & manage</div>
        </div>
      </button>

      {/* Health Data Integration */}
      <div className="bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-medium text-gray-900 dark:text-white">
              {healthServiceName}
            </div>
            <div className="text-[13px] text-gray-500 dark:text-gray-400">
              {isNative && healthKitAvailable
                ? healthKitAuthorized
                  ? `${todaySteps.toLocaleString()} steps today`
                  : 'Not connected'
                : 'Unavailable'}
            </div>
          </div>

          {isNative && healthKitAvailable && (
            <button
              disabled={healthKitLoading}
              onClick={async () => {
                const ok = await connectHealthKit();
                if (ok) {
                  await refreshHealthKitSteps();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[13px] font-medium transition-colors"
            >
              {healthKitAuthorized ? 'Sync' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* Push Notifications Permission */}
      {isNative && pushNotifStatus.isAvailable && !pushNotifStatus.isGranted && (
        <div className="bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium text-gray-900 dark:text-white">
                Push Notifications
              </div>
              <div className="text-[13px] text-gray-500 dark:text-gray-400">
                {pushNotifStatus.isDenied 
                  ? 'Blocked - check Settings' 
                  : 'Get notified about challenges'}
              </div>
            </div>

            <button
              disabled={pushNotifLoading || pushNotifStatus.isDenied}
              onClick={onEnablePushNotifications}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[13px] font-medium transition-colors"
            >
              {pushNotifLoading ? 'Enabling...' : 'Enable'}
            </button>
          </div>
        </div>
      )}

      {/* Daily Step Goal */}
      <div className="bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5">
        <div className="mb-3">
          <div className="text-[15px] font-medium text-gray-900 dark:text-white">Daily Step Goal</div>
          <div className="text-[13px] text-gray-500 dark:text-gray-400">
            {dailyStepGoal.toLocaleString()} steps
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[5000, 8000, 10000, 12000, 15000].map((goal) => (
            <button
              key={goal}
              disabled={dailyGoalSaving}
              onClick={() => onDailyStepGoalChange(goal)}
              className={`py-2 rounded-lg text-[13px] font-medium transition-all ${
                dailyStepGoal === goal
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15'
              } ${dailyGoalSaving ? 'opacity-60' : ''}`}
            >
              {goal >= 1000 ? `${goal / 1000}k` : goal}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications Toggle */}
      <div className="bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-medium text-gray-900 dark:text-white">Notifications</div>
            <div className="text-[13px] text-gray-500 dark:text-gray-400">
              {pushEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>

          <button
            type="button"
            disabled={pushSaving}
            onClick={() => onTogglePushEnabled(!pushEnabled)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              pushEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
            } ${pushSaving ? 'opacity-60' : ''}`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-sm ${
                pushEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Theme Selector */}
      <div className="bg-white dark:bg-[#151A25] rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-medium text-gray-900 dark:text-white">Appearance</div>
            <div className="text-[13px] text-gray-500 dark:text-gray-400 capitalize">{theme}</div>
          </div>
          <ThemeSelector theme={theme} onThemeChange={onThemeChange} />
        </div>
      </div>
    </div>
  );
}
