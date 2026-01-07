import Foundation
import BackgroundTasks
import HealthKit
import UserNotifications

class BackgroundTaskManager {
    static let shared = BackgroundTaskManager()
    
    // Background task identifier
    private let taskIdentifier = "com.unwalk.backgroundStepCheck"
    
    // User preferences for check interval (in minutes) - now synced from Supabase
    private var checkInterval: TimeInterval {
        let minutes = UserDefaults.standard.integer(forKey: "background_check_interval_minutes")
        return TimeInterval((minutes > 0 ? minutes : 15) * 60) // Default 15 minutes
    }
    
    // Check if auto-sync is enabled
    private var isAutoSyncEnabled: Bool {
        return UserDefaults.standard.bool(forKey: "auto_sync_enabled")
    }
    
    private init() {}
    
    // MARK: - Register Background Task
    
    func registerBackgroundTasks() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: taskIdentifier,
            using: nil
        ) { task in
            self.handleBackgroundStepCheck(task: task as! BGAppRefreshTask)
        }
        
        print("[BackgroundTask] ✅ Registered background task: \(taskIdentifier)")
    }
    
    // MARK: - Schedule Next Background Check
    
    func scheduleBackgroundStepCheck() {
        // Cancel if auto-sync is disabled
        guard isAutoSyncEnabled else {
            print("[BackgroundTask] ⏸️ Auto-sync disabled, cancelling scheduled tasks")
            BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: taskIdentifier)
            return
        }
        
        let request = BGAppRefreshTaskRequest(identifier: taskIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: checkInterval)
        
        do {
            try BGTaskScheduler.shared.submit(request)
            print("[BackgroundTask] ✅ Scheduled next check in \(checkInterval/60) minutes")
        } catch {
            print("[BackgroundTask] ❌ Failed to schedule: \(error)")
        }
    }
    
    // MARK: - Update Sync Settings (called from JS)
    
    func updateSyncSettings(enabled: Bool, intervalMinutes: Int) {
        UserDefaults.standard.set(enabled, forKey: "auto_sync_enabled")
        UserDefaults.standard.set(intervalMinutes, forKey: "background_check_interval_minutes")
        
        print("[BackgroundTask] 🔧 Settings updated: enabled=\(enabled), interval=\(intervalMinutes)min")
        
        if enabled {
            // Re-schedule with new interval
            scheduleBackgroundStepCheck()
        } else {
            // Cancel all scheduled tasks
            BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: taskIdentifier)
            print("[BackgroundTask] ❌ All background tasks cancelled")
        }
    }
    
    // MARK: - Handle Background Task
    
    private func handleBackgroundStepCheck(task: BGAppRefreshTask) {
        print("[BackgroundTask] 🔄 Background step check started")
        
        // Schedule next check (will respect current settings)
        scheduleBackgroundStepCheck()
        
        // Create operation with timeout
        let operation = BlockOperation {
            self.performStepCheck { success in
                task.setTaskCompleted(success: success)
            }
        }
        
        // Handle expiration
        task.expirationHandler = {
            print("[BackgroundTask] ⚠️ Task expired, cancelling operation")
            operation.cancel()
        }
        
        // Execute
        OperationQueue().addOperation(operation)
    }
    
    // MARK: - Perform Step Check
    
    private func performStepCheck(completion: @escaping (Bool) -> Void) {
        // Get today's steps
        HealthKitManager.shared.getTodaySteps { steps, error in
            guard let steps = steps, error == nil else {
                print("[BackgroundTask] ❌ Failed to get steps: \(error?.localizedDescription ?? "unknown")")
                completion(false)
                return
            }
            
            print("[BackgroundTask] 📊 Current steps: \(steps)")
            
            // Save to UserDefaults for JS access
            UserDefaults.standard.set(steps, forKey: "cached_today_steps")
            UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "cached_steps_timestamp")
            
            // 🎯 NEW: Sync steps to Supabase via Edge Function
            self.syncStepsToSupabase(steps: steps) { syncSuccess in
                if syncSuccess {
                    print("[BackgroundTask] ✅ Steps synced to Supabase: \(steps)")
                } else {
                    print("[BackgroundTask] ⚠️ Failed to sync to Supabase (will retry next time)")
                }
                
                // Check goals and send notifications
                self.checkGoalsAndNotify(currentSteps: steps) { notificationSent in
                    print("[BackgroundTask] ✅ Step check completed, notification sent: \(notificationSent)")
                    completion(true)
                }
            }
        }
    }
    
    // MARK: - Sync Steps to Supabase
    
    private func syncStepsToSupabase(steps: Int, completion: @escaping (Bool) -> Void) {
        // Get Supabase credentials from UserDefaults (set by JS layer)
        guard let supabaseUrl = UserDefaults.standard.string(forKey: "supabase_url"),
              let supabaseAnonKey = UserDefaults.standard.string(forKey: "supabase_anon_key"),
              let accessToken = UserDefaults.standard.string(forKey: "supabase_access_token"),
              let userId = UserDefaults.standard.string(forKey: "supabase_user_id"),
              let deviceId = UserDefaults.standard.string(forKey: "device_id") else {
            print("[BackgroundTask] ⚠️ Missing Supabase credentials, skipping sync")
            completion(false)
            return
        }
        
        // Prepare Edge Function URL
        let edgeFunctionUrl = "\(supabaseUrl)/functions/v1/sync-steps"
        
        guard let url = URL(string: edgeFunctionUrl) else {
            print("[BackgroundTask] ❌ Invalid Edge Function URL")
            completion(false)
            return
        }
        
        // Prepare request body
        let requestBody: [String: Any] = [
            "user_id": userId,
            "device_id": deviceId,
            "steps": steps,
            "date": ISO8601DateFormatter().string(from: Date()).split(separator: "T")[0]
        ]
        
        guard let jsonData = try? JSONSerialization.data(withJSONObject: requestBody) else {
            print("[BackgroundTask] ❌ Failed to serialize request body")
            completion(false)
            return
        }
        
        // Create request
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = jsonData
        
        // Send request
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("[BackgroundTask] ❌ Network error: \(error.localizedDescription)")
                completion(false)
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse {
                print("[BackgroundTask] 📡 Sync response: \(httpResponse.statusCode)")
                
                if httpResponse.statusCode == 200 {
                    completion(true)
                } else {
                    if let data = data, let responseBody = String(data: data, encoding: .utf8) {
                        print("[BackgroundTask] ❌ Sync failed: \(responseBody)")
                    }
                    completion(false)
                }
            } else {
                completion(false)
            }
        }
        
        task.resume()
    }
    
    // MARK: - Check Goals & Send Notifications
    
    private func checkGoalsAndNotify(currentSteps: Int, completion: @escaping (Bool) -> Void) {
        let dailyGoal = 10000
        
        // Check daily goal
        if currentSteps >= dailyGoal {
            let lastGoalNotification = UserDefaults.standard.double(forKey: "last_goal_notification_date")
            let today = Calendar.current.startOfDay(for: Date()).timeIntervalSince1970
            
            // Only send once per day
            if lastGoalNotification < today {
                sendNotification(
                    title: "🎉 Daily Goal Achieved!",
                    body: "You've reached \(currentSteps) steps today. Keep it up!",
                    identifier: "daily_goal_\(Int(today))"
                )
                UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "last_goal_notification_date")
                completion(true)
                return
            }
        }
        
        // Check for milestones (5k, 7.5k, etc.)
        checkMilestones(currentSteps: currentSteps)
        
        // Check active challenges (would need to fetch from JS/storage)
        checkActiveChallenges(currentSteps: currentSteps)
        
        completion(false)
    }
    
    private func checkMilestones(currentSteps: Int) {
        let milestones = [2500, 5000, 7500]
        let lastMilestone = UserDefaults.standard.integer(forKey: "last_milestone_notified")
        
        for milestone in milestones {
            if currentSteps >= milestone && lastMilestone < milestone {
                sendNotification(
                    title: "🚀 Milestone Reached!",
                    body: "You've walked \(milestone) steps today!",
                    identifier: "milestone_\(milestone)"
                )
                UserDefaults.standard.set(milestone, forKey: "last_milestone_notified")
                break
            }
        }
    }
    
    private func checkActiveChallenges(currentSteps: Int) {
        // Get active challenge data from UserDefaults (set by JS)
        guard let challengeData = UserDefaults.standard.dictionary(forKey: "active_challenge_data") else {
            return
        }
        
        if let goalSteps = challengeData["goal_steps"] as? Int,
           let challengeTitle = challengeData["title"] as? String {
            
            let progress = (Double(currentSteps) / Double(goalSteps)) * 100
            
            // Notify at 50%, 75%, 90%, 100%
            let notifyAt = [50, 75, 90, 100]
            let lastNotified = UserDefaults.standard.integer(forKey: "last_challenge_progress_notified")
            
            for threshold in notifyAt {
                if progress >= Double(threshold) && lastNotified < threshold {
                    let emoji = threshold == 100 ? "🎉" : "💪"
                    sendNotification(
                        title: "\(emoji) Challenge Progress",
                        body: "\(threshold)% complete on '\(challengeTitle)'! \(currentSteps)/\(goalSteps) steps",
                        identifier: "challenge_\(threshold)"
                    )
                    UserDefaults.standard.set(threshold, forKey: "last_challenge_progress_notified")
                    break
                }
            }
        }
    }
    
    // MARK: - Send Notification
    
    private func sendNotification(title: String, body: String, identifier: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.badge = 1
        
        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: nil // Immediate
        )
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[Notification] ❌ Failed to send: \(error)")
            } else {
                print("[Notification] ✅ Sent: \(title)")
            }
        }
    }
    
    // MARK: - Manual Trigger (for testing)
    
    func triggerManualCheck() {
        print("[BackgroundTask] 🔧 Manual check triggered")
        performStepCheck { success in
            print("[BackgroundTask] Manual check completed: \(success)")
        }
    }
}
