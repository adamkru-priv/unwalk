import Foundation
import Capacitor
import BackgroundTasks

@objcMembers
@objc(BackgroundStepCheckPlugin)
public class BackgroundStepCheckPlugin: CAPPlugin {
    
    // MARK: - Sync Settings Management
    
    @objc func updateSyncSettings(_ call: CAPPluginCall) {
        guard let enabled = call.getBool("enabled"),
              let intervalMinutes = call.getInt("intervalMinutes") else {
            call.reject("Missing required parameters: enabled, intervalMinutes")
            return
        }
        
        // Validate interval (1, 5, 15, 30, 60 minutes)
        let validIntervals = [1, 5, 15, 30, 60]
        guard validIntervals.contains(intervalMinutes) else {
            call.reject("Interval must be one of: 1, 5, 15, 30, 60 minutes")
            return
        }
        
        // Update settings in BackgroundTaskManager
        BackgroundTaskManager.shared.updateSyncSettings(enabled: enabled, intervalMinutes: intervalMinutes)
        
        call.resolve([
            "success": true,
            "enabled": enabled,
            "intervalMinutes": intervalMinutes
        ])
    }
    
    @objc func getSyncSettings(_ call: CAPPluginCall) {
        let enabled = UserDefaults.standard.bool(forKey: "auto_sync_enabled")
        let intervalMinutes = UserDefaults.standard.integer(forKey: "background_check_interval_minutes")
        let interval = intervalMinutes > 0 ? intervalMinutes : 15
        
        call.resolve([
            "enabled": enabled,
            "intervalMinutes": interval
        ])
    }
    
    @objc func setCheckInterval(_ call: CAPPluginCall) {
        guard let minutes = call.getInt("minutes") else {
            call.reject("Missing minutes parameter")
            return
        }
        
        // Validate interval (1-60 minutes)
        guard minutes >= 1 && minutes <= 60 else {
            call.reject("Interval must be between 1 and 60 minutes")
            return
        }
        
        UserDefaults.standard.set(minutes, forKey: "background_check_interval_minutes")
        
        // Reschedule with new interval
        BackgroundTaskManager.shared.scheduleBackgroundStepCheck()
        
        call.resolve([
            "success": true,
            "interval": minutes
        ])
    }
    
    @objc func getCheckInterval(_ call: CAPPluginCall) {
        let minutes = UserDefaults.standard.integer(forKey: "background_check_interval_minutes")
        let interval = minutes > 0 ? minutes : 15 // Default 15 minutes
        
        call.resolve([
            "interval": interval
        ])
    }
    
    @objc func setActiveChallengeData(_ call: CAPPluginCall) {
        guard let goalSteps = call.getInt("goalSteps"),
              let title = call.getString("title") else {
            call.reject("Missing required parameters")
            return
        }
        
        let challengeData: [String: Any] = [
            "goal_steps": goalSteps,
            "title": title,
            "updated_at": Date().timeIntervalSince1970
        ]
        
        UserDefaults.standard.set(challengeData, forKey: "active_challenge_data")
        
        // Reset progress notifications for new challenge
        UserDefaults.standard.set(0, forKey: "last_challenge_progress_notified")
        
        call.resolve(["success": true])
    }
    
    @objc func clearActiveChallengeData(_ call: CAPPluginCall) {
        UserDefaults.standard.removeObject(forKey: "active_challenge_data")
        UserDefaults.standard.removeObject(forKey: "last_challenge_progress_notified")
        
        call.resolve(["success": true])
    }
    
    @objc func getCachedSteps(_ call: CAPPluginCall) {
        let steps = UserDefaults.standard.integer(forKey: "cached_today_steps")
        let timestamp = UserDefaults.standard.double(forKey: "cached_steps_timestamp")
        
        call.resolve([
            "steps": steps,
            "timestamp": timestamp,
            "isCached": timestamp > 0
        ])
    }
    
    @objc func triggerManualCheck(_ call: CAPPluginCall) {
        BackgroundTaskManager.shared.triggerManualCheck()
        
        // Wait a bit for the check to complete
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            let steps = UserDefaults.standard.integer(forKey: "cached_today_steps")
            call.resolve([
                "success": true,
                "steps": steps
            ])
        }
    }
    
    @objc func getBackgroundCheckStatus(_ call: CAPPluginCall) {
        let enabled = UserDefaults.standard.bool(forKey: "auto_sync_enabled")
        let interval = UserDefaults.standard.integer(forKey: "background_check_interval_minutes")
        let lastCheck = UserDefaults.standard.double(forKey: "cached_steps_timestamp")
        
        call.resolve([
            "enabled": enabled,
            "interval": interval > 0 ? interval : 15,
            "lastCheckTimestamp": lastCheck,
            "lastCheckDate": lastCheck > 0 ? Date(timeIntervalSince1970: lastCheck).ISO8601Format() : nil
        ])
    }
    
    @objc func forceEnableAutoSync(_ call: CAPPluginCall) {
        // Force enable auto-sync with 15 minute interval
        UserDefaults.standard.set(true, forKey: "auto_sync_enabled")
        UserDefaults.standard.set(15, forKey: "background_check_interval_minutes")
        
        print("[BackgroundStepCheck] ✅ Force enabled auto-sync with 15 min interval")
        
        // Schedule background tasks
        BackgroundTaskManager.shared.updateSyncSettings(enabled: true, intervalMinutes: 15)
        
        call.resolve([
            "success": true,
            "enabled": true,
            "intervalMinutes": 15
        ])
    }
}
