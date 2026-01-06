import Foundation
import HealthKit

class HealthKitManager {
    static let shared = HealthKitManager()
    private let healthStore = HKHealthStore()
    
    // 🎯 NEW: Background observer query
    private var backgroundObserverQuery: HKObserverQuery?
    
    func isAvailable() -> Bool {
        return HKHealthStore.isHealthDataAvailable()
    }
    
    func requestAuthorization(completion: @escaping (Bool, Error?) -> Void) {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            completion(false, NSError(domain: "HealthKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "Step count type not available"]))
            return
        }
        
        let typesToRead: Set<HKObjectType> = [stepType]
        
        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
            DispatchQueue.main.async {
                completion(success, error)
            }
        }
    }
    
    // 🎯 NEW: Enable background delivery for step count
    func enableBackgroundDelivery(completion: @escaping (Bool, Error?) -> Void) {
        print("[HealthKit] 🎬 enableBackgroundDelivery called")
        
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            print("[HealthKit] ❌ Step count type not available")
            completion(false, NSError(domain: "HealthKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "Step count type not available"]))
            return
        }
        
        print("[HealthKit] 📞 Calling healthStore.enableBackgroundDelivery...")
        
        // Enable background delivery - iOS will wake app when new step data arrives
        healthStore.enableBackgroundDelivery(for: stepType, frequency: .immediate) { success, error in
            print("[HealthKit] 📥 enableBackgroundDelivery callback received: success=\(success)")
            
            if success {
                print("[HealthKit] ✅ Background delivery enabled")
                // Start observing step changes
                self.startObservingSteps()
            } else {
                print("[HealthKit] ❌ Failed to enable background delivery: \(error?.localizedDescription ?? "unknown")")
            }
            
            DispatchQueue.main.async {
                print("[HealthKit] 🔄 Calling completion handler...")
                completion(success, error)
            }
        }
        
        print("[HealthKit] ⏳ Waiting for enableBackgroundDelivery callback...")
    }
    
    // 🎯 NEW: Start observing step count changes
    private func startObservingSteps() {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            return
        }
        
        // Stop existing observer if any
        if let existingQuery = backgroundObserverQuery {
            healthStore.stop(existingQuery)
        }
        
        // Create observer query
        let query = HKObserverQuery(sampleType: stepType, predicate: nil) { [weak self] query, completionHandler, error in
            guard error == nil else {
                print("[HealthKit] ❌ Observer error: \(error!.localizedDescription)")
                completionHandler()
                return
            }
            
            print("[HealthKit] 🔔 Steps changed! Fetching latest...")
            
            // Fetch today's steps
            self?.getTodaySteps { steps, error in
                guard let steps = steps, error == nil else {
                    print("[HealthKit] ❌ Failed to fetch steps: \(error?.localizedDescription ?? "unknown")")
                    completionHandler()
                    return
                }
                
                print("[HealthKit] 📊 Latest steps: \(steps)")
                
                // Save to UserDefaults for JS access
                UserDefaults.standard.set(steps, forKey: "cached_today_steps")
                UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "cached_steps_timestamp")
                
                // Sync with backend
                self?.syncStepsWithBackend(steps: steps)
                
                // Must call completion handler
                completionHandler()
            }
        }
        
        backgroundObserverQuery = query
        healthStore.execute(query)
        
