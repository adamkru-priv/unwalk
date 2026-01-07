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
    
    // 🎯 NEW: Check authorization status
    func isAuthorized() -> Bool {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            return false
        }
        
        let status = healthStore.authorizationStatus(for: stepType)
        return status == .sharingAuthorized
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
        print("⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️")
        print("⚡️ [HealthKit] SYNC STEPS WITH BACKEND CALLED - STEPS: \(steps)")
        print("⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️⚡️")
        
        print("[HealthKit] 🔍 Checking UserDefaults for user session...")
        
        // Try WITHOUT CapacitorStorage prefix first
        let userIdDirect = UserDefaults.standard.string(forKey: "user_id")
        let accessTokenDirect = UserDefaults.standard.string(forKey: "access_token")
        let deviceIdDirect = UserDefaults.standard.string(forKey: "device_id")
        
        // Try WITH CapacitorStorage prefix
        let capacitorPrefix = "CapacitorStorage."
        let userId = UserDefaults.standard.string(forKey: "\(capacitorPrefix)user_id")
        let accessToken = UserDefaults.standard.string(forKey: "\(capacitorPrefix)access_token")
        let deviceId = UserDefaults.standard.string(forKey: "\(capacitorPrefix)device_id")
        
        // Use whichever set was found
        let finalUserId = userId ?? userIdDirect
        let finalAccessToken = accessToken ?? accessTokenDirect
        let finalDeviceId = deviceId ?? deviceIdDirect ?? "unknown"
        
        // Get user data from UserDefaults
        guard let finalUserId = finalUserId,
              let finalAccessToken = finalAccessToken else {
            print("[HealthKit] ⚠️ No user session found in UserDefaults")
            return
        }
        
        // 🎯 NEW: Verify token is not expired before sending
        if !isTokenValid(finalAccessToken) {
            print("[HealthKit] ⚠️ Token expired or invalid - skipping sync")
            print("[HealthKit] ℹ️ Token will be refreshed by JavaScript layer")
            return
        }
        
        print("[HealthKit] ✅ Using raw token: \(String(finalAccessToken.prefix(30)))...")
        print("[HealthKit] ✅ Found user session:")
        print("[HealthKit]    user_id: \(String(finalUserId.prefix(20)))...")
        print("[HealthKit]    device_id: \(finalDeviceId)")
        print("[HealthKit]    token: \(String(finalAccessToken.prefix(30)))...")
        
        // Get date in format that Edge Function expects (YYYY-MM-DD)
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let todayString = dateFormatter.string(from: Date())
        
        print("[HealthKit] ✅ Loaded Supabase config from UserDefaults")
        
        // 🎯 NEW: Use Edge Function endpoint instead of RPC
        let urlString = "https://bctcjrxvgwooiayawfyl.supabase.co/functions/v1/sync-steps"
        print("[HealthKit] 🌐 Target URL: \(urlString)")
        
        let url = URL(string: urlString)!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(finalAccessToken)", forHTTPHeaderField: "Authorization")
        
        // 🎯 NEW: Simplified payload for Edge Function
        let payload: [String: Any] = [
            "user_id": finalUserId,
            "device_id": finalDeviceId,
            "date": todayString,
            "steps": steps
        ]
        
        print("[HealthKit] 📦 Payload: \(payload)")
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        
        print("[HealthKit] 🚀 Sending sync request to backend...")
        print("[HealthKit] 📍 Method: POST")
        print("[HealthKit] 📍 Headers: Content-Type=application/json, Authorization=Bearer <token>")
        
        // Send request
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("[HealthKit] ❌ Sync failed: \(error.localizedDescription)")
                print("[HealthKit] ❌ Error domain: \(error._domain)")
                print("[HealthKit] ❌ Error code: \(error._code)")
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
            } else {
                print("[HealthKit] ⚠️ No HTTP response received")
            }
        }
        task.resume()
        print("[HealthKit] ⏳ Request sent, waiting for response...")
    }
    
    // 🎯 NEW: Check if JWT token is still valid
    private func isTokenValid(_ token: String) -> Bool {
        // JWT format: header.payload.signature
        let parts = token.components(separatedBy: ".")
        guard parts.count == 3 else {
            print("[HealthKit] ⚠️ Invalid JWT format")
            return false
        }
        
        // Decode payload (base64url)
        let payload = parts[1]
        
        // Add padding if needed for base64 decoding
        var base64 = payload
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        
        let paddingLength = (4 - base64.count % 4) % 4
        base64 += String(repeating: "=", count: paddingLength)
        
        guard let data = Data(base64Encoded: base64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let exp = json["exp"] as? TimeInterval else {
            print("[HealthKit] ⚠️ Could not decode JWT expiry")
            return false
        }
        
        let now = Date().timeIntervalSince1970
        let isValid = exp > now
        
        if !isValid {
            let expiredAgo = now - exp
            print("[HealthKit] ❌ Token expired \(Int(expiredAgo)) seconds ago")
        } else {
            let expiresIn = exp - now
            print("[HealthKit] ✅ Token valid, expires in \(Int(expiresIn)) seconds")
        }
        
        return isValid
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
