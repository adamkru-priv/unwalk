import Foundation
import Capacitor
import BackgroundTasks

@objc(BackgroundStepCheckPlugin)
public class BackgroundStepCheckPlugin: CAPPlugin {
    
    @objc func setCheckInterval(_ call: CAPPluginCall) {
        guard let minutes = call.getInt("minutes") else {
            call.reject("Missing minutes parameter")
            return
        }
        
        // Validate interval (5-60 minutes)
        guard minutes >= 5 && minutes <= 60 else {
            call.reject("Interval must be between 5 and 60 minutes")
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
        let interval = UserDefaults.standard.integer(forKey: "background_check_interval_minutes")
        let lastCheck = UserDefaults.standard.double(forKey: "cached_steps_timestamp")
        
        call.resolve([
            "enabled": true,
            "interval": interval > 0 ? interval : 15,
            "lastCheckTimestamp": lastCheck,
            "lastCheckDate": lastCheck > 0 ? Date(timeIntervalSince1970: lastCheck).ISO8601Format() : nil
        ])
    }
}