        print("[HealthKit] 👀 Started observing step changes in background")
    }
    
    // 🎯 NEW: Sync steps with backend
    private func syncStepsWithBackend(steps: Int) {
        // 🔍 DEBUG: Check ALL available keys in UserDefaults
        print("[HealthKit] 🔍 Checking UserDefaults for user session...")
        
        // 🔍 DEBUG: Print ALL UserDefaults keys to see what's actually stored
        print("[HealthKit] 🔍 ===== ALL UserDefaults KEYS =====")
        let allKeys = UserDefaults.standard.dictionaryRepresentation().keys
        for key in allKeys {
            let value = UserDefaults.standard.object(forKey: key)
            let valueStr = String(describing: value).prefix(100)
            print("[HealthKit] 🔍   KEY: '\(key)' = \(valueStr)...")
        }
        print("[HealthKit] 🔍 ===== END OF KEYS =====")
        
        // Try WITHOUT CapacitorStorage prefix first
        let userIdDirect = UserDefaults.standard.string(forKey: "user_id")
        let accessTokenDirect = UserDefaults.standard.string(forKey: "access_token")
        let deviceIdDirect = UserDefaults.standard.string(forKey: "device_id")
        let supabaseUrlDirect = UserDefaults.standard.string(forKey: "supabase_url")
        let supabaseKeyDirect = UserDefaults.standard.string(forKey: "supabase_anon_key")
        
        print("[HealthKit] 🔍 Direct keys (no prefix):")
        print("[HealthKit] 🔍   user_id: \(userIdDirect != nil ? "✅ FOUND" : "❌ NOT FOUND")")
        print("[HealthKit] 🔍   access_token: \(accessTokenDirect != nil ? "✅ FOUND" : "❌ NOT FOUND")")
        print("[HealthKit] 🔍   device_id: \(deviceIdDirect != nil ? "✅ FOUND" : "❌ NOT FOUND")")
        print("[HealthKit] 🔍   supabase_url: \(supabaseUrlDirect != nil ? "✅ FOUND" : "❌ NOT FOUND")")
        print("[HealthKit] 🔍   supabase_anon_key: \(supabaseKeyDirect != nil ? "✅ FOUND" : "❌ NOT FOUND")")
        
        // Try WITH CapacitorStorage prefix
        let capacitorPrefix = "CapacitorStorage."
        let userId = UserDefaults.standard.string(forKey: "\(capacitorPrefix)user_id")
        let accessToken = UserDefaults.standard.string(forKey: "\(capacitorPrefix)access_token")
        let deviceId = UserDefaults.standard.string(forKey: "\(capacitorPrefix)device_id")
        let supabaseUrl = UserDefaults.standard.string(forKey: "\(capacitorPrefix)supabase_url")
        let supabaseKey = UserDefaults.standard.string(forKey: "\(capacitorPrefix)supabase_anon_key")
        
        print("[HealthKit] 🔍 Capacitor prefixed keys:")
        print("[HealthKit] 🔍   CapacitorStorage.user_id: \(userId != nil ? "✅ FOUND" : "❌ NOT FOUND")")
        print("[HealthKit] 🔍   CapacitorStorage.access_token: \(accessToken != nil ? "✅ FOUND" : "❌ NOT FOUND")")
        print("[HealthKit] 🔍   CapacitorStorage.device_id: \(deviceId != nil ? "✅ FOUND" : "❌ NOT FOUND")")
        print("[HealthKit] 🔍   CapacitorStorage.supabase_url: \(supabaseUrl != nil ? "✅ FOUND" : "❌ NOT FOUND")")
        print("[HealthKit] 🔍   CapacitorStorage.supabase_anon_key: \(supabaseKey != nil ? "✅ FOUND" : "❌ NOT FOUND")")
        
        // Use whichever set was found
        let finalUserId = userId ?? userIdDirect
        let finalAccessToken = accessToken ?? accessTokenDirect
        let finalDeviceId = deviceId ?? deviceIdDirect ?? "unknown"
        
        // Get Supabase config - use fallback if not found in UserDefaults
        let finalSupabaseUrl: String
        if let url = supabaseUrl ?? supabaseUrlDirect {
            finalSupabaseUrl = url
        } else {
            finalSupabaseUrl = "https://bctcjrxvgwooiayawfyl.supabase.co"
            print("[HealthKit] ⚠️ Using fallback Supabase URL")
        }
        
        let finalSupabaseKey = supabaseKey ?? supabaseKeyDirect
        
        // Get user data from UserDefaults
        guard let finalUserId = finalUserId,
              let finalAccessToken = finalAccessToken,
              let finalSupabaseKey = finalSupabaseKey else {
            print("[HealthKit] ⚠️ No user session or Supabase config found in UserDefaults")
            print("[HealthKit] ⚠️ Missing: userId=\(finalUserId == nil), token=\(finalAccessToken == nil), key=\(finalSupabaseKey == nil)")
            return
        }
        
        print("[HealthKit] ✅ Found user session and Supabase config!")
        print("[HealthKit] 👤 User ID: \(finalUserId)")
        print("[HealthKit] 📱 Device ID: \(finalDeviceId)")
        print("[HealthKit] 🌐 Supabase URL: \(finalSupabaseUrl)")
        
        let today = Calendar.current.startOfDay(for: Date())
        let dateFormatter = ISO8601DateFormatter()
        let todayString = dateFormatter.string(from: today)
        
        // Prepare request
        let url = URL(string: "\(finalSupabaseUrl)/rest/v1/rpc/sync_steps")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(finalAccessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(finalSupabaseKey, forHTTPHeaderField: "apikey")
        
        let payload: [String: Any] = [
            "p_user_id": finalUserId,
            "p_device_id": finalDeviceId,
            "p_date": todayString,
            "p_steps": steps
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        
        // Send request
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("[HealthKit] ❌ Sync failed: \(error.localizedDescription)")
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse {
                print("[HealthKit] 📡 Sync response: \(httpResponse.statusCode)")
                
                if let data = data, let bodyString = String(data: data, encoding: .utf8) {
                    print("[HealthKit] 📄 Response body: \(bodyString)")
                }
                
                if httpResponse.statusCode == 200 {
                    print("[HealthKit] ✅ Steps synced with backend: \(steps)")
                } else {
                    print("[HealthKit] ⚠️ Sync failed with status: \(httpResponse.statusCode)")
                }
            }
        }
        task.resume()
    }
    
    func getSteps(from startDate: Date, to endDate: Date, completion: @escaping (Int?, Error?) -> Void) {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            completion(nil, NSError(domain: "HealthKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "Step count type not available"]))
            return
        }
        
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        
        let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(nil, error)
                    return
                }
                
                guard let result = result, let sum = result.sumQuantity() else {
                    completion(0, nil)
                    return
                }
                
                let steps = Int(sum.doubleValue(for: HKUnit.count()))
                completion(steps, nil)
            }
        }
        
        healthStore.execute(query)
    }
    
    func getTodaySteps(completion: @escaping (Int?, Error?) -> Void) {
        let now = Date()
        let startOfDay = Calendar.current.startOfDay(for: now)
        getSteps(from: startOfDay, to: now, completion: completion)
    }
}
