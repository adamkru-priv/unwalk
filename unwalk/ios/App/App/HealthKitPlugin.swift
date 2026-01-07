import Foundation
import Capacitor
import HealthKit // 🎯 NEW: Import HealthKit framework

@objcMembers
@objc(MoveeHealthKitPlugin)
public final class MoveeHealthKitPlugin: CAPPlugin {
    private lazy var manager = HealthKitManager.shared
    
    override public func load() {
        print("✅ MoveeHealthKitPlugin loaded successfully")
    }
    
    @objc public func echo(_ call: CAPPluginCall) {
        let value = call.getString("value") ?? ""
        print("👋 MoveeHealthKitPlugin echo: \(value)")
        call.resolve(["value": value])
    }
    
    @objc public func isAvailable(_ call: CAPPluginCall) {
        print("📱 isAvailable called")
        let available = manager.isAvailable()
        print("📱 HealthKit available: \(available)")
        call.resolve(["available": available])
    }
    
    // 🎯 NEW: Check if user has authorized HealthKit access
    @objc public func isAuthorized(_ call: CAPPluginCall) {
        print("🔍 [HealthKit] isAuthorized called")
        
        let isAuthorized = manager.isAuthorized()
        
        print("🔍 [HealthKit] Authorization status: \(isAuthorized)")
        call.resolve(["authorized": isAuthorized])
    }
    
    @objc public func requestAuthorization(_ call: CAPPluginCall) {
        print("🔐 [HealthKit] requestAuthorization called")
        manager.requestAuthorization { success, error in
            if let error = error {
                print("❌ [HealthKit] Authorization error: \(error.localizedDescription)")
                call.reject(error.localizedDescription)
                return
            }
            print("✅ [HealthKit] Authorization success: \(success)")
            
            // 🎯 NEW: Enable background delivery after successful authorization
            if success {
                print("🔧 [HealthKit] Enabling background delivery...")
                self.manager.enableBackgroundDelivery { bgSuccess, bgError in
                    if bgSuccess {
                        print("✅ [HealthKit] Background delivery enabled successfully")
                    } else {
                        print("⚠️ [HealthKit] Background delivery failed: \(bgError?.localizedDescription ?? "unknown")")
                    }
                    
                    // Always resolve the call after background setup attempt
                    call.resolve(["authorized": success])
                }
            } else {
                print("⚠️ [HealthKit] Authorization not granted, skipping background delivery")
                call.resolve(["authorized": success])
            }
        }
    }
    
    @objc public func getSteps(_ call: CAPPluginCall) {
        print("📊 getSteps called")
        guard let startDateString = call.getString("startDate"),
              let endDateString = call.getString("endDate") else {
            call.reject("Missing date parameters")
            return
        }
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        // Fallback for dates without fractional seconds if first attempt fails
        var startDate = formatter.date(from: startDateString)
        var endDate = formatter.date(from: endDateString)
        
        if startDate == nil {
            formatter.formatOptions = [.withInternetDateTime]
            startDate = formatter.date(from: startDateString)
        }
        
        if endDate == nil {
            formatter.formatOptions = [.withInternetDateTime]
            endDate = formatter.date(from: endDateString)
        }
        
        guard let finalStartDate = startDate,
              let finalEndDate = endDate else {
            print("❌ Date parsing failed for: \(startDateString) or \(endDateString)")
            call.reject("Invalid date format")
            return
        }
        
        print("📊 Fetching steps from \(startDateString) to \(endDateString)")
        manager.getSteps(from: finalStartDate, to: finalEndDate) { steps, error in
            if let error = error {
                print("❌ Query error: \(error.localizedDescription)")
                call.reject(error.localizedDescription)
                return
            }
            print("✅ Steps found: \(steps ?? 0)")
            call.resolve(["steps": steps ?? 0])
        }
    }
}
