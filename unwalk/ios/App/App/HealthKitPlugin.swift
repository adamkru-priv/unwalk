import Foundation
import Capacitor

@objc(HealthKitPlugin)
public class HealthKitPlugin: CAPPlugin {
    private let manager = HealthKitManager.shared
    
    override public func load() {
        print("✅ HealthKitPlugin loaded successfully")
    }
    
    @objc func isAvailable(_ call: CAPPluginCall) {
        print("📱 isAvailable called")
        let available = manager.isAvailable()
        print("📱 HealthKit available: \(available)")
        call.resolve(["available": available])
    }
    
    @objc func requestAuthorization(_ call: CAPPluginCall) {
        print("🔐 requestAuthorization called")
        manager.requestAuthorization { success, error in
            if let error = error {
                print("❌ Authorization error: \(error.localizedDescription)")
                call.reject(error.localizedDescription)
                return
            }
            print("✅ Authorization success: \(success)")
            call.resolve(["authorized": success])
        }
    }
    
    @objc func getSteps(_ call: CAPPluginCall) {
        print("📊 getSteps called")
        guard let startDateString = call.getString("startDate"),
              let endDateString = call.getString("endDate") else {
            call.reject("Missing date parameters")
            return
        }
        
        let formatter = ISO8601DateFormatter()
        guard let startDate = formatter.date(from: startDateString),
              let endDate = formatter.date(from: endDateString) else {
            call.reject("Invalid date format")
            return
        }
        
        print("📊 Fetching steps from \(startDateString) to \(endDateString)")
        manager.getSteps(from: startDate, to: endDate) { steps, error in
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
