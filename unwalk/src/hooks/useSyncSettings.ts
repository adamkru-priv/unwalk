import { useState, useEffect } from 'react';
import BackgroundStepCheck from '../plugins/backgroundStepCheck';
import { supabase } from '../lib/supabase';

export interface SyncSettings {
  enabled: boolean;
  intervalMinutes: number;
}

export const useSyncSettings = () => {
  const [settings, setSettings] = useState<SyncSettings>({
    enabled: true,
    intervalMinutes: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // 1. Load from Supabase (source of truth)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('auto_sync_enabled, sync_interval_minutes')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          const newSettings = {
            enabled: data.auto_sync_enabled ?? true,
            intervalMinutes: data.sync_interval_minutes ?? 15,
          };
          
          setSettings(newSettings);

          // 2. Sync to native iOS
          await BackgroundStepCheck.updateSyncSettings({
            enabled: newSettings.enabled,
            intervalMinutes: newSettings.intervalMinutes,
          });

          console.log('[SyncSettings] ✅ Loaded from Supabase:', newSettings);
          return;
        }
      }

      // Fallback: Load from native if Supabase fails
      const nativeSettings = await BackgroundStepCheck.getSyncSettings();
      setSettings(nativeSettings);
      console.log('[SyncSettings] ℹ️ Loaded from native:', nativeSettings);
    } catch (error) {
      console.error('[SyncSettings] ❌ Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<SyncSettings>) => {
    try {
      setSaving(true);

      const updated = { ...settings, ...newSettings };
      setSettings(updated);

      // 1. Update Supabase (source of truth)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('users')
          .update({
            auto_sync_enabled: updated.enabled,
            sync_interval_minutes: updated.intervalMinutes,
          })
          .eq('id', user.id);

        if (error) throw error;
      }

      // 2. Update native iOS
      await BackgroundStepCheck.updateSyncSettings({
        enabled: updated.enabled,
        intervalMinutes: updated.intervalMinutes,
      });

      console.log('[SyncSettings] ✅ Updated:', updated);
    } catch (error) {
      console.error('[SyncSettings] ❌ Failed to update:', error);
      // Revert on error
      await loadSettings();
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const toggleAutoSync = async () => {
    await updateSettings({ enabled: !settings.enabled });
  };

  const setInterval = async (intervalMinutes: number) => {
    await updateSettings({ intervalMinutes });
  };

  return {
    settings,
    loading,
    saving,
    updateSettings,
    toggleAutoSync,
    setInterval,
    refresh: loadSettings,
  };
};
